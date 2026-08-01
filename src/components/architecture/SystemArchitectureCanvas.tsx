"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "orchestrator" | "llm" | "rules" | "tool" | "data";

type ArchNode = {
  id: string;
  label: string;
  sub: string;
  kind: Kind;
  x: number;
  y: number;
  detail: string;
  judgeLine: string;
};

type ArchEdge = {
  id: string;
  from: string;
  to: string;
};

const NODES: ArchNode[] = [
  {
    id: "inputs",
    label: "Inputs",
    sub: "Me · I Am · styles",
    kind: "data",
    x: 8,
    y: 42,
    detail:
      "Attributes, check-ins, reviews, artist feedback, and activity completes/skips enter the system.",
    judgeLine: "Human signal in — not a prompt dump.",
  },
  {
    id: "orchestrator",
    label: "Orchestrator",
    sub: "pipeline.ts",
    kind: "orchestrator",
    x: 22,
    y: 18,
    detail:
      "Sequences every role, loads memory, caches today’s briefing. Conductor — not an LLM.",
    judgeLine: "Multi-step orchestration without calling itself an agent.",
  },
  {
    id: "method",
    label: "Method matcher",
    sub: "rules · graph",
    kind: "rules",
    x: 36,
    y: 8,
    detail:
      "Deterministic attribute↔method overlap. Me→method→I Am edges score methods. Not an LLM agent.",
    judgeLine: "Be honest: this is rules, not agents.",
  },
  {
    id: "identity",
    label: "Identity writer",
    sub: "Groq LLM",
    kind: "llm",
    x: 36,
    y: 28,
    detail:
      "Writes who-I-am-now / becoming / how-I-get-there. Stored + embedded as the durable fingerprint.",
    judgeLine: "LLM role with a narrow job.",
  },
  {
    id: "memory",
    label: "Memory",
    sub: "Supabase",
    kind: "tool",
    x: 36,
    y: 48,
    detail:
      "Loads likes, dislikes, blocklist ids, artists, and activity signals for the next identity query.",
    judgeLine: "Closed loop needs persistence.",
  },
  {
    id: "query",
    label: "Live identity query",
    sub: "text → embed",
    kind: "data",
    x: 52,
    y: 28,
    detail:
      "Today’s ranking target: Me + I Am + method + stage + styles + soft feedback lines. Soft bias only.",
    judgeLine: "Soft preference ≠ hard enforcement.",
  },
  {
    id: "planner",
    label: "Query planner",
    sub: "Groq LLM",
    kind: "llm",
    x: 52,
    y: 52,
    detail:
      "Turns identity context into search queries + outdoor/indoor/social activities.",
    judgeLine: "Planner proposes; tools retrieve.",
  },
  {
    id: "retriever",
    label: "Retriever",
    sub: "YT · web · Spotify",
    kind: "tool",
    x: 62,
    y: 52,
    detail:
      "Live discovery from the open web. Candidates get stable yt_/web_ ids for blocklisting.",
    judgeLine: "Tools, not hallucinated catalogs.",
  },
  {
    id: "critic",
    label: "Critic agent",
    sub: "Groq · agentic loop",
    kind: "llm",
    x: 62,
    y: 28,
    detail:
      "Observe pass-1 titles → reason → decide accept or retry → re-search once with revised queries. Does not pick the winner.",
    judgeLine: "This is the real agentic hop — bounded to one retry.",
  },
  {
    id: "embedder",
    label: "Embedder",
    sub: "Gemini 768-d",
    kind: "tool",
    x: 76,
    y: 28,
    detail:
      "Embeds identity query + shortlist media into one vector space for cosine.",
    judgeLine: "Shared embedding space is the ranking spine.",
  },
  {
    id: "blocklist",
    label: "Hard blocklist",
    sub: "DB filter",
    kind: "rules",
    x: 88,
    y: 12,
    detail:
      "Exact disliked media ids are dropped before ranking. Guarantees that video never returns.",
    judgeLine: "Enforcement lives here — not in prompt text.",
  },
  {
    id: "reranker",
    label: "Hybrid reranker",
    sub: "math",
    kind: "rules",
    x: 88,
    y: 36,
    detail:
      "Cosine + lexical + duration + anti-clickbait. Math picks the winner — LLM does not.",
    judgeLine: "Deterministic scoring is the product claim.",
  },
  {
    id: "explainer",
    label: "Explainer",
    sub: "Groq LLM",
    kind: "llm",
    x: 88,
    y: 58,
    detail:
      "Writes why-now after ranking is fixed. Explanation never changes the pick.",
    judgeLine: "Explain after decide.",
  },
  {
    id: "user",
    label: "User loop",
    sub: "rate · skip · block",
    kind: "data",
    x: 96,
    y: 36,
    detail:
      "Immediate UI remove + DB memory. Soft query updates on next curate; hard id filter forever.",
    judgeLine: "Feedback closes the cycle across runs.",
  },
];

