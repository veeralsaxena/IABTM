"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  remembered?: string | null;
};

const SUGGESTIONS = [
  "Why did you pick today’s video for me?",
  "What should I practice in the next 10 minutes?",
  "I’m done with hustle / clickbait — remember that",
  "Explain my method simply",
  "I never rate videos — how else can I steer this?",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function VectorChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
        content:
        "I’m Vector Companion. I retrieve the most relevant pieces of your path, briefing, and feedback with Gemini embeddings, then answer with Groq. Ask why something was curated — or tell me a preference to remember.",
    },
  ]);
  const [meta, setMeta] = useState<{
    method?: string | null;
    day?: number | null;
    primaryTitle?: string | null;
    rag?: {
      mode?: string;
      corpusSize?: number;
      retrieved?: Array<{
        id: string;
        source: string;
        score: number;
        preview: string;
      }>;
    };
  }>({});
  const [showSources, setShowSources] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;

    const userMsg: Msg = { id: uid(), role: "user", content };
    const historyForApi = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    const assistantId = uid();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages:
            historyForApi.length > 0
              ? historyForApi
              : [{ role: "user", content }],
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Companion failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let dataRaw = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
          }
          if (!dataRaw) continue;
          const data = JSON.parse(dataRaw) as Record<string, unknown>;

          if (event === "meta") {
            setMeta({
              method: data.method as string | null,
              day: data.day as number | null,
              primaryTitle: data.primaryTitle as string | null,
              rag: data.rag as typeof meta.rag,
            });
            if (
              data.rag &&
              Array.isArray((data.rag as { retrieved?: unknown[] }).retrieved)
            ) {
              setShowSources(true);
            }
          } else if (event === "delta") {
            assembled += String(data.text ?? "");
            const visible = assembled
              .replace(/\[\[REMEMBER:[\s\S]*$/i, "")
              .replace(/\[\[REMEMBER:[\s\S]*?\]\]/gi, "");
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: visible } : m,
              ),
            );
          } else if (event === "done") {
            const reply = String(data.reply ?? assembled);
            const rememberNote = data.remembered
              ? String(data.rememberNote ?? "")
              : null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: reply, remembered: rememberNote }
                  : m,
              ),
            );
          } else if (event === "error") {
            throw new Error(String(data.message ?? "Chat error"));
          }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  e instanceof Error
                    ? `I hit a snag: ${e.message}`
                    : "Something went wrong.",
              }
            : m,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close companion" : "Open Vector Companion"}
        className={cn(
          "fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300",
          open
            ? "bg-zinc-800 text-white rotate-0"
            : "bg-zinc-950 text-white hover:scale-105",
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <span className="relative">
            <MessageCircle className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-teal-400" />
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-5 z-[60] flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0b0d] text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)] transition-all duration-300",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
        style={{ height: "min(640px, calc(100vh - 7rem))" }}
      >
        <div className="relative overflow-hidden border-b border-white/10 px-4 py-3.5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(45,212,191,0.18),transparent_55%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="h-3.5 w-3.5 text-teal-300" />
                </span>
                <div>
                  <div className="font-display text-base font-bold tracking-tight">
                    Vector Companion
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    RAG · Gemini retrieve · Groq generate
                  </div>
                </div>
              </div>
              {(meta.method || meta.primaryTitle) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {meta.method && (
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-teal-200/90 ring-1 ring-white/10">
                      {meta.method}
                      {meta.day != null ? ` · day ${meta.day}` : ""}
                    </span>
                  )}
                  {meta.primaryTitle && (
                    <span className="max-w-full truncate rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 ring-1 ring-white/10">
                      Today: {meta.primaryTitle}
                    </span>
                  )}
                  {meta.rag?.retrieved && (
                    <button
                      type="button"
                      onClick={() => setShowSources((s) => !s)}
                      className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-100 ring-1 ring-amber-400/20"
                    >
                      RAG · {meta.rag.retrieved.length}/{meta.rag.corpusSize ?? "?"}{" "}
                      · {meta.rag.mode === "vector" ? "vector" : "lexical"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showSources && meta.rag?.retrieved && meta.rag.retrieved.length > 0 && (
          <div className="max-h-28 space-y-1 overflow-y-auto border-b border-white/10 bg-black/30 px-3.5 py-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              Retrieved chunks (this turn)
            </div>
            {meta.rag.retrieved.map((c) => (
              <div
                key={c.id}
                className="truncate text-[11px] text-zinc-400"
                title={c.preview}
              >
                <span className="text-teal-300/90">{c.score.toFixed(2)}</span>
                <span className="mx-1.5 text-zinc-600">·</span>
                <span className="text-zinc-500">{c.source}</span>
                <span className="mx-1.5 text-zinc-600">·</span>
                {c.preview}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-teal-500/20 text-teal-50 ring-1 ring-teal-400/20"
                    : "bg-white/[0.06] text-zinc-200 ring-1 ring-white/10",
                )}
              >
                <div className="whitespace-pre-wrap">{m.content || (busy ? "…" : "")}</div>
                {m.remembered && (
                  <div className="mt-2 rounded-lg bg-teal-400/15 px-2 py-1.5 text-[11px] text-teal-200">
                    Saved for next curate: {m.remembered}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 px-1 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reading your identity context…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-white/5 px-3 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="border-t border-white/10 bg-black/40 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your path, pick, or preferences…"
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-1.5 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-400 text-zinc-950 disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-zinc-600">
            RAG: Gemini embeds your question → top memory chunks → Groq answers.
            Remembered notes feed the next curate.
          </p>
        </form>
      </div>
    </>
  );
}
