import { createClient } from "@/lib/supabase/server";
import { buildIdentityQuery } from "@/lib/curator/identity";
import { diversify, scoreCandidates } from "@/lib/curator/score";
import { groqJson, GROQ_MODEL } from "@/lib/ai/groq";
import type {
  DailyBriefingResult,
  MediaItem,
  PathRecord,
  ScoredMedia,
} from "@/types";

async function fetchSeenIds(userId: string, pathId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interactions")
    .select("media_id, action")
    .eq("user_id", userId)
    .eq("path_id", pathId)
    .in("action", ["viewed", "completed", "not_for_me", "saved"]);

  return new Set((data ?? []).map((d) => d.media_id).filter(Boolean) as string[]);
}

async function retrieveMedia(
  embedding: number[],
  method: string,
  stage: string,
): Promise<MediaItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_media", {
    query_embedding: embedding,
    match_count: 28,
    filter_methods: [method, "any"],
    filter_stage: stage,
  });

  if (error) {
    // Fallback: plain select if RPC shape differs
    const fallback = await supabase.from("media").select("*").limit(28);
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as MediaItem[];
  }

  return (data ?? []) as MediaItem[];
}

async function pickActivity(path: PathRecord) {
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select("*").limit(40);
  if (!data?.length) return null;

  const scored = data
    .map((a) => {
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
      return { a, score: methodHit + fromHit + toHit };
    })
    .sort((x, y) => y.score - x.score);

  const top = scored[0]?.a;
  if (!top) return null;
  return {
    id: top.id as string,
    title: top.title as string,
    description: (top.description as string) ?? null,
    category: (top.category as string) ?? null,
  };
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
  const identity = await buildIdentityQuery({
    path: input.path,
    checkIn: input.checkIn,
    learningStyles: input.learningStyles,
  });

  const [candidates, seenIds, activity] = await Promise.all([
    retrieveMedia(identity.embedding, input.path.method, identity.stage),
    fetchSeenIds(input.userId, input.path.id),
    pickActivity(input.path),
  ]);

  const ranked = scoreCandidates({
    candidates,
    me: input.path.me_labels,
    iam: input.path.iam_labels,
    method: input.path.method,
    stage: identity.stage,
    learningStyles: input.learningStyles ?? [],
    seenIds,
  });

  const diverse = diversify(ranked, 6);
  const primary = diverse[0];
  if (!primary) {
    throw new Error("No media candidates available. Seed the catalog first.");
  }
  const secondary = diverse.slice(1, 4);

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
    activity,
    reason: explanation.reason,
    whyNow: explanation.whyNow,
    trace: {
      identityQuery: identity.query,
      stage: identity.stage,
      retrieved: candidates.length,
      ranked: diverse.map((d) => ({
        id: d.id,
        title: d.title,
        final: Number(d.scores.final.toFixed(3)),
      })),
      method: input.path.method,
      model: `${GROQ_MODEL} + gemini-embedding-001`,
      latencyMs: Date.now() - started,
    },
  };
}
