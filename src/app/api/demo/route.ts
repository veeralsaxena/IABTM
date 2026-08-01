import { NextResponse } from "next/server";
import { METHODS, pickMethod } from "@/lib/data/catalog";
import { buildIdentityBlock } from "@/lib/curator/identity-block";
import { buildIdentityQuery } from "@/lib/curator/identity";
import { planDiscoveryQueries } from "@/lib/curator/query-planner";
import { discoverForType, toMediaItem } from "@/lib/curator/web-search";
import { rerankCandidates } from "@/lib/curator/rerank";
import { embedText } from "@/lib/ai/embeddings";
import { groqText, GROQ_MODEL } from "@/lib/ai/groq";
import { cosineSimilarity, cosineToUnit } from "@/lib/curator/identity-block";
import {
  heuristicRetrySignals,
  mergeMediaById,
  observeDiscoveryPass,
  runCuratorCritic,
} from "@/lib/curator/critic-agent";
import { readDemoCache, writeDemoCache } from "@/lib/demo/cache";
import type { PathRecord } from "@/types";

/**
 * Judge demo — runs the real pipeline without writing user state.
 * Successful runs are cached to data/demo-last-success.json so judges
 * always have a replay if live APIs flake.
 */

export async function GET() {
  const cache = await readDemoCache();
  if (!cache) {
    return NextResponse.json({ hasCache: false });
  }
  return NextResponse.json({
    hasCache: true,
    savedAt: cache.savedAt,
    source: cache.source,
    latencyMs: cache.latencyMs,
    inputs: (cache.payload as { steps?: { inputs?: unknown } })?.steps?.inputs,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const useCache = Boolean(body.useCache);
  const me = (body.me as string[])?.filter(Boolean).slice(0, 5) ?? [];
  const iam = (body.iam as string[])?.filter(Boolean).slice(0, 5) ?? [];
  const answers = (body.answers as Record<string, string>) ?? {};
  const learningStyles = (body.learningStyles as string[]) ?? ["Visual"];

  if (useCache) {
    return serveCache({ reason: "requested" });
  }

  if (me.length < 1 || iam.length < 1) {
    return NextResponse.json(
      { error: "Pick at least one Me and one I Am attribute." },
      { status: 400 },
    );
  }

  const started = Date.now();
  try {
    const payload = await runLiveDemo({
      me,
      iam,
      answers,
      learningStyles,
      started,
    });

    try {
      await writeDemoCache(payload, { latencyMs: payload.latencyMs as number });
    } catch (e) {
      console.error("demo cache write failed", e);
    }

    return NextResponse.json({
      ...payload,
      fromCache: false,
      cached: true,
    });
  } catch (e) {
    console.error("live demo failed — serving cache", e);
    const fallback = await serveCache({
      reason: "live_failed",
      liveError: e instanceof Error ? e.message : "Live demo failed",
    });
    if (fallback.status === 200) return fallback;
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Demo failed and no cached run is available.",
      },
      { status: 500 },
    );
  }
}

async function serveCache(opts: {
  reason: "requested" | "live_failed";
  liveError?: string;
}) {
  const cache = await readDemoCache();
  if (!cache) {
    return NextResponse.json(
      { error: "No cached demo run available yet." },
      { status: 404 },
    );
  }
  const payload = cache.payload as Record<string, unknown>;
  return NextResponse.json({
    ...payload,
    ok: true,
    fromCache: true,
    cacheSource: cache.source,
    cacheSavedAt: cache.savedAt,
    cacheReason: opts.reason,
    liveError: opts.liveError,
    latencyMs:
      typeof payload.latencyMs === "number"
        ? payload.latencyMs
        : cache.latencyMs ?? 0,
  });
}

