import { embedText } from "@/lib/ai/embeddings";
import { groqJson } from "@/lib/ai/groq";
import type { PathRecord } from "@/types";

/**
 * Identity block — a compact psychological summary of the Me→I Am gap.
 * This is what we embed into pgvector / Gemini 768-d space.
 */
export type IdentityBlock = {
  whoIAmNow: string;
  whoIAmBecoming: string;
  howIGetThere: string;
  rawText: string;
};

export async function buildIdentityBlock(input: {
  path: Pick<PathRecord, "me_labels" | "iam_labels" | "method" | "method_rationale">;
  vibe?: string | null;
  motivation?: string | null;
  answers?: Record<string, string>;
}): Promise<IdentityBlock> {
  try {
    const block = await groqJson<IdentityBlock>(
      `You write a growth identity block. Return JSON with exactly:
{
  "whoIAmNow": "1-2 sentences about current self",
  "whoIAmBecoming": "1-2 sentences about aspirational self",
  "howIGetThere": "1-2 sentences about the method and practice",
  "rawText": "concatenate the three answers into one paragraph for embedding"
}
No brand names. Concrete, kind, no hype.`,
      JSON.stringify({
        me: input.path.me_labels,
        iam: input.path.iam_labels,
        method: input.path.method,
        rationale: input.path.method_rationale,
        vibe: input.vibe ?? null,
        motivation: input.motivation ?? null,
        answers: input.answers ?? {},
      }),
    );
    if (block.rawText?.trim()) return block;
  } catch {
    // fall through
  }

  const whoIAmNow = `I currently operate as ${input.path.me_labels.join(", ")}.`;
  const whoIAmBecoming = `I am becoming ${input.path.iam_labels.join(", ")}.`;
  const howIGetThere = `I practice ${input.path.method}${
    input.path.method_rationale ? ` — ${input.path.method_rationale}` : ""
  }.`;
  return {
    whoIAmNow,
    whoIAmBecoming,
    howIGetThere,
    rawText: `${whoIAmNow} ${whoIAmBecoming} ${howIGetThere}`,
  };
}

export async function embedIdentityBlock(block: IdentityBlock): Promise<number[]> {
  return embedText(block.rawText);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Normalize cosine (-1..1) to 0..1 relevance. */
export function cosineToUnit(sim: number): number {
  return Math.max(0, Math.min(1, (sim + 1) / 2));
}
