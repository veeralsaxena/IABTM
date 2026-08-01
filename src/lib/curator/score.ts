import type { MediaItem, ScoredMedia } from "@/types";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function overlap(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const set = new Set(b.map((x) => x.toLowerCase()));
  const hits = a.filter((x) => set.has(x.toLowerCase())).length;
  return hits / Math.max(a.length, 1);
}

/**
 * Potential-first scoring (not engagement-first).
 * Penalizes attention traps; rewards stage fit, identity alignment, novelty.
 */
export function scoreCandidates(input: {
  candidates: MediaItem[];
  me: string[];
  iam: string[];
  method: string;
  stage: "early" | "middle" | "late" | "any";
  learningStyles: string[];
  seenIds: Set<string>;
}): ScoredMedia[] {
  return input.candidates
    .map((item) => {
      const identityFit = clamp01(
        0.35 * overlap(item.from_attrs, input.me) +
          0.45 * overlap(item.to_attrs, input.iam) +
          0.2 * (item.similarity ?? 0),
      );

      const stageFit =
        item.journey_stage === "any" || item.journey_stage === input.stage
          ? 1
          : 0.35;

      const methodFit = item.methods.some(
        (m) =>
          m.toLowerCase() === input.method.toLowerCase() ||
          m.toLowerCase() === "any",
      )
        ? 1
        : 0.4;

      const styleFit = input.learningStyles.length
        ? Math.max(0.25, overlap(item.learning_styles, input.learningStyles))
        : 0.6;

      const novelty = input.seenIds.has(item.id) ? 0.15 : 1;
      const potential = clamp01(item.potential_score ?? 0.7);
      const antiAttention = clamp01(1 - (item.attention_trap_score ?? 0.2));

      const final =
        0.28 * identityFit +
        0.16 * stageFit +
        0.14 * methodFit +
        0.1 * styleFit +
        0.14 * potential +
        0.1 * novelty +
        0.08 * antiAttention;

      return {
        ...item,
        scores: {
          identityFit,
          stageFit,
          potential,
          novelty,
          antiAttention,
          final,
        },
      } satisfies ScoredMedia;
    })
    .sort((a, b) => b.scores.final - a.scores.final);
}

/** Diversity critic: keep top items while spreading media types. */
export function diversify(ranked: ScoredMedia[], limit = 6): ScoredMedia[] {
  const picked: ScoredMedia[] = [];
  const types = new Set<string>();

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (types.has(item.media_type) && picked.length < limit - 1) {
      // soft skip — allow later if we run short
      continue;
    }
    picked.push(item);
    types.add(item.media_type);
  }

  if (picked.length < limit) {
    for (const item of ranked) {
      if (picked.length >= limit) break;
      if (!picked.find((p) => p.id === item.id)) picked.push(item);
    }
  }

  return picked;
}