async function runLiveDemo(input: {
  me: string[];
  iam: string[];
  answers: Record<string, string>;
  learningStyles: string[];
  started: number;
}) {
  const { me, iam, answers, learningStyles, started } = input;

  const methodScores = METHODS.map((method) => {
    const fromHits = me.filter((m) =>
      method.from.some((f) => f.toLowerCase() === m.toLowerCase()),
    );
    const toHits = iam.filter((a) =>
      method.to.some((t) => t.toLowerCase() === a.toLowerCase()),
    );
    const score = fromHits.length * 2 + toHits.length * 2;
    return {
      id: method.id,
      blurb: method.blurb,
      from: [...method.from],
      to: [...method.to],
      fromHits,
      toHits,
      score,
    };
  }).sort((a, b) => b.score - a.score);

  const method = pickMethod(me, iam);
  const rationale = await groqText(
    "You choose personal growth methods. Reply in 2 short sentences explaining why this method fits. No markdown. No brand names.",
    `Me: ${me.join(", ")}. I Am: ${iam.join(", ")}. Method: ${method.id}. Blurb: ${method.blurb}. Vibe: ${answers.vibe ?? "n/a"}.`,
  );

  const identityBlock = await buildIdentityBlock({
    path: {
      me_labels: me,
      iam_labels: iam,
      method: method.id,
      method_rationale: rationale,
    },
    vibe: answers.vibe,
    motivation: answers.motivation,
    answers,
  });

  let blockEmbedding: number[] = [];
  let queryEmbedding: number[] = [];
  let identityQuery = "";
  let stage: "early" | "middle" | "late" = "early";

  const pathLike = {
    id: "demo",
    user_id: "demo",
    me_labels: me,
    iam_labels: iam,
    method: method.id,
    method_rationale: rationale,
    day_number: 1,
    total_days: 111,
    progress: 0,
    status: "active",
  } satisfies PathRecord;

  try {
    blockEmbedding = await embedText(identityBlock.rawText);
  } catch (e) {
    console.error("demo block embed failed", e);
  }

  try {
    const iq = await buildIdentityQuery({
      path: pathLike,
      learningStyles,
      checkIn: null,
    });
    identityQuery = iq.query;
    queryEmbedding = iq.embedding;
    stage = iq.stage;
  } catch (e) {
    console.error("demo identity query failed", e);
    identityQuery = `${me.join(", ")} → ${iam.join(", ")} via ${method.id}. ${identityBlock.rawText}`;
    try {
      queryEmbedding = await embedText(identityQuery);
    } catch {
      // keep empty
    }
  }

  const plan = await planDiscoveryQueries({
    path: pathLike,
    stage,
    learningStyles,
    checkIn: null,
  });

  const filmQueries = plan.queriesByType.film ?? [
    `${method.id} ${me[0]} ${iam[0]}`,
  ];

  // Pass 1 discovery
  const found1 = await discoverForType({
    mediaType: "film",
    queries: filmQueries.slice(0, 2),
  });

  let candidates = found1.map((c) =>
    toMediaItem(c, {
      me,
      iam,
      method: method.id,
      stage,
      learningStyles,
    }),
  );
  const pass1Count = candidates.length;

  const observation = observeDiscoveryPass({
    candidates,
    queriesUsed: filmQueries,
    dislikedTitles: [],
    likedTitles: [],
  });
  const heuristicsTriggered = heuristicRetrySignals(observation);

  // Agentic critic: Observe → Reason → Decide → Act (max 1 retry)
  const critic = await runCuratorCritic({
    me,
    iam,
    method: method.id,
    stage,
    identityQuery: identityQuery || identityBlock.rawText,
    observation,
  });

  let agentDecision: "accept" | "retry" = "accept";
  let pass2Added = 0;
  let usedQueries = filmQueries.slice(0, 2);

  if (critic.needsRetry && critic.revisedFilmQueries.length) {
    agentDecision = "retry";
    usedQueries = critic.revisedFilmQueries.slice(0, 2);
    try {
      const found2 = await discoverForType({
        mediaType: "film",
        queries: usedQueries,
      });
      const pass2 = found2.map((c) =>
        toMediaItem(c, {
          me,
          iam,
          method: method.id,
          stage,
          learningStyles,
        }),
      );
      const before = new Set(candidates.map((c) => c.id));
      candidates = mergeMediaById(candidates, pass2);
      pass2Added = candidates.filter((c) => !before.has(c.id)).length;
    } catch (e) {
      console.error("demo critic retry failed", e);
      agentDecision = "accept";
      usedQueries = filmQueries.slice(0, 2);
    }
  }

  const vectorScores: Record<string, number> = {};
  const compareAgainst =
    queryEmbedding.length > 0
      ? queryEmbedding
      : blockEmbedding.length > 0
        ? blockEmbedding
        : null;

  const shortlist = candidates.slice(0, 8);
  for (const item of shortlist) {
    if (!compareAgainst) break;
    try {
      const emb = await embedText(
        `${item.title}. ${item.description}. ${item.creator ?? ""}`,
      );
      vectorScores[item.id] = cosineSimilarity(compareAgainst, emb);
      await new Promise((r) => setTimeout(r, 60));
    } catch {
      // lexical fallback in reranker
    }
  }

  const ranked = rerankCandidates({
    candidates,
    me,
    iam,
    method: method.id,
    stage,
    learningStyles,
    seenIds: new Set(),
    identityQuery: identityQuery || identityBlock.rawText,
    vectorScores,
  });

  const top = ranked.slice(0, 5);

  let whyNow = "";
  let primaryWhy = "";
  if (top[0]) {
    try {
      whyNow = await groqText(
        "Explain in 2 sentences why this media fits this growth path now. No markdown. No brand names.",
        JSON.stringify({
          me,
          iam,
          method: method.id,
          title: top[0].title,
          description: top[0].description,
          scores: top[0].scores,
        }),
      );
      primaryWhy = whyNow;
    } catch {
      whyNow = `Fits ${method.id} on the path from ${me[0]} toward ${iam[0]}.`;
      primaryWhy = whyNow;
    }
  }

  const previewDims = (v: number[], n = 16) =>
    v.slice(0, n).map((x) => Number(x.toFixed(4)));

  return {
    ok: true,
    model: GROQ_MODEL,
    latencyMs: Date.now() - started,
    steps: {
      inputs: { me, iam, answers, learningStyles },
      methodGraph: {
        selected: method.id,
        blurb: method.blurb,
        rationale,
        ranked: methodScores,
        edges: methodScores
          .filter((m) => m.score > 0)
          .flatMap((m) => [
            ...m.fromHits.map((f) => ({
              from: f,
              to: m.id,
              kind: "me→method" as const,
            })),
            ...m.toHits.map((t) => ({
              from: m.id,
              to: t,
              kind: "method→iam" as const,
            })),
          ]),
      },
      identityBlock,
      identityQuery: {
        text: identityQuery,
        note: "Live ranking compares video embeddings to THIS query embedding (Me + I Am + method + stage + learning styles) — same Gemini 768-d space. The stored identity-block embedding is the durable fingerprint; the query embedding is today’s ranking target.",
      },
      embedding: {
        dimensions: blockEmbedding.length || queryEmbedding.length || 0,
        model: "gemini-embedding-001",
        blockPreview: previewDims(blockEmbedding),
        queryPreview: previewDims(queryEmbedding),
        blockNorm: magnitude(blockEmbedding),
        queryNorm: magnitude(queryEmbedding),
      },
      discovery: {
        queries: usedQueries,
        plannedAll: plan.queriesByType,
        activities: plan.activities.slice(0, 4),
        candidatesFound: candidates.length,
        shortlistSize: shortlist.length,
        shortlistNote:
          "We do not embed every search hit (cost/latency). First N candidates (here up to 8 in demo, 12 in production) get Gemini embeddings for cosine vs the live identity-query vector. Everyone still goes through the hybrid reranker with lexical/rules.",
        candidates: candidates.slice(0, 10).map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          creator: c.creator,
          url: c.url,
          media_type: c.media_type,
          duration_minutes: c.duration_minutes,
          cosine:
            typeof vectorScores[c.id] === "number"
              ? Number(cosineToUnit(vectorScores[c.id]).toFixed(3))
              : null,
          shortlisted: shortlist.some((s) => s.id === c.id),
        })),
      },
      agentLoop: {
        kind: "critic_research",
        note: "This is the real agentic hop: Observe pass-1 titles → Reason (Groq Critic) → Decide accept|retry → Act (re-search once). Ranking stays math. Fail-open if critic errors.",
        observed: critic.observation,
        decision: agentDecision,
        reason: critic.reason,
        heuristicsTriggered,
        pass1Queries: filmQueries.slice(0, 2),
        revisedQueries: critic.revisedFilmQueries,
        pass1Candidates: pass1Count,
        pass2Added: agentDecision === "retry" ? pass2Added : 0,
        mergedCandidates: candidates.length,
      },
      ranking: {
        note: "Hybrid reranker: cosine(identity-query, video text) when available + lexical attribute/method fit + duration + anti-clickbait. LLM does not pick the winner.",
        top: top.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          creator: t.creator,
          url: t.url,
          media_type: t.media_type,
          scores: {
            identityFit: Number(t.scores.identityFit.toFixed(3)),
            stageFit: Number(t.scores.stageFit.toFixed(3)),
            potential: Number(t.scores.potential.toFixed(3)),
            novelty: Number(t.scores.novelty.toFixed(3)),
            antiAttention: Number(t.scores.antiAttention.toFixed(3)),
            final: Number(t.scores.final.toFixed(3)),
          },
          cosineRaw:
            typeof vectorScores[t.id] === "number"
              ? Number(vectorScores[t.id].toFixed(4))
              : null,
        })),
        whyNow,
        primaryWhy,
      },
      orchestration: {
        note: "Orchestrated pipeline + one bounded agentic loop (Critic). Method matcher & reranker stay deterministic — not agents.",
        agents: [
          {
            id: "orchestrator",
            name: "Orchestrator",
            brain: "pipeline",
            job: "Sequences roles, caches briefing — conductor, not an LLM",
            kind: "orchestrator",
          },
          {
            id: "method",
            name: "Method matcher",
            brain: "rules",
            job: "Attribute↔method overlap scoring — deterministic, NOT an LLM agent",
            kind: "rules",
          },
          {
            id: "identity",
            name: "Identity writer",
            brain: "Groq",
            job: "LLM writes who-now / becoming / how identity block",
            kind: "llm",
          },
          {
            id: "memory",
            name: "Memory loader",
            brain: "DB",
            job: "Loads reviews, blocks, activities into next run",
            kind: "tool",
          },
          {
            id: "planner",
            name: "Query planner",
            brain: "Groq",
            job: "LLM turns identity context into search queries",
            kind: "llm",
          },
          {
            id: "retriever",
            name: "Retriever",
            brain: "tools",
            job: "Live YouTube / web / Spotify discovery",
            kind: "tool",
          },
          {
            id: "critic",
            name: "Critic agent",
            brain: "Groq",
            job: "Observe pass-1 → decide accept|retry → re-search once (the agentic loop)",
            kind: "llm",
          },
          {
            id: "embedder",
            name: "Embedder",
            brain: "Gemini",
            job: "Embeds identity query + shortlist media (768-d)",
            kind: "tool",
          },
          {
            id: "reranker",
            name: "Hybrid reranker",
            brain: "math",
            job: "Scores & picks winners — deterministic, NOT an LLM",
            kind: "rules",
          },
          {
            id: "blocklist",
            name: "Hard blocklist",
            brain: "DB filter",
            job: "Drops blocked yt_/web_ ids before ranking — enforces dislike",
            kind: "rules",
          },
          {
            id: "explainer",
            name: "Explainer",
            brain: "Groq",
            job: "LLM writes why-now after ranking is fixed",
            kind: "llm",
          },
        ],
      },
      feedbackLoop: {
        note: "Two layers: (1) HARD blocklist by media id — guaranteed no re-show of that exact video. (2) Soft live-identity-query text — biases NEXT search/rank toward/away from similar content. Soft is NOT a guarantee for lookalikes.",
        affectsLiveIdentityQuery: true,
        channels: [
          {
            signal: "1★ / disliked / Don’t show again",
            store: "media_reviews blocklist + interactions",
            effect:
              "IMMEDIATE: UI removes that card. PERSISTED: yt_/web_ id hard-filtered on every future Home/Discover run. ALSO: title/reason appended on NEXT identity-query rebuild (soft bias against similar).",
          },
          {
            signal: "5★ / liked video",
            store: "media_reviews + interactions",
            effect:
              "Soft only: liked titles enter next identity query + rerank boost. No hard ‘must show’.",
          },
          {
            signal: "Completed activity",
            store: "check_ins (Completed activity: …)",
            effect:
              "Soft: next identity query prefers media that deepens those practices",
          },
          {
            signal: "Skipped activity",
            store: "check_ins (Skipped activity: …)",
            effect:
              "Soft: next identity query asks for gentler alternatives",
          },
          {
            signal: "Disliked artist",
            store: "artist_feedback",
            effect:
              "HARD for Artists page (hidden). Soft in identity query (‘Avoid these mentors…’). Does not block unrelated YouTube ids.",
          },
          {
            signal: "Changed Me / I Am attributes",
            store: "paths + identity_embedding rebuild",
            effect:
              "Full re-curate: new method, new identity block, invalidate briefing",
          },
        ],
        simulatedAfterDislike: top[0]
          ? {
              dislikedTitle: top[0].title,
              nextIdentityQuerySnippet: [
                identityQuery,
                `User rated low / disliked — DO NOT recommend similar: ${top[0].title}.`,
                `Why they disliked: Rated 1/5 — didn’t land.`,
              ].join(" "),
              avoidId: top[0].id,
            }
          : null,
      },
    },
  };
}

function magnitude(v: number[]) {
  if (!v.length) return 0;
  let s = 0;
  for (const x of v) s += x * x;
  return Number(Math.sqrt(s).toFixed(4));
}
