import { createClient } from "@/lib/supabase/server";
import { buildIdentityQuery } from "@/lib/curator/identity";
import { cosineSimilarity } from "@/lib/curator/identity-block";
import { planDiscoveryQueries } from "@/lib/curator/query-planner";
import { diversifyTypes, rerankCandidates } from "@/lib/curator/rerank";
import { discoverForType, toMediaItem } from "@/lib/curator/web-search";
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

/** Agentic memory: activities + resonance reshape the next identity query. */
async function fetchBehaviorSignals(userId: string, pathId: string) {
  const supabase = await createClient();
  const [{ data: checkIns }, { data: interactions }] = await Promise.all([
    supabase
      .from("check_ins")
      .select("body")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("interactions")
      .select("action")
      .eq("user_id", userId)
      .eq("path_id", pathId)
      .in("action", ["resonated", "not_for_me"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const completedActivities = (checkIns ?? [])
    .map((c) => c.body as string)
    .filter((b) => b?.startsWith("Completed activity:"))
    .map((b) => b.replace("Completed activity:", "").trim())
    .filter(Boolean)
    .slice(0, 8);

  const resonatedCount =
    interactions?.filter((i) => i.action === "resonated").length ?? 0;
  const rejectedCount =
    interactions?.filter((i) => i.action === "not_for_me").length ?? 0;

  return {
    completedActivities,
    resonatedTopics:
      resonatedCount > 0
        ? [`${resonatedCount} recent resonated picks — deepen practical follow-ups`]
        : [],
    rejectedTopics:
      rejectedCount > 0
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
}): Promise<DailyBriefingResult> {
  const started = Date.now();
  const learningStyles = input.learningStyles ?? [];

  const behavior = await fetchBehaviorSignals(input.userId, input.path.id);

  const identity = await buildIdentityQuery({
    path: input.path,
    checkIn: input.checkIn,
    learningStyles,
    completedActivities: behavior.completedActivities,
    resonatedTopics: behavior.resonatedTopics,
    rejectedTopics: behavior.rejectedTopics,
  });

  const [plan, seenIds] = await Promise.all([
    planDiscoveryQueries({
      path: input.path,
      stage: identity.stage,
      learningStyles,
      checkIn: input.checkIn,
    }),
    fetchSeenIds(input.userId, input.path.id),
  ]);

  const discovered = await discoverAcrossTypes({
    path: input.path,
    stage: identity.stage,
    learningStyles,
    queriesByType: plan.queriesByType,
  });

  if (!discovered.length) {
    throw new Error(
      "Web discovery returned no results. Check network access and try Recurate.",
    );
  }

  const vectorScores = await vectorScoreCandidates(
    identity.embedding,
    discovered,
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
        Object.entries(plan.queriesByType).map(([k, v]) => [k, v ?? []]),
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
      model: `${GROQ_MODEL} + gemini-embedding + youtube/spotify discovery + hybrid reranker`,
      latencyMs: Date.now() - started,
      discoverySource: Object.keys(vectorScores).length
        ? "youtube+spotify+vector"
        : "youtube+spotify+lexical",
    },
  };
}

async function vectorScoreCandidates(
  identityEmbedding: number[] | null,
  candidates: MediaItem[],
): Promise<Record<string, number>> {
  if (!identityEmbedding?.length || !candidates.length) return {};
  const scores: Record<string, number> = {};
  // Embed a shortlist only — keep latency/quota bounded
  const shortlist = candidates.slice(0, 12);
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
    });
    queries = plan.queriesByType[input.mediaType] ?? queries;
  } catch {
    // Groq down — keep heuristic queries
  }

  const found = await discoverForType({
    mediaType: input.mediaType,
    queries,
  });

  const candidates = found.map((c) =>
    toMediaItem(c, {
      me: input.path.me_labels,
      iam: input.path.iam_labels,
      method: input.path.method,
      stage,
      learningStyles: input.learningStyles ?? [],
    }),
  );

  const seenIds = await fetchSeenIds(input.userId, input.path.id);
  const vectorScores = await vectorScoreCandidates(
    identityEmbedding,
    candidates,
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
  });
}