const EDGES: ArchEdge[] = [
  { id: "e1", from: "inputs", to: "orchestrator" },
  { id: "e2", from: "orchestrator", to: "method" },
  { id: "e3", from: "orchestrator", to: "identity" },
  { id: "e4", from: "orchestrator", to: "memory" },
  { id: "e5", from: "method", to: "query" },
  { id: "e6", from: "identity", to: "query" },
  { id: "e7", from: "memory", to: "query" },
  { id: "e8", from: "query", to: "planner" },
  { id: "e9", from: "query", to: "embedder" },
  { id: "e10", from: "planner", to: "retriever" },
  { id: "e11", from: "retriever", to: "critic" },
  { id: "e12", from: "critic", to: "retriever" },
  { id: "e13", from: "critic", to: "embedder" },
  { id: "e14", from: "retriever", to: "blocklist" },
  { id: "e15", from: "blocklist", to: "reranker" },
  { id: "e16", from: "embedder", to: "reranker" },
  { id: "e17", from: "reranker", to: "explainer" },
  { id: "e18", from: "explainer", to: "user" },
  { id: "e19", from: "user", to: "memory" },
];

const CYCLE = [
  "inputs",
  "orchestrator",
  "method",
  "identity",
  "memory",
  "query",
  "planner",
  "retriever",
  "critic",
  "embedder",
  "blocklist",
  "reranker",
  "explainer",
  "user",
] as const;

const KIND_STYLE: Record<
  Kind,
  { chip: string; ring: string; glow: string; label: string }
> = {
  orchestrator: {
    chip: "bg-white/15 text-white",
    ring: "ring-white/50",
    glow: "shadow-[0_0_40px_rgba(255,255,255,0.18)]",
    label: "orchestrator",
  },
  llm: {
    chip: "bg-teal-400/20 text-teal-200",
    ring: "ring-teal-300/60",
    glow: "shadow-[0_0_36px_rgba(45,212,191,0.22)]",
    label: "llm",
  },
  rules: {
    chip: "bg-amber-400/20 text-amber-100",
    ring: "ring-amber-300/55",
    glow: "shadow-[0_0_36px_rgba(251,191,36,0.2)]",
    label: "rules",
  },
  tool: {
    chip: "bg-sky-400/20 text-sky-100",
    ring: "ring-sky-300/55",
    glow: "shadow-[0_0_36px_rgba(56,189,248,0.2)]",
    label: "tool",
  },
  data: {
    chip: "bg-zinc-400/20 text-zinc-200",
    ring: "ring-zinc-300/40",
    glow: "shadow-[0_0_28px_rgba(161,161,170,0.16)]",
    label: "data",
  },
};

