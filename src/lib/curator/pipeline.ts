import { createClient } from "@/lib/supabase/server";
import { buildIdentityQuery } from "@/lib/curator/identity";
import { cosineSimilarity } from "@/lib/curator/identity-block";
import { planDiscoveryQueries } from "@/lib/curator/query-planner";
import { diversifyTypes, rerankCandidates } from "@/lib/curator/rerank";
import { discoverForType, toMediaItem } from "@/lib/curator/web-search";
import {
  collectBlockKeys,
  filterBlockedMedia,
  pickEmbedShortlist,
} from "@/lib/curator/blocks";
import {
  heuristicRetrySignals,
  mergeMediaById,
  observeDiscoveryPass,
  runCuratorCritic,
} from "@/lib/curator/critic-agent";
import { embedText } from "@/lib/ai/embeddings";
import { groqJson, GROQ_MODEL } from "@/lib/ai/groq";
import type {
  DailyBriefingResult,
  MediaItem,
  MediaType,
  PathRecord,
  ScoredMedia,
} from "@/types";

const DISCOVER_TYPES: MediaType[] = [
  "film",
  "podcast",
  "people",
  "editorial",
  "music",
  "animation",
];

async function fetchSeenIds(userId: string, pathId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interactions")
    .select("media_id, action")
    .eq("user_id", userId)
    .eq("path_id", pathId)
    .in("action", ["viewed", "completed", "not_for_me", "saved"]);

  return new Set(
    (data ?? []).map((d) => d.media_id).filter(Boolean) as string[],
  );
}

/**
 * Agentic memory / human-in-the-loop:
 * reviews + interactions + activities + artist feedback reshape the next run.
 * Hard blocklist = disliked media_refs (not just soft negatives in the query).
 */
