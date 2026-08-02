import { embedText } from "@/lib/ai/embeddings";
import { cosineSimilarity, cosineToUnit } from "@/lib/curator/identity-block";
import { METHODS } from "@/lib/data/catalog";
import type { CompanionContext } from "@/lib/chat/context";

export type RagChunk = {
  id: string;
  source: string;
  text: string;
};

export type RetrievedChunk = RagChunk & {
  score: number;
};

/**
 * Build a personal + product knowledge corpus for RAG.
 * Each row is a retrievable chunk (not dumped wholesale into the prompt).
 */
export function buildRagCorpus(ctx: CompanionContext): RagChunk[] {
  const chunks: RagChunk[] = [];
  const push = (id: string, source: string, text: string) => {
    const t = text.trim();
    if (t.length > 20) chunks.push({ id, source, text: t.slice(0, 1200) });
  };

  push(
    "user_profile",
    "profile",
    `User ${ctx.name}. Learning styles: ${ctx.learningStyles.join(", ") || "unspecified"}.`,
  );

  if (ctx.path) {
    push(
      "path_core",
      "path",
      `Active path. Me now: ${ctx.path.me.join(", ")}. Becoming: ${ctx.path.iam.join(", ")}. Method: ${ctx.path.method}. Day ${ctx.path.day} of ${ctx.path.totalDays}. Rationale: ${ctx.path.methodRationale ?? "n/a"}.`,
    );
    const ib = ctx.path.identityBlock;
    if (ib) {
      push(
        "identity_now",
        "identity_block",
        `Who I am now: ${ib.whoIAmNow ?? ""}`,
      );
      push(
        "identity_becoming",
        "identity_block",
        `Who I am becoming: ${ib.whoIAmBecoming ?? ""}`,
      );
      push(
        "identity_how",
        "identity_block",
        `How I get there: ${ib.howIGetThere ?? ""}`,
      );
    }
    const method = METHODS.find((m) => m.id === ctx.path!.method);
    if (method) {
      push(
        "method_blurb",
        "method_catalog",
        `Method ${method.id}: ${method.blurb}. Bridges from ${method.from.join(", ")} toward ${method.to.join(", ")}.`,
      );
    }
  }

  if (ctx.todayBriefing) {
    const b = ctx.todayBriefing;
    push(
      "briefing_primary",
      "daily_briefing",
      `Today's primary pick: ${b.primaryTitle ?? "unknown"}. Why now: ${b.whyNow ?? b.reason ?? "n/a"}. Scores: ${b.scores ? JSON.stringify(b.scores) : "n/a"}.`,
    );
    if (b.secondaryTitles.length) {
      push(
        "briefing_secondary",
        "daily_briefing",
        `Also considered today: ${b.secondaryTitles.join("; ")}.`,
      );
    }
  }

  ctx.likedTitles.forEach((t, i) =>
    push(`liked_${i}`, "media_review_liked", `User liked / rated highly: ${t}`),
  );
  ctx.dislikedTitles.forEach((t, i) =>
    push(
      `disliked_${i}`,
      "media_review_disliked",
      `User disliked / blocked media: ${t}`,
    ),
  );
  ctx.dislikedReasons.forEach((t, i) =>
    push(
      `dislike_reason_${i}`,
      "media_review_reason",
      `Why they disliked something: ${t}`,
    ),
  );
  ctx.preferredArtists.forEach((t, i) =>
    push(`artist_like_${i}`, "artist_feedback", `Preferred mentor/artist: ${t}`),
  );
  ctx.avoidedArtists.forEach((t, i) =>
    push(`artist_avoid_${i}`, "artist_feedback", `Avoided mentor/artist: ${t}`),
  );
  ctx.chatPreferences.forEach((t, i) =>
    push(
      `chat_pref_${i}`,
      "chat_preference",
      `Companion-saved preference: ${t}`,
    ),
  );
  ctx.recentCheckIns.forEach((t, i) =>
    push(`checkin_${i}`, "check_in", `Recent check-in: ${t}`),
  );
  ctx.completedActivities.forEach((t, i) =>
    push(
      `activity_${i}`,
      "activity",
      `Recently completed activity: ${t}`,
    ),
  );

  // Small product knowledge so "how does Vector work?" is RAG-backed too
  push(
    "system_pipeline",
    "product_knowledge",
    `Vector curation pipeline: method matcher (rules) → identity writer (LLM) → live identity query embed (Gemini) → query planner (LLM) → web retriever → Critic agent (observe/retry once) → hybrid reranker (math) → explainer. Hard blocklist by exact media id. Soft feedback updates next identity query.`,
  );
  push(
    "system_feedback",
    "product_knowledge",
    `Feedback: Don't show again hard-blocks that video id. Soft likes/dislikes and chat preferences bias the next live identity query. Ranking uses identityFit, stage/duration fit, novelty, anti-clickbait, and final weighted score.`,
  );
  push(
    "system_companion",
    "product_knowledge",
    `Vector Companion uses retrieval-augmented generation: embed the user question with Gemini, retrieve top personal memory chunks by cosine similarity, then answer with Groq using only retrieved context plus a thin identity header.`,
  );

  return chunks;
}

