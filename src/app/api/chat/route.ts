import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqChatStream, type ChatMessage } from "@/lib/ai/groq";
import { loadCompanionContext } from "@/lib/chat/context";
import { formatRagSystemPrompt, retrieveRagChunks } from "@/lib/chat/rag";

const REMEMBER_RE = /\[\[REMEMBER:\s*([\s\S]*?)\]\]/i;

/**
 * Vector Companion — RAG chatbot.
 * 1) Load personal memory corpus from DB
 * 2) Embed the question (Gemini)
 * 3) Retrieve top-k chunks by cosine
 * 4) Stream Groq answer grounded in those chunks
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const rawMessages =
    (body.messages as Array<{ role: string; content: string }>) ?? [];
  const messages = rawMessages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-16)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.trim().slice(0, 4000),
    }));

  if (!messages.length || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json(
      { error: "Send at least one user message." },
      { status: 400 },
    );
  }

  const latestUser = messages[messages.length - 1].content;
  const ctx = await loadCompanionContext(user.id);

  const rag = await retrieveRagChunks({
    query: latestUser,
    ctx,
    topK: 5,
  });

  const system = formatRagSystemPrompt(ctx, rag.retrieved);

  const chatMessages: ChatMessage[] = [
    { role: "system", content: system },
    ...messages,
  ];

  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        send("meta", {
          name: ctx.name,
          method: ctx.path?.method ?? null,
          day: ctx.path?.day ?? null,
          primaryTitle: ctx.todayBriefing?.primaryTitle ?? null,
          rag: {
            mode: rag.mode,
            corpusSize: rag.corpusSize,
            retrieved: rag.retrieved.map((c) => ({
              id: c.id,
              source: c.source,
              score: c.score,
              preview: c.text.slice(0, 120),
            })),
          },
        });

        for await (const delta of groqChatStream(chatMessages)) {
          full += delta;
          send("delta", { text: delta });
        }

        const rememberMatch = full.match(REMEMBER_RE);
        const rememberNote = rememberMatch?.[1]?.trim() ?? null;
        const cleanReply = full.replace(REMEMBER_RE, "").trim();

        let remembered = false;
        if (rememberNote && rememberNote.length > 2) {
          const { error } = await supabase.from("check_ins").insert({
            user_id: user.id,
            path_id: ctx.path?.id ?? null,
            body: `Chat preference: ${rememberNote.slice(0, 500)}`,
            sentiment: 0,
            growth_signal: "preference",
          });
          remembered = !error;
          if (error) console.error("chat remember failed", error);
        }

        send("done", {
          reply: cleanReply,
          remembered,
          rememberNote: remembered ? rememberNote : null,
          ragMode: rag.mode,
          retrievedCount: rag.retrieved.length,
        });
      } catch (e) {
        console.error("chat stream failed", e);
        send("error", {
          message:
            e instanceof Error
              ? e.message
              : "Companion is unavailable right now.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