const LOGS: Record<string, string[]> = {
  inputs: [
    "recv Me=[Procrastinating, Anxious]",
    "recv I Am=[Focused, Disciplined]",
    "learning styles + check-in attached",
  ],
  orchestrator: [
    "load path + day stage",
    "sequence: method → identity → memory → plan → retrieve → rank",
    "briefing cache policy: daily",
  ],
  method: [
    "score attribute↔method edges",
    "Stoicism score=6 (top)",
    "NOT an LLM — deterministic overlap",
  ],
  identity: [
    "Groq: write identity block",
    "who-now / becoming / how",
    "persist answers.identity_block",
  ],
  memory: [
    "load media_reviews blocklist",
    "load artist_feedback + skips",
    "inject soft lines for next query",
  ],
  query: [
    "compose live identity query text",
    "Gemini embed → 768-d ranking target",
    "soft bias only at this stage",
  ],
  planner: [
    "Groq: invent search queries",
    "film + activities proposed",
    "hand off to retriever tools",
  ],
  retriever: [
    "YouTube / DDG / Spotify search",
    "assign stable yt_/web_ ids",
    "return candidate pool (pass 1)",
  ],
  critic: [
    "OBSERVE pass-1 titles + coverage",
    "REASON: fit to Me→I Am via method?",
    "DECIDE accept | retry (max 1)",
    "ACT: rewrite queries → re-search",
  ],
  embedder: [
    "shortlist top ~12 by lexical",
    "embed titles+descriptions",
    "cosine vs identity-query vector",
  ],
  blocklist: [
    "filter disliked media_ref ids",
    "exact video cannot reappear",
    "hard enforcement layer",
  ],
  reranker: [
    "hybrid score = cosine + lexical + duration + anti-hype",
    "math selects winner",
    "LLM does not pick",
  ],
  explainer: [
    "Groq: why-now copy",
    "explain after decide",
    "write daily briefing",
  ],
  user: [
    "user rates / blocks / completes",
    "UI removes blocked card now",
    "memory write → next curate",
  ],
};

function nodeById(id: string) {
  return NODES.find((n) => n.id === id)!;
}

function edgePath(from: ArchNode, to: ArchNode) {
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function ParticleField() {
  const dots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        x: (i * 37) % 100,
        y: (i * 53) % 100,
        s: 1 + (i % 3),
        d: 8 + (i % 10),
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(45,212,191,0.08),transparent_45%),radial-gradient(ellipse_at_80%_30%,rgba(251,191,36,0.07),transparent_40%),radial-gradient(ellipse_at_60%_90%,rgba(56,189,248,0.06),transparent_45%)]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full bg-white/40"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.s,
            height: d.s,
          }}
          animate={{ opacity: [0.15, 0.7, 0.15], y: [0, -10, 0] }}
          transition={{
            duration: d.d,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d.id * 0.05,
          }}
        />
      ))}
    </div>
  );
}