function lexicalOverlap(query: string, text: string): number {
  const q = new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
  if (!q.size) return 0;
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  let hits = 0;
  for (const t of tokens) if (q.has(t)) hits += 1;
  return hits / Math.max(6, q.size);
}

/**
 * RAG retrieve: embed question → shortlist by lexical → embed shortlist → cosine top-k.
 * Fail-open: if embeddings fail, return lexical top-k.
 */
export async function retrieveRagChunks(input: {
  query: string;
  ctx: CompanionContext;
  topK?: number;
}): Promise<{
  retrieved: RetrievedChunk[];
  corpusSize: number;
  mode: "vector" | "lexical_fallback";
}> {
  const topK = input.topK ?? 5;
  const corpus = buildRagCorpus(input.ctx);
  if (!corpus.length) {
    return { retrieved: [], corpusSize: 0, mode: "lexical_fallback" };
  }

  // Lexical pre-rank to limit embedding cost
  const pre = [...corpus]
    .map((c) => ({
      ...c,
      lex: lexicalOverlap(input.query, c.text) + (c.source === "path" ? 0.05 : 0),
    }))
    .sort((a, b) => b.lex - a.lex);

  const shortlist = pre.slice(0, Math.min(14, pre.length));

  try {
    const queryEmb = await embedText(input.query);
    const scored: RetrievedChunk[] = [];
    for (const chunk of shortlist) {
      try {
        const emb = await embedText(chunk.text);
        const raw = cosineSimilarity(queryEmb, emb);
        scored.push({
          id: chunk.id,
          source: chunk.source,
          text: chunk.text,
          score: Number(cosineToUnit(raw).toFixed(3)),
        });
        await new Promise((r) => setTimeout(r, 50));
      } catch {
        scored.push({
          id: chunk.id,
          source: chunk.source,
          text: chunk.text,
          score: Number(Math.min(1, chunk.lex).toFixed(3)),
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return {
      retrieved: scored.slice(0, topK),
      corpusSize: corpus.length,
      mode: "vector",
    };
  } catch (e) {
    console.error("RAG embed failed — lexical fallback", e);
    return {
      retrieved: pre.slice(0, topK).map((c) => ({
        id: c.id,
        source: c.source,
        text: c.text,
        score: Number(Math.min(1, c.lex).toFixed(3)),
      })),
      corpusSize: corpus.length,
      mode: "lexical_fallback",
    };
  }
}

export function formatRagSystemPrompt(
  ctx: CompanionContext,
  retrieved: RetrievedChunk[],
): string {
  const path = ctx.path;
  const retrievedBlock = retrieved.length
    ? retrieved
        .map(
          (c, i) =>
            `[${i + 1}] (${c.source}, relevance ${c.score})\n${c.text}`,
        )
        .join("\n\n")
    : "(no chunks retrieved — answer carefully from the thin header only)";

  return `You are Vector Companion — a personal growth curator chat using RETRIEVAL-AUGMENTED GENERATION (RAG).
Answer using the RETRIEVED MEMORY chunks below as primary evidence. Do not invent videos, ratings, or facts not present there or in the thin header.
If retrieval is weak, say what you don't know and ask a useful follow-up.

THIN IDENTITY HEADER
- Name: ${ctx.name}
- Learning styles: ${ctx.learningStyles.join(", ") || "unknown"}
${
  path
    ? `- Path: ${path.me.join(", ")} → ${path.iam.join(", ")} via ${path.method} (day ${path.day}/${path.totalDays})`
    : "- No active path"
}

RETRIEVED MEMORY (ranked by embedding similarity to the user question)
${retrievedBlock}

CAPABILITIES
1. Explain today's pick / scores / method using retrieved chunks.
2. Coach with tiny concrete actions (2–4 minutes).
3. Prefer Don't show again / Artists / Settings when relevant.
4. When they state a lasting preference, end with exactly one line:
   [[REMEMBER: short preference note]]
   Otherwise omit it.
5. Be honest: Vector uses an orchestrated pipeline + Critic loop; ranking is math; this chat is RAG over personal memory, not a multi-agent swarm.
6. Keep replies usually under 180 words. Light markdown ok. No hustle/clickbait.
7. You cannot edit Me/I Am attributes — send them to Settings.`;
}
