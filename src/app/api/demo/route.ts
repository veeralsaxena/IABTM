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
import type { PathRecord } from "@/types";

/**
 * Judge demo — runs the real pipeline steps without writing user state.
 * Returns every intermediate artifact for the walkthrough UI.
 */
export async function POST(request: Request) {
  const started = Date.now();
  const body = await request.json().catch(() => ({}));
  const me = (body.me as string[])?.filter(Boolean).slice(0, 5) ?? [];
  const iam = (body.iam as string[])?.filter(Boolean).slice(0, 5) ?? [];
  const answers = (body.answers as Record<string, string>) ?? {};
  const learningStyles = (body.learningStyles as string[]) ?? ["Visual"];

  if (me.length < 1 || iam.length < 1) {
    return NextResponse.json(
      { error: "Pick at least one Me and one I Am attribute." },
      { status: 400 },
    );
  }

  // --- Step: method graph scoring (deterministic) ---
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

  // --- Step: identity block (Groq) ---
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

  // --- Step: embed identity block + live identity query ---
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

  // --- Step: query planner ---
  const plan = await planDiscoveryQueries({
    path: pathLike,
    stage,
    learningStyles,
    checkIn: null,
  });

  const filmQueries = plan.queriesByType.film ?? [
    `${method.id} ${me[0]} ${iam[0]}`,
  ];

  // --- Step: live discovery (film only for demo latency) ---
  const found = await discoverForType({
    mediaType: "film",
    queries: filmQueries.slice(0, 2),
  });

  const candidates = found.map((c) =>
    toMediaItem(c, {
      me,
      iam,
      method: method.id,
      stage,
      learningStyles,
    }),
  );

  // --- Step: vector score shortlist vs IDENTITY QUERY embedding ---
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

  // Explainer for #1
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

  return NextResponse.json({
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
        queries: filmQueries,
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
        note: "Multi-agent orchestration: specialized agents with typed handoffs under one orchestrator. Not one mega-prompt.",
        agents: [
          {
            id: "orchestrator",
            name: "Orchestrator",
            brain: "pipeline",
            job: "Sequences agents, passes outputs, caches briefing",
          },
          {
            id: "method",
            name: "Method Agent",
            brain: "rules",
            job: "Scores Me→Method→I Am graph edges; picks method",
          },
          {
            id: "identity",
            name: "Identity Agent",
            brain: "Groq",
            job: "Writes who-now / becoming / how identity block",
          },
          {
            id: "memory",
            name: "Memory Agent",
            brain: "DB",
            job: "Loads reviews, activities, artist feedback into next query",
          },
          {
            id: "planner",
            name: "Query Planner",
            brain: "Groq",
            job: "Turns identity context into web/YouTube search queries",
          },
          {
            id: "retriever",
            name: "Retriever",
            brain: "tools",
            job: "Live YouTube + DuckDuckGo + Spotify discovery",
          },
          {
            id: "embedder",
            name: "Embedding Agent",
            brain: "Gemini",
            job: "Embeds identity query + shortlist media into 768-d space",
          },
          {
            id: "reranker",
            name: "Reranker",
            brain: "math",
            job: "Hybrid scores; chooses winners (not the LLM)",
          },
          {
            id: "explainer",
            name: "Explainer",
            brain: "Groq",
            job: "Writes why-now after ranking is fixed",
          },
        ],
      },
      feedbackLoop: {
        note: "Human-in-the-loop: ratings/activities rewrite the NEXT live identity query and hard-avoid disliked media.",
        affectsLiveIdentityQuery: true,
        channels: [
          {
            signal: "1★ / disliked video",
            store: "media_reviews + interactions + check_ins",
            effect:
              "Title + reason enter dislikedTitles/dislikedReasons in the next identity query; media_ref is hard-avoided in rerank; similar titles are penalized",
          },
          {
            signal: "5★ / liked video",
            store: "media_reviews + interactions",
            effect:
              "Title enters likedTitles → identity query biases toward similar depth/tone; soft boost in rerank",
          },
          {
            signal: "Completed activity",
            store: "check_ins (Completed activity: …)",
            effect:
              "Appears in identity query as practiced activities — prefer media that deepens those practices",
          },
          {
            signal: "Skipped activity",
            store: "none today",
            effect:
              "Honest gap: we do not yet penalize incomplete activities — only completions feed the loop",
          },
          {
            signal: "Disliked artist",
            store: "artist_feedback + check_ins",
            effect:
              "Artist hidden on Artists page next load; note can appear in latest check-in text for the query",
          },
          {
            signal: "Changed Me / I Am attributes",
            store: "paths + identity_embedding rebuild",
            effect:
              "New method, new identity block, invalidate today’s briefing — full re-curate",
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
  });
}

function magnitude(v: number[]) {
  if (!v.length) return 0;
  let s = 0;
  for (const x of v) s += x * x;
  return Number(Math.sqrt(s).toFixed(4));
}