async function fetchBehaviorSignals(userId: string, pathId: string) {
  const supabase = await createClient();
  const [
    { data: checkIns },
    { data: interactions },
    { data: reviews },
    { data: artistFb },
  ] = await Promise.all([
    supabase
      .from("check_ins")
      .select("body, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("interactions")
      .select("action, created_at")
      .eq("user_id", userId)
      .eq("path_id", pathId)
      .in("action", ["resonated", "not_for_me", "viewed", "completed"])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("media_reviews")
      .select(
        "media_ref, media_title, media_type, media_url, rating, sentiment, review, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("artist_feedback")
      .select("artist_id, artist_name, rating, sentiment, note, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  const completedActivities = (checkIns ?? [])
    .map((c) => c.body as string)
    .filter((b) => b?.startsWith("Completed activity:"))
    .map((b) => b.replace("Completed activity:", "").trim())
    .filter(Boolean)
    .slice(0, 8);

  const skippedActivities = (checkIns ?? [])
    .map((c) => c.body as string)
    .filter((b) => b?.startsWith("Skipped activity:"))
    .map((b) => b.replace("Skipped activity:", "").trim())
    .filter(Boolean)
    .slice(0, 8);

  const liked = (reviews ?? []).filter(
    (r) => r.sentiment === "liked" || (r.rating ?? 0) >= 4,
  );
  const disliked = (reviews ?? []).filter(
    (r) =>
      r.sentiment === "disliked" ||
      (r.rating ?? 0) <= 2 ||
      String(r.review ?? "").toLowerCase().includes("don’t show again") ||
      String(r.review ?? "").toLowerCase().includes("don't show again") ||
      String(r.review ?? "").toLowerCase().includes("blocked"),
  );

  const likedTitles = liked
    .map((r) => (r.media_title as string) || (r.media_ref as string))
    .filter(Boolean)
    .slice(0, 8);
  const dislikedTitles = disliked
    .map((r) => (r.media_title as string) || (r.media_ref as string))
    .filter(Boolean)
    .slice(0, 8);
  const dislikedReasons = disliked
    .map((r) => (r.review as string)?.trim())
    .filter(Boolean)
    .slice(0, 5) as string[];

  const blockKeys = collectBlockKeys(
    disliked.map((r) => r.media_ref as string).filter(Boolean),
    disliked.map((r) => r.media_url as string | null),
  );

  const avoidedArtists = (artistFb ?? [])
    .filter((a) => a.sentiment === "disliked" || (a.rating ?? 0) <= 2)
    .map((a) => (a.artist_name as string) || (a.artist_id as string))
    .filter(Boolean)
    .slice(0, 6);

  const preferredArtists = (artistFb ?? [])
    .filter((a) => a.sentiment === "liked" || (a.rating ?? 0) >= 4)
    .map((a) => (a.artist_name as string) || (a.artist_id as string))
    .filter(Boolean)
    .slice(0, 6);

  const resonatedCount =
    interactions?.filter((i) => i.action === "resonated").length ?? 0;
  const rejectedCount =
    interactions?.filter((i) => i.action === "not_for_me").length ?? 0;

  const lastTs = [
    ...(checkIns ?? []).map((c) => c.created_at as string),
    ...(interactions ?? []).map((i) => i.created_at as string),
    ...(reviews ?? []).map((r) => r.updated_at as string),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    completedActivities,
    skippedActivities,
    likedTitles,
    dislikedTitles,
    dislikedReasons,
    avoidIds: blockKeys,
    avoidedArtists,
    preferredArtists,
    lastActivityAt: lastTs ?? null,
    resonatedTopics:
      likedTitles.length > 0
        ? likedTitles.slice(0, 4)
        : resonatedCount > 0
          ? [`${resonatedCount} recent resonated picks — deepen practical follow-ups`]
          : [],
    rejectedTopics:
      dislikedTitles.length > 0
        ? dislikedTitles.slice(0, 4)
        : rejectedCount > 0
          ? [`${rejectedCount} rejected picks — avoid hype and mismatched tone`]
          : [],
  };
}

async function discoverAcrossTypes(input: {
  path: PathRecord;
  stage: "early" | "middle" | "late" | "any";
  learningStyles: string[];
  queriesByType: Partial<Record<MediaType, string[]>>;
}): Promise<MediaItem[]> {
  const batches = await Promise.all(
    DISCOVER_TYPES.map(async (mediaType) => {
      const queries = input.queriesByType[mediaType] ?? [
        `${input.path.method} ${input.path.me_labels[0]} ${input.path.iam_labels[0]}`,
      ];
      const found = await discoverForType({ mediaType, queries });
      return found.map((c) =>
        toMediaItem(c, {
          me: input.path.me_labels,
          iam: input.path.iam_labels,
          method: input.path.method,
          stage: input.stage,
          learningStyles: input.learningStyles,
        }),
      );
    }),
  );
  return batches.flat();
}

async function pickActivities(
  path: PathRecord,
  planned: Array<{
    title: string;
    description: string;
    category: string;
  }>,
) {
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select("*").limit(40);

  const fromDb =
    data
      ?.map((a) => {
        const methodHit = (a.methods ?? []).some(
          (m: string) =>
            m.toLowerCase() === path.method.toLowerCase() ||
            m.toLowerCase() === "any",
        )
          ? 2
          : 0;
        const fromHit = path.me_labels.filter((l) =>
          (a.from_attrs ?? []).includes(l),
        ).length;
        const toHit = path.iam_labels.filter((l) =>
          (a.to_attrs ?? []).includes(l),
        ).length;
        return {
          id: a.id as string,
          title: a.title as string,
          description: (a.description as string) ?? null,
          category: (a.category as string) ?? null,
          score: methodHit + fromHit + toHit,
        };
      })
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map(({ id, title, description, category }) => ({
        id,
        title,
        description,
        category,
      })) ?? [];

  const generated = planned.slice(0, 6).map((a, i) => ({
    id: `act_${i}_${a.title.toLowerCase().replace(/\s+/g, "_").slice(0, 24)}`,
    title: a.title,
    description: a.description,
    category: a.category,
  }));

  const merged = [...fromDb];
  for (const g of generated) {
    if (merged.length >= 5) break;
    if (!merged.some((m) => m.title === g.title)) merged.push(g);
  }
  return merged.slice(0, 5);
}

async function explainBriefing(input: {
  path: PathRecord;
  primary: ScoredMedia;
  secondary: ScoredMedia[];
  checkIn?: string | null;
}) {
  return groqJson<{ reason: string; whyNow: string; primaryWhy: string }>(
    `You are the Explainer agent inside a growth curator.
Optimize for human potential, not attention. Be concrete, warm, and brief.
Return JSON: { "reason": string, "whyNow": string, "primaryWhy": string }.
No hype. No guilt. No brand names. Speak to identity becoming.`,
    JSON.stringify({
      me: input.path.me_labels,
      iam: input.path.iam_labels,
      method: input.path.method,
      day: input.path.day_number,
      checkIn: input.checkIn ?? null,
      primary: {
        title: input.primary.title,
        type: input.primary.media_type,
        scores: input.primary.scores,
        description: input.primary.description,
        url: input.primary.url,
      },
      alternatives: input.secondary.map((s) => s.title),
    }),
  );
}

export async function runCuratorPipeline(input: {
  userId: string;
  path: PathRecord;
  learningStyles?: string[];
  checkIn?: string | null;
  /** Calendar days since last human activity (0 = active) */
  daysAway?: number;
}): Promise<DailyBriefingResult> {
  const started = Date.now();
  const learningStyles = input.learningStyles ?? [];
  const daysAway = input.daysAway ?? 0;

  const behavior = await fetchBehaviorSignals(input.userId, input.path.id);

  // Prefer computed gap from last activity if caller didn't pass one
  let effectiveDaysAway = daysAway;
  if (!daysAway && behavior.lastActivityAt) {
    const ms = Date.now() - new Date(behavior.lastActivityAt).getTime();
    effectiveDaysAway = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  }

  const identity = await buildIdentityQuery({
    path: input.path,
    checkIn: input.checkIn,
    learningStyles,
    completedActivities: behavior.completedActivities,
    resonatedTopics: behavior.resonatedTopics,
    rejectedTopics: behavior.rejectedTopics,
    likedTitles: behavior.likedTitles,
    dislikedTitles: behavior.dislikedTitles,
    dislikedReasons: behavior.dislikedReasons,
    daysAway: effectiveDaysAway,
    avoidedArtists: behavior.avoidedArtists,
    preferredArtists: behavior.preferredArtists,
    skippedActivities: behavior.skippedActivities,
  });

  const [plan, seenIds] = await Promise.all([
    planDiscoveryQueries({
      path: input.path,
      stage: identity.stage,
      learningStyles,
      checkIn: input.checkIn,
      avoidHints: [
        ...behavior.dislikedTitles.slice(0, 4),
        ...behavior.dislikedReasons.slice(0, 3),
        ...behavior.avoidedArtists.slice(0, 3),
        ...behavior.skippedActivities.slice(0, 2),
      ],
      preferHints: [
        ...behavior.likedTitles.slice(0, 4),
        ...behavior.preferredArtists.slice(0, 3),
        ...behavior.completedActivities.slice(0, 2),
      ],
    }),
    fetchSeenIds(input.userId, input.path.id),
  ]);

  // Blocked ids also count as "seen" for novelty
  for (const id of behavior.avoidIds) seenIds.add(id);

  const discoveredRaw = await discoverAcrossTypes({
    path: input.path,
    stage: identity.stage,
    learningStyles,
    queriesByType: plan.queriesByType,
  });

  // HARD FILTER — blocked media never enter ranking (query text alone is not enough)
  let discovered = filterBlockedMedia(discoveredRaw, behavior.avoidIds);
  const pass1Count = discovered.length;

  const queriesUsed = Object.values(plan.queriesByType)
    .flat()
    .filter(Boolean) as string[];

  const observation = observeDiscoveryPass({
    candidates: discovered,
    queriesUsed,
    dislikedTitles: behavior.dislikedTitles,
    likedTitles: behavior.likedTitles,
  });
  const heuristicsTriggered = heuristicRetrySignals(observation);

  // --- Agentic loop (bounded): Observe → Reason → Decide → Act (max 1 retry) ---
  const critic = await runCuratorCritic({
    me: input.path.me_labels,
    iam: input.path.iam_labels,
    method: input.path.method,
    stage: identity.stage,
    identityQuery: identity.query,
    observation,
  });

  let pass2Added = 0;
  let agentDecision: "accept" | "retry" = "accept";
  let finalQueriesByType = plan.queriesByType;

  if (critic.needsRetry) {
    agentDecision = "retry";
    const retryQueries = {
      ...plan.queriesByType,
      ...(critic.revisedQueriesByType ?? {}),
      film:
        critic.revisedQueriesByType?.film?.length
          ? critic.revisedQueriesByType.film
          : critic.revisedFilmQueries.length
            ? critic.revisedFilmQueries
            : plan.queriesByType.film,
    };
    finalQueriesByType = retryQueries;

    try {
      const pass2Raw = await discoverAcrossTypes({
        path: input.path,
        stage: identity.stage,
        learningStyles,
        queriesByType: retryQueries,
      });
      const pass2 = filterBlockedMedia(pass2Raw, behavior.avoidIds);
      const before = new Set(discovered.map((d) => d.id));
      discovered = mergeMediaById(discovered, pass2);
      pass2Added = discovered.filter((d) => !before.has(d.id)).length;
    } catch (e) {
      console.error("critic retry discovery failed — keeping pass 1", e);
      agentDecision = "accept";
    }
  }

  if (!discovered.length) {
    throw new Error(
      "Web discovery returned no results. Check network access and try Recurate.",
    );
  }

  const vectorScores = await vectorScoreCandidates(
    identity.embedding,
    discovered,
    {
      me: input.path.me_labels,
      iam: input.path.iam_labels,
      method: input.path.method,
    },
  );

  const ranked = rerankCandidates({
    candidates: discovered,
    me: input.path.me_labels,
    iam: input.path.iam_labels,
    method: input.path.method,
    stage: identity.stage,
    learningStyles,
    seenIds,
    identityQuery: identity.query,
    vectorScores,
    avoidIds: behavior.avoidIds,
    dislikedTitles: behavior.dislikedTitles,
    likedTitles: behavior.likedTitles,
    daysAway: effectiveDaysAway,
  });

  const diverse = diversifyTypes(ranked, 8);
  const primary = diverse[0];
  if (!primary) {
    throw new Error("No media candidates after reranking.");
  }
  const secondary = diverse.slice(1, 5);
  const activities = await pickActivities(input.path, plan.activities);

  const explanation = await explainBriefing({
    path: input.path,
    primary,
    secondary,
    checkIn: input.checkIn,
  });

  primary.why = explanation.primaryWhy;

  return {
    primary,
    secondary,
    activity: activities[0] ?? null,
    activities,
    reason: explanation.reason,
    whyNow: explanation.whyNow,
    discovery: {
      source: "web",
      queries: Object.fromEntries(
        Object.entries(finalQueriesByType).map(([k, v]) => [k, v ?? []]),
      ),
      candidatesFound: discovered.length,
    },
    trace: {
      identityQuery: identity.query,
      stage: identity.stage,
      retrieved: discovered.length,
      ranked: diverse.map((d) => ({
        id: d.id,
        title: d.title,
        final: Number(d.scores.final.toFixed(3)),
      })),
      method: input.path.method,
      model: `${GROQ_MODEL} + gemini-embedding + critic-agent + youtube/spotify + hybrid reranker + HITL`,
      latencyMs: Date.now() - started,
      discoverySource: Object.keys(vectorScores).length
        ? "youtube+spotify+vector+reviews"
        : "youtube+spotify+lexical+reviews",
      daysAway: effectiveDaysAway,
      avoidedFromReviews: behavior.avoidIds.size,
      likedFromReviews: behavior.likedTitles.length,
      agentLoop: {
        kind: "critic_research",
        observed: critic.observation,
        decision: agentDecision,
        reason: critic.reason,
        heuristicsTriggered,
        revisedQueries: critic.revisedFilmQueries,
        pass1Candidates: pass1Count,
        pass2Added: agentDecision === "retry" ? pass2Added : undefined,
        mergedCandidates: discovered.length,
      },
    },
  };
}

async function vectorScoreCandidates(
  identityEmbedding: number[] | null,
  candidates: MediaItem[],
  ctx?: { me: string[]; iam: string[]; method: string },
): Promise<Record<string, number>> {
  if (!identityEmbedding?.length || !candidates.length) return {};
  const scores: Record<string, number> = {};
  // Lexical pre-rank then embed top N — better than arbitrary first-12
  const shortlist = ctx
    ? pickEmbedShortlist(candidates, ctx.me, ctx.iam, ctx.method, 12)
    : candidates.slice(0, 12);
  for (const item of shortlist) {
    try {
      const emb = await embedText(
        `${item.title}. ${item.description}. ${item.creator ?? ""}`,
      );
      scores[item.id] = cosineSimilarity(identityEmbedding, emb);
      await new Promise((r) => setTimeout(r, 80));
    } catch {
      // skip this item; lexical fallback still applies
    }
  }
  return scores;
}

export async function discoverCategory(input: {
  userId: string;
  path: PathRecord;
  mediaType: MediaType;
  learningStyles?: string[];
}) {
  const behavior = await fetchBehaviorSignals(input.userId, input.path.id);

  let stage: "early" | "middle" | "late" | "any" = "early";
  let identityQuery = `${input.path.me_labels.join(" ")} ${input.path.iam_labels.join(" ")} ${input.path.method}`;
  let identityEmbedding: number[] | null = null;
  let queries = [
    `${input.path.method} ${input.path.me_labels[0] ?? ""} ${input.path.iam_labels[0] ?? ""}`,
    `${input.mediaType} ${input.path.method} personal growth`,
  ];

  try {
    const identity = await buildIdentityQuery({
      path: input.path,
      learningStyles: input.learningStyles,
      completedActivities: behavior.completedActivities,
      likedTitles: behavior.likedTitles,
      dislikedTitles: behavior.dislikedTitles,
      dislikedReasons: behavior.dislikedReasons,
      avoidedArtists: behavior.avoidedArtists,
      preferredArtists: behavior.preferredArtists,
      skippedActivities: behavior.skippedActivities,
      resonatedTopics: behavior.resonatedTopics,
      rejectedTopics: behavior.rejectedTopics,
    });
    stage = identity.stage;
    identityQuery = identity.query;
    identityEmbedding = identity.embedding;
  } catch {
    // Gemini down — continue with lexical path context
  }

  try {
    const plan = await planDiscoveryQueries({
      path: input.path,
      stage,
      learningStyles: input.learningStyles,
      avoidHints: [
        ...behavior.dislikedTitles.slice(0, 4),
        ...behavior.dislikedReasons.slice(0, 3),
        ...behavior.avoidedArtists.slice(0, 3),
      ],
      preferHints: [
        ...behavior.likedTitles.slice(0, 4),
        ...behavior.preferredArtists.slice(0, 3),
      ],
    });
    queries = plan.queriesByType[input.mediaType] ?? queries;
  } catch {
    // Groq down — keep heuristic queries
  }

  const found = await discoverForType({
    mediaType: input.mediaType,
    queries,
  });

  const candidatesRaw = found.map((c) =>
    toMediaItem(c, {
      me: input.path.me_labels,
      iam: input.path.iam_labels,
      method: input.path.method,
      stage,
      learningStyles: input.learningStyles ?? [],
    }),
  );

  const candidates = filterBlockedMedia(candidatesRaw, behavior.avoidIds);

  const seenIds = await fetchSeenIds(input.userId, input.path.id);
  for (const id of behavior.avoidIds) seenIds.add(id);

  const vectorScores = await vectorScoreCandidates(
    identityEmbedding,
    candidates,
    {
      me: input.path.me_labels,
      iam: input.path.iam_labels,
      method: input.path.method,
    },
  );

  return rerankCandidates({
    candidates,
    me: input.path.me_labels,
    iam: input.path.iam_labels,
    method: input.path.method,
    stage,
    learningStyles: input.learningStyles ?? [],
    seenIds,
    identityQuery,
    vectorScores,
    avoidIds: behavior.avoidIds,
    dislikedTitles: behavior.dislikedTitles,
    likedTitles: behavior.likedTitles,
  });
}