export function SystemArchitectureCanvas() {
  const [activeIdx, setActiveIdx] = useState(0);
  // Start paused so judges can step through — autoplay is opt-in
  const [paused, setPaused] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const activeId = CYCLE[activeIdx];
  const focusId = selected ?? activeId;
  const focus = nodeById(focusId);

  function goTo(i: number) {
    const next = (i + CYCLE.length) % CYCLE.length;
    setActiveIdx(next);
    setSelected(CYCLE[next]);
    setTick((n) => n + 1);
  }

  function stepPrev() {
    setPaused(true);
    goTo(activeIdx - 1);
  }

  function stepNext() {
    setPaused(true);
    goTo(activeIdx + 1);
  }

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActiveIdx((i) => {
        const next = (i + 1) % CYCLE.length;
        setSelected(CYCLE[next]);
        return next;
      });
      setTick((n) => n + 1);
    }, 4200);
    return () => clearInterval(t);
  }, [paused]);

  const activeEdges = useMemo(() => {
    const i = activeIdx;
    const from = CYCLE[i === 0 ? CYCLE.length - 1 : i - 1];
    const to = CYCLE[i];
    return EDGES.filter(
      (e) =>
        (e.from === from && e.to === to) ||
        e.from === to ||
        e.to === to,
    ).map((e) => e.id);
  }, [activeIdx]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#070809] text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
      <ParticleField />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            System architecture · step-through simulation
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Pipeline + one bounded agentic loop
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            Critic Agent observes the first search and may re-search once. Method
            matching and ranking stay rules/math — not agents. Step with Prev /
            Next for judges.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["llm", "LLM"],
              ["rules", "Rules"],
              ["tool", "Tool"],
              ["orchestrator", "Orchestrator"],
              ["data", "Data"],
            ] as const
          ).map(([k, label]) => (
            <span
              key={k}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide",
                KIND_STYLE[k].chip,
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Transport controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-5 py-3 sm:px-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stepPrev}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            {paused ? (
              <>
                <Play className="h-3.5 w-3.5" />
                Play
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                Pause
              </>
            )}
          </button>
          <button
            type="button"
            onClick={stepNext}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-white/10"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="text-xs text-zinc-400">
          Step{" "}
          <span className="font-semibold text-white">
            {activeIdx + 1}/{CYCLE.length}
          </span>
          <span className="mx-2 text-zinc-600">·</span>
          <span className="text-teal-200/90">{focus.label}</span>
          <span className="mx-2 text-zinc-600">·</span>
          {paused ? "Paused — step manually" : "Autoplay ~4s / step"}
        </div>
      </div>

      <div className="relative z-10 grid gap-0 lg:grid-cols-[1fr_300px]">
        <div className="relative min-h-[420px] overflow-x-auto sm:min-h-[520px]">
          <div className="relative mx-auto h-[420px] w-[720px] max-w-none sm:h-[520px] sm:w-full">
          <svg
            viewBox="0 0 100 70"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
              </linearGradient>
            </defs>
            {EDGES.map((e) => {
              const a = nodeById(e.from);
              const b = nodeById(e.to);
              const lit = activeEdges.includes(e.id);
              const d = edgePath(a, b);
              return (
                <g key={e.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={0.22}
                    strokeLinecap="round"
                  />
                  {lit && (
                    <motion.path
                      key={`${e.id}-${tick}`}
                      d={d}
                      fill="none"
                      stroke="#5eead4"
                      strokeWidth={0.38}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0.2 }}
                      animate={{ pathLength: 1, opacity: [0.3, 1, 0.45] }}
                      transition={{ duration: 1.15, ease: "easeInOut" }}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {NODES.map((n) => {
            const lit = n.id === activeId;
            const sel = n.id === focusId;
            const style = KIND_STYLE[n.kind];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelected(n.id === selected ? null : n.id)}
                className={cn(
                  "absolute w-[118px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-2.5 py-2 text-left transition-all duration-500 sm:w-[132px]",
                  lit || sel
                    ? cn("border-white/30 bg-white/10", style.glow, "ring-1", style.ring)
                    : "border-white/10 bg-[#0d0e10]/90 hover:border-white/25",
                )}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[8px] uppercase tracking-wide",
                      style.chip,
                    )}
                  >
                    {style.label}
                  </span>
                  {lit && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
                  )}
                </div>
                <div className="mt-1 text-[11px] font-semibold leading-tight sm:text-xs">
                  {n.label}
                </div>
                <div className="mt-0.5 text-[9px] text-zinc-500 sm:text-[10px]">
                  {n.sub}
                </div>
              </button>
            );
          })}
          </div>
        </div>

        <aside className="border-t border-white/10 bg-black/35 p-5 lg:border-l lg:border-t-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={focus.id + String(tick)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Active module
              </div>
              <div className="mt-1 font-display text-xl font-bold">
                {focus.label}
              </div>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                  KIND_STYLE[focus.kind].chip,
                )}
              >
                {KIND_STYLE[focus.kind].label} · {focus.sub}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {focus.detail}
              </p>
              <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-teal-100/90">
                Judge line: {focus.judgeLine}
              </p>
              <div className="mt-4 space-y-1.5 font-mono text-[11px] text-zinc-400">
                {(LOGS[focus.id] ?? []).map((line, i) => (
                  <motion.div
                    key={`${focus.id}-${i}-${tick}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex gap-2"
                  >
                    <span className="text-teal-500/80">›</span>
                    <span>{line}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
              <div className="text-[10px] uppercase tracking-wide text-amber-200/80">
                Hard
              </div>
              <p className="mt-1 text-[11px] leading-snug text-amber-50/90">
                Blocklist by exact id — guaranteed drop.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                Soft
              </div>
              <p className="mt-1 text-[11px] leading-snug text-zinc-300">
                Identity-query text bias on next curate.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-[11px] text-zinc-500 sm:px-7">
        <div>
          Use Prev / Next for judges · Play for slow autoplay · click any node
        </div>
        <div className="flex gap-1">
          {CYCLE.map((id, i) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPaused(true);
                goTo(i);
              }}
              className={cn(
                "h-1.5 w-4 rounded-full transition",
                i === activeIdx ? "bg-teal-300" : "bg-white/15 hover:bg-white/30",
              )}
              aria-label={id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
