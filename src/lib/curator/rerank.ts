import type { MediaItem, ScoredMedia } from "@/types";
import { cosineToUnit } from "@/lib/curator/identity-block";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function tokens(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function overlapScore(text: string, labels: string[]) {
  if (!labels.length) return 0.4;
  const bag = new Set(tokens(text));
  let hits = 0;
  for (const label of labels) {
    const parts = tokens(label);
    if (parts.some((p) => bag.has(p))) hits += 1;
  }
  return hits / labels.length;
}

const CLICKBAIT =
  /\b(shocking|you won't believe|gone wrong|insane|hack your brain|make you rich|overnight|secret trick)\b/i;

/**
 * Hybrid reranker:
 * - Prefer vector cosine (identity ↔ media embedding) when available
 * - Keep lexical + duration + anti-clickbait as complementary signals
 *
 * Production path stores identity embeddings in Supabase pgvector and
 * compares against cached media embeddings. Live web candidates are
 * embedded on the shortlist when the embedding API is available.
 */
export function rerankCandidates(input: {
  candidates: MediaItem[];
  me: string[];
  iam: string[];
  method: string;
  stage: "early" | "middle" | "late" | "any";
  learningStyles: string[];
  seenIds: Set<string>;
  identityQuery: string;
  /** cosine similarity per candidate id, if embeddings were computed */
  vectorScores?: Record<string, number>;
}): ScoredMedia[] {
  const methodTokens = tokens(input.method);
  const queryTokens = new Set(tokens(input.identityQuery));
  const hasVectors =
    input.vectorScores && Object.keys(input.vectorScores).length > 0;

  return input.candidates
    .map((item) => {
      const blob = `${item.title} ${item.description} ${item.creator ?? ""}`;
      const lexicalIdentity = clamp01(
        0.4 * overlapScore(blob, input.me) +
          0.45 * overlapScore(blob, input.iam) +
          0.15 * overlapScore(blob, [input.method]),
      );

      const vectorRaw = input.vectorScores?.[item.id];
      const vectorFit =
        typeof vectorRaw === "number" ? cosineToUnit(vectorRaw) : null;

      // Prefer semantic vector when present; otherwise lexical overlap.
      const identityFit =
        vectorFit != null
          ? clamp01(0.75 * vectorFit + 0.25 * lexicalIdentity)
          : lexicalIdentity;

      const blobTokens = tokens(blob);
      const queryHit =
        blobTokens.filter((t) => queryTokens.has(t)).length /
        Math.max(8, queryTokens.size);
      const semanticProxy = clamp01(
        vectorFit != null ? 0.7 * vectorFit + 0.3 * queryHit : queryHit,
      );

      const mins = item.duration_minutes ?? 8;
      const durationFit =
        input.stage === "early"
          ? mins <= 12
            ? 1
            : mins <= 20
              ? 0.7
              : 0.35
          : mins >= 5 && mins <= 25
            ? 1
            : 0.55;

      const methodFit = methodTokens.some((t) =>
        blob.toLowerCase().includes(t),
      )
        ? 1
        : 0.55;

      const styleFit = input.learningStyles.length
        ? Math.max(
            0.35,
            overlapScore(
              blob,
              input.learningStyles.map((s) => s.toLowerCase()),
            ),
          )
        : 0.6;

      const novelty = input.seenIds.has(item.id) ? 0.2 : 1;
      const antiAttention = CLICKBAIT.test(blob) ? 0.25 : 0.9;
      const potential = clamp01(
        0.55 * identityFit + 0.25 * semanticProxy + 0.2 * durationFit,
      );

      const final = hasVectors
        ? 0.34 * identityFit +
          0.2 * semanticProxy +
          0.12 * methodFit +
          0.1 * durationFit +
          0.08 * styleFit +
          0.08 * novelty +
          0.08 * antiAttention
        : 0.3 * identityFit +
          0.18 * semanticProxy +
          0.14 * methodFit +
          0.12 * durationFit +
          0.08 * styleFit +
          0.1 * novelty +
          0.08 * antiAttention;

      return {
        ...item,
        similarity: vectorRaw ?? item.similarity,
        potential_score: potential,
        attention_trap_score: 1 - antiAttention,
        scores: {
          identityFit,
          stageFit: durationFit,
          potential,
          novelty,
          antiAttention,
          final,
        },
      } satisfies ScoredMedia;
    })
    .sort((a, b) => b.scores.final - a.scores.final);
}

export function diversifyTypes(
  ranked: ScoredMedia[],
  limit = 6,
): ScoredMedia[] {
  const picked: ScoredMedia[] = [];
  const types = new Set<string>();

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (types.has(item.media_type) && picked.length < Math.max(2, limit - 2)) {
      continue;
    }
    picked.push(item);
    types.add(item.media_type);
  }

  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (!picked.find((p) => p.id === item.id)) picked.push(item);
  }

  return picked;
}
