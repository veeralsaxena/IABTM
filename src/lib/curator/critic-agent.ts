import { groqJson } from "@/lib/ai/groq";
import type { MediaItem, MediaType } from "@/types";

/**
 * Curator Critic Agent — the thin agentic loop.
 *
 * Observe first discovery → Reason (Groq) → Decide accept|retry →
 * Act (revised search queries) at most ONCE.
 *
 * Does NOT pick the final video (reranker still does).
 * Does NOT bypass the hard blocklist.
 * Fail-open: if Groq errors, accept the first pass.
 */

export type CriticObservation = {
  candidateCount: number;
  sampleTitles: string[];
  dislikedOverlap: string[];
  likedOverlap: string[];
  queriesUsed: string[];
};

export type CriticDecision = {
  needsRetry: boolean;
  reason: string;
  observation: string;
  revisedFilmQueries: string[];
  revisedQueriesByType?: Partial<Record<MediaType, string[]>>;
};

export type CriticLoopTrace = {
  kind: "critic_research";
  observed: string;
  decision: "accept" | "retry";
  reason: string;
  heuristicsTriggered: string[];
  revisedQueries: string[];
  pass1Candidates: number;
  pass2Added?: number;
  mergedCandidates?: number;
  model: string;
};

function titleOverlap(titles: string[], probes: string[]) {
  if (!probes.length || !titles.length) return [] as string[];
  const hits: string[] = [];
  for (const t of titles) {
    const low = t.toLowerCase();
    for (const p of probes) {
      const parts = p
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      if (parts.length && parts.filter((w) => low.includes(w)).length >= 2) {
        hits.push(t);
        break;
      }
    }
  }
  return hits.slice(0, 4);
}

export function observeDiscoveryPass(input: {
  candidates: MediaItem[];
  queriesUsed: string[];
  dislikedTitles?: string[];
  likedTitles?: string[];
}): CriticObservation {
  const sampleTitles = input.candidates.slice(0, 8).map((c) => c.title);
  return {
    candidateCount: input.candidates.length,
    sampleTitles,
    dislikedOverlap: titleOverlap(sampleTitles, input.dislikedTitles ?? []),
    likedOverlap: titleOverlap(sampleTitles, input.likedTitles ?? []),
    queriesUsed: input.queriesUsed.slice(0, 8),
  };
}

/** Cheap guards — if these fire we strongly prefer a retry. */
export function heuristicRetrySignals(obs: CriticObservation): string[] {
  const signals: string[] = [];
  if (obs.candidateCount < 4) signals.push("too_few_candidates");
  if (obs.dislikedOverlap.length >= 2) signals.push("dislike_lookalikes");
  if (
    obs.sampleTitles.some((t) =>
      /\b(millionaire|hustle|grindset|get rich|overnight)\b/i.test(t),
    )
  ) {
    signals.push("hype_clickbait_pattern");
  }
  return signals;
}

export async function runCuratorCritic(input: {
  me: string[];
  iam: string[];
  method: string;
  stage: string;
  identityQuery: string;
  observation: CriticObservation;
  forceHeuristicRetry?: boolean;
}): Promise<CriticDecision> {
  const heuristics = heuristicRetrySignals(input.observation);
  const preferRetry = heuristics.length > 0 || Boolean(input.forceHeuristicRetry);

  try {
    const decided = await groqJson<{
      needsRetry: boolean;
      reason: string;
      observation: string;
      revisedFilmQueries: string[];
      revisedQueriesByType?: Partial<Record<MediaType, string[]>>;
    }>(
      `You are the Curator Critic Agent in an agentic media curation loop.
You OBSERVE the first web-discovery pass, REASON about fit to the user's growth path, then DECIDE:
- accept: pool is good enough to rank
- retry: rewrite search queries and search again (one loop only)

Return JSON:
{
  "needsRetry": boolean,
  "reason": "1-2 sentences",
  "observation": "what you noticed in the candidate titles",
  "revisedFilmQueries": ["query1", "query2"],
  "revisedQueriesByType": { "film": ["..."], "podcast": ["..."] }
}

Rules:
- You do NOT pick the winning video. Ranking is done by a separate hybrid scorer.
- Prefer retry when: too few results, titles look like rejected content, hustle/clickbait, or weak match to Me→I Am via method.
- Prefer accept when: several calm practical titles clearly serve the method.
- revisedFilmQueries must be REAL YouTube/web search strings that steer toward better content (never search for the disliked titles themselves).
- Keep queries educational / mentor / practical. No competing app brand names.
- If needsRetry is false, still return two solid alternate film queries (unused).`,
      JSON.stringify({
        me: input.me,
        iam: input.iam,
        method: input.method,
        stage: input.stage,
        identityQuerySnippet: input.identityQuery.slice(0, 500),
        observation: input.observation,
        heuristicSignals: heuristics,
        hintPreferRetry: preferRetry,
      }),
    );

    const needsRetry = Boolean(decided.needsRetry) || preferRetry;
    const filmQs = (decided.revisedFilmQueries ?? [])
      .filter(Boolean)
      .slice(0, 2);
    const byType = decided.revisedQueriesByType ?? {};
    if (filmQs.length && !byType.film) byType.film = filmQs;

    return {
      needsRetry,
      reason:
        decided.reason ||
        (needsRetry
          ? "First pass looked weak or mismatched — retrying discovery."
          : "First pass is good enough to rank."),
      observation:
        decided.observation ||
        `Saw ${input.observation.candidateCount} candidates.`,
      revisedFilmQueries: filmQs.length
        ? filmQs
        : [
            `${input.method} ${input.me[0] ?? ""} practical calm`,
            `${input.iam[0] ?? "growth"} focus routine explained`,
          ],
      revisedQueriesByType: byType,
    };
  } catch (e) {
    console.error("critic agent failed — accepting first pass", e);
    // Fail-open: never break curation for judges
    return {
      needsRetry: false,
      reason: "Critic unavailable — continuing with first discovery pass.",
      observation: `Pass-1 candidates: ${input.observation.candidateCount}`,
      revisedFilmQueries: [],
    };
  }
}

export function mergeMediaById(a: MediaItem[], b: MediaItem[]): MediaItem[] {
  const map = new Map<string, MediaItem>();
  for (const item of [...a, ...b]) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}
