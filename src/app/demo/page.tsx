"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HardDrive,
  Loader2,
  Play,
  Sparkles,
  Workflow,
} from "lucide-react";
import {
  ASPIRATIONAL_ATTRIBUTES,
  CURRENT_ATTRIBUTES,
  LEARNING_STYLES,
} from "@/lib/data/catalog";
import { MediaPlayer } from "@/components/MediaPlayer";
import { cn } from "@/lib/utils";

type DemoResult = {
  latencyMs: number;
  model: string;
  fromCache?: boolean;
  cacheSource?: string;
  cacheSavedAt?: string;
  cacheReason?: string;
  liveError?: string;
  steps: {
    inputs: {
      me: string[];
      iam: string[];
      answers: Record<string, string>;
      learningStyles: string[];
    };
    methodGraph: {
      selected: string;
      blurb: string;
      rationale: string;
      ranked: Array<{
        id: string;
        blurb: string;
        score: number;
        fromHits: string[];
        toHits: string[];
      }>;
      edges: Array<{ from: string; to: string; kind: string }>;
    };
    identityBlock: {
      whoIAmNow: string;
      whoIAmBecoming: string;
      howIGetThere: string;
      rawText: string;
    };
    identityQuery: { text: string; note: string };
    embedding: {
      dimensions: number;
      model: string;
      blockPreview: number[];
      queryPreview: number[];
      blockNorm: number;
      queryNorm: number;
    };
    discovery: {
      queries: string[];
      candidatesFound: number;
      shortlistSize: number;
      shortlistNote: string;
      activities: Array<{ title: string; description: string; category: string }>;
      candidates: Array<{
        id: string;
        title: string;
        description: string;
        creator: string | null;
        url: string | null;
        cosine: number | null;
        shortlisted?: boolean;
      }>;
    };
    agentLoop?: {
      kind: string;
      note: string;
      observed: string;
      decision: "accept" | "retry";
      reason: string;
      heuristicsTriggered: string[];
      pass1Queries: string[];
      revisedQueries: string[];
      pass1Candidates: number;
      pass2Added: number;
      mergedCandidates: number;
    };
    ranking: {
      note: string;
      whyNow: string;
      top: Array<{
        id: string;
        title: string;
        description: string;
        creator: string | null;
        url: string | null;
        scores: Record<string, number>;
        cosineRaw: number | null;
      }>;
    };
    orchestration: {
      note: string;
      agents: Array<{
        id: string;
        name: string;
        brain: string;
        job: string;
        kind?: string;
      }>;
    };
    feedbackLoop: {
      note: string;
      affectsLiveIdentityQuery: boolean;
      channels: Array<{ signal: string; store: string; effect: string }>;
      simulatedAfterDislike: {
        dislikedTitle: string;
        nextIdentityQuerySnippet: string;
        avoidId: string;
      } | null;
    };
  };
};

const STEPS = [
  { id: "attrs", label: "Attributes" },
  { id: "questions", label: "Questions" },
  { id: "method", label: "Method graph" },
  { id: "identity", label: "Identity block" },
  { id: "embed", label: "Embedding" },
  { id: "agents", label: "Pipeline roles" },
  { id: "search", label: "Web search" },
  { id: "critic", label: "Agent loop" },
  { id: "rank", label: "Rank & pick" },
  { id: "feedback", label: "Feedback loop" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const QUESTIONS = [
  {
    id: "vibe",
    prompt: "Current vibe?",
    options: ["Scattered", "Tired but willing", "Motivated", "Stuck", "Curious"],
  },
  {
    id: "motivation",
    prompt: "What media moves you?",
    options: ["Short videos", "Long talks", "Stories", "Frameworks", "Mentors"],
  },
  {
    id: "interests",
    prompt: "Who do you want more of?",
    options: ["Entrepreneurs", "Artists", "Scientists", "Writers", "Coaches"],
  },
] as const;

export default function DemoPage() {
  const [step, setStep] = useState<StepId>("attrs");
  const [me, setMe] = useState<string[]>(["Procrastinating"]);
  const [iam, setIam] = useState<string[]>(["Action-oriented"]);
  const [styles, setStyles] = useState<string[]>(["Visual"]);
  const [answers, setAnswers] = useState<Record<string, string>>({
    vibe: "Scattered",
    motivation: "Mentors",
    interests: "Entrepreneurs",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [revealMethod, setRevealMethod] = useState(0);
  const [agentPulse, setAgentPulse] = useState(0);
  const [cacheMeta, setCacheMeta] = useState<{
    hasCache: boolean;
    savedAt?: string;
    source?: string;
  } | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((j) => setCacheMeta(j))
      .catch(() => setCacheMeta({ hasCache: false }));
  }, [result]);

  async function applyResult(json: DemoResult) {
    setResult(json);
    const ranked = json.steps.methodGraph.ranked;
    for (let i = 1; i <= Math.min(ranked.length, 6); i++) {
      await new Promise((r) => setTimeout(r, 180));
      setRevealMethod(i);
    }
    for (let i = 0; i < 11; i++) {
      await new Promise((r) => setTimeout(r, 120));
      setAgentPulse(i + 1);
    }
  }

  function toggle(
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    max = 5,
  ) {
    if (list.includes(value)) setList(list.filter((x) => x !== value));
    else if (list.length < max) setList([...list, value]);
  }

  async function runPipeline(opts?: { useCache?: boolean }) {
    setBusy(true);
    setError(null);
    setResult(null);
    setRevealMethod(0);
    setAgentPulse(0);
    setStep("method");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          me,
          iam,
          answers,
          learningStyles: styles,
          useCache: Boolean(opts?.useCache),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Demo failed");
      await applyResult(json as DemoResult);
    } catch (e) {
      // Client-side last resort: ask server for cache explicitly
      try {
        const res = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useCache: true }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No cached demo");
        await applyResult(json as DemoResult);
        setError(
          `Live run failed — showing last successful cache. (${e instanceof Error ? e.message : "error"})`,
        );
      } catch {
        setError(e instanceof Error ? e.message : "Demo failed");
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedMethod = result?.steps.methodGraph.selected;

  const sparkBars = useMemo(() => {
    const vals = result?.steps.embedding.queryPreview?.length
      ? result.steps.embedding.queryPreview
      : result?.steps.embedding.blockPreview ?? [];
    if (!vals.length) return [];
    const max = Math.max(...vals.map(Math.abs), 0.01);
    return vals.map((v) => Math.abs(v) / max);
  }, [result]);

  return (
    <div className="min-h-screen bg-[#f4f2ee] text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-[#f4f2ee]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              App
            </Link>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">
                Vector
              </div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                Live system demo
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/architecture"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400"
            >
              System design
            </Link>
            <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
              <Workflow className="h-3.5 w-3.5" />
              Real Groq · Gemini · web search
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white">
            <Sparkles className="h-3 w-3" />
            For judges
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            Watch the pipeline think
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
            Pick attributes like a real user. We run the same backend pipeline —
            method graph, identity block, embeddings, live web discovery, hybrid
            rerank — and show every intermediate output. Successful runs are
            cached so you always have a judge-safe replay.
          </p>
          {cacheMeta?.hasCache && (
            <p className="mt-2 text-xs text-zinc-400">
              Cached run ready
              {cacheMeta.savedAt
                ? ` · ${new Date(cacheMeta.savedAt).toLocaleString()}`
                : ""}
              {cacheMeta.source ? ` · ${cacheMeta.source}` : ""}
            </p>
          )}
        </div>

        {/* Step rail */}
        <div className="mb-8 flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const done = i < stepIndex || (result && i <= stepIndex);
            const active = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                disabled={
                  !result &&
                  i > 1 &&
                  s.id !== "attrs" &&
                  s.id !== "questions" &&
                  s.id !== "method"
                }
                onClick={() => {
                  if (s.id === "attrs" || s.id === "questions") setStep(s.id);
                  else if (result || s.id === "method") setStep(s.id);
                }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-zinc-900 text-white"
                    : done
                      ? "bg-white text-zinc-700 ring-1 ring-zinc-200"
                      : "bg-transparent text-zinc-400",
                )}
              >
                {i + 1}. {s.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            className={cn(
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              result?.fromCache
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {error}
          </div>
        )}

        {result?.fromCache && !error && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <HardDrive className="h-4 w-4 shrink-0" />
            Replaying cached successful run
            {result.cacheSavedAt
              ? ` · ${new Date(result.cacheSavedAt).toLocaleString()}`
              : ""}
            {result.cacheSource ? ` · ${result.cacheSource}` : ""}
          </div>
        )}

        {/* ATTRS */}
        {step === "attrs" && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">Who you are → who you’re becoming</h2>
            <p className="text-sm text-zinc-500">
              Same inputs Vector uses in onboarding. Up to 5 each.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <AttrPicker
                title="Me · now"
                options={[...CURRENT_ATTRIBUTES]}
                selected={me}
                onToggle={(v) => toggle(me, setMe, v)}
              />
              <AttrPicker
                title="I Am · becoming"
                options={[...ASPIRATIONAL_ATTRIBUTES]}
                selected={iam}
                onToggle={(v) => toggle(iam, setIam, v)}
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
                Learning styles
              </div>
              <div className="flex flex-wrap gap-2">
                {LEARNING_STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(styles, setStyles, s, 3)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium",
                      styles.includes(s)
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={me.length < 1 || iam.length < 1}
              onClick={() => setStep("questions")}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {/* QUESTIONS */}
        {step === "questions" && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">Calibrating questions</h2>
            <p className="text-sm text-zinc-500">
              These fold into the identity block and artist interests.
            </p>
            {QUESTIONS.map((q) => (
              <div key={q.id}>
                <div className="mb-2 text-sm font-medium">{q.prompt}</div>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: opt }))
                      }
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium",
                        answers[q.id] === opt
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("attrs")}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runPipeline()}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running live pipeline…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run full pipeline
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={busy || !cacheMeta?.hasCache}
                onClick={() => runPipeline({ useCache: true })}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-40"
                title="Instant replay of the last successful live run — no API spend"
              >
                <HardDrive className="h-4 w-4" />
                Replay last success
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Live run auto-saves. If APIs flake mid-demo, we fall back to that
              cache automatically — or hit Replay for an instant judge walkthrough.
            </p>
          </section>
        )}

        {/* METHOD */}
        {step === "method" && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">Method graph emerges</h2>
            <p className="text-sm text-zinc-500">
              Deterministic scoring: Me attributes hit method <em>from</em> edges;
              I Am attributes hit method <em>to</em> edges. Highest score wins —
              Groq only writes the rationale, it does not pick the method.
            </p>

            {busy && !result && (
              <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Scoring Me → Method → I Am paths, then calling Groq + Gemini +
                YouTube…
              </div>
            )}

            {result && (
              <>
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-[#0f0f10] p-5 text-white">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    Selected path
                  </div>
                  <div className="mt-2 font-display text-3xl font-bold">
                    {result.steps.methodGraph.selected}
                  </div>
                  <p className="mt-2 max-w-xl text-sm text-zinc-400">
                    {result.steps.methodGraph.blurb}
                  </p>
                  <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-zinc-200">
                    <span className="font-semibold text-white">Groq rationale: </span>
                    {result.steps.methodGraph.rationale}
                  </p>
                </div>

                <div className="space-y-2">
                  {result.steps.methodGraph.ranked
                    .slice(0, Math.max(revealMethod, 1))
                    .map((m, i) => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition",
                          m.id === selectedMethod
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-zinc-50",
                        )}
                        style={{ animationDelay: `${i * 80}ms` }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            {m.id === selectedMethod && (
                              <Check className="h-4 w-4 shrink-0" />
                            )}
                            {m.id}
                          </div>
                          <div
                            className={cn(
                              "mt-0.5 text-xs",
                              m.id === selectedMethod
                                ? "text-zinc-400"
                                : "text-zinc-500",
                            )}
                          >
                            hits: {[...m.fromHits, ...m.toHits].join(", ") || "none"}
                          </div>
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          {m.score}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Simple edge chips */}
                {!!result.steps.methodGraph.edges.length && (
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                      Active graph edges
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.steps.methodGraph.edges
                        .filter((e) => e.from === selectedMethod || e.to === selectedMethod || result.steps.methodGraph.ranked.find((r) => r.id === selectedMethod)?.fromHits.includes(e.from) || result.steps.methodGraph.ranked.find((r) => r.id === selectedMethod)?.toHits.includes(e.to))
                        .slice(0, 12)
                        .map((e, i) => (
                          <span
                            key={`${e.from}-${e.to}-${i}`}
                            className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-700"
                          >
                            {e.from} → {e.to}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <NavButtons
                  onBack={() => setStep("questions")}
                  onNext={() => setStep("identity")}
                  nextLabel="See identity block"
                />
              </>
            )}
          </section>
        )}

        {/* IDENTITY */}
        {step === "identity" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">Identity block (Groq)</h2>
            <p className="text-sm text-zinc-500">
              Attributes + method + answers are compressed into three statements.
              This is the durable psychological summary we store and embed.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Who I am now", result.steps.identityBlock.whoIAmNow],
                ["Who I’m becoming", result.steps.identityBlock.whoIAmBecoming],
                ["How I get there", result.steps.identityBlock.howIGetThere],
              ].map(([t, body]) => (
                <div
                  key={t}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    {t}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-800">
                    {body}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-[#faf9f7] p-4">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                rawText · what gets embedded
              </div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-zinc-700 sm:text-sm">
                {result.steps.identityBlock.rawText}
              </p>
            </div>
            <NavButtons
              onBack={() => setStep("method")}
              onNext={() => setStep("embed")}
              nextLabel="See vector embedding"
            />
          </section>
        )}

        {/* EMBED */}
        {step === "embed" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Embedding · same space for identity & media
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {result.steps.identityQuery.note}
            </p>

            <div className="rounded-2xl bg-zinc-900 p-5 text-white">
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                Live identity query (ranking target)
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                {result.steps.identityQuery.text}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Dimensions"
                value={String(result.steps.embedding.dimensions || "—")}
              />
              <Stat label="Model" value={result.steps.embedding.model} />
              <Stat
                label="Query ‖v‖"
                value={String(result.steps.embedding.queryNorm || result.steps.embedding.blockNorm)}
              />
            </div>

            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                First {sparkBars.length} dimensions (preview of the {result.steps.embedding.dimensions || 768}-d vector)
              </div>
              <div className="flex h-24 items-end gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                {sparkBars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-zinc-900/80"
                    style={{ height: `${Math.max(8, h * 100)}%` }}
                    title={String(
                      result.steps.embedding.queryPreview[i] ??
                        result.steps.embedding.blockPreview[i],
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-400 break-all">
                [
                {(
                  result.steps.embedding.queryPreview.length
                    ? result.steps.embedding.queryPreview
                    : result.steps.embedding.blockPreview
                ).join(", ")}
                , …]
              </p>
            </div>

            <NavButtons
              onBack={() => setStep("identity")}
              onNext={() => setStep("agents")}
              nextLabel="See agent orchestration"
            />
          </section>
        )}

        {/* AGENTS */}
        {step === "agents" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Orchestration (honest labels)
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {result.steps.orchestration.note} Method matching is{" "}
              <span className="font-medium text-zinc-800">rules</span>, not an
              LLM agent — don’t pitch edge-overlap as “agentic.”
            </p>

            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-[#0f0f10] p-5">
              <div className="mb-4 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                LLM / tool roles vs deterministic modules
              </div>
              <div className="flex flex-wrap gap-2">
                {result.steps.orchestration.agents.map((a, i) => {
                  const lit = agentPulse > i;
                  const kind = a.kind ?? "tool";
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "min-w-[140px] flex-1 rounded-xl border px-3 py-3 transition-all duration-500",
                        lit
                          ? "border-white/30 bg-white/10 text-white shadow-[0_0_24px_rgba(255,255,255,0.08)]"
                          : "border-white/5 bg-white/[0.03] text-zinc-600",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                          {a.brain}
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                            kind === "llm"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : kind === "rules"
                                ? "bg-amber-500/20 text-amber-200"
                                : "bg-sky-500/20 text-sky-200",
                          )}
                        >
                          {kind}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold">{a.name}</div>
                      <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                        {a.job}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                Pitch to judges: orchestrated LLM writers + tool retriever +
                deterministic ranker/blocklist — not “every box is an agent.”
              </p>
            </div>

            <NavButtons
              onBack={() => setStep("embed")}
              onNext={() => setStep("search")}
              nextLabel="See web search"
            />
          </section>
        )}

        {/* SEARCH */}
        {step === "search" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Query planner → live web discovery
            </h2>
            <p className="text-sm text-zinc-500">
              Groq’s Query Planner uses Me / I Am / method / stage / learning
              styles (same context as the identity query — not the raw 768-d
              numbers). It writes search strings → Retriever hits YouTube/web.
            </p>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Film search queries used
              </div>
              <div className="flex flex-wrap gap-2">
                {result.steps.discovery.queries.map((q) => (
                  <span
                    key={q}
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700"
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Results returned"
                value={String(result.steps.discovery.candidatesFound)}
              />
              <Stat
                label="Vector shortlist"
                value={String(result.steps.discovery.shortlistSize)}
              />
              <Stat label="Then" value="Rerank all" />
            </div>

            <p className="text-sm leading-relaxed text-zinc-500">
              {result.steps.discovery.shortlistNote} Yes — we compare each
              shortlisted video’s embedded title+description to the{" "}
              <span className="font-medium text-zinc-800">
                live identity-query vector
              </span>
              . Higher cosine ≈ closer semantic fit (should be similar in meaning,
              not identical wording).
            </p>
            <ul className="space-y-2">
              {result.steps.discovery.candidates.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border px-3 py-3",
                    c.shortlisted
                      ? "border-zinc-900 bg-white"
                      : "border-zinc-200 bg-zinc-50/50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug">
                      {c.title}
                      {c.shortlisted && (
                        <span className="ml-2 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          shortlist
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {c.creator}
                    </div>
                  </div>
                  {c.cosine != null && (
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase text-zinc-400">
                        cosine→unit
                      </div>
                      <div className="font-semibold tabular-nums">
                        {c.cosine.toFixed(2)}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <NavButtons
              onBack={() => setStep("agents")}
              onNext={() => setStep("critic")}
              nextLabel="Watch agent loop"
            />
          </section>
        )}

        {/* CRITIC AGENT LOOP */}
        {step === "critic" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Agentic loop — Critic Agent
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {result.steps.agentLoop?.note ??
                "Observe first search → Reason → Decide accept or retry → Act (re-search once). Ranking stays math."}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["1. Observe", result.steps.agentLoop?.observed ?? "—"],
                [
                  "2. Reason",
                  result.steps.agentLoop?.reason ?? "Critic evaluated pass 1",
                ],
                [
                  "3. Decide",
                  (result.steps.agentLoop?.decision ?? "accept").toUpperCase(),
                ],
                [
                  "4. Act",
                  result.steps.agentLoop?.decision === "retry"
                    ? `Re-searched · +${result.steps.agentLoop.pass2Added} new`
                    : "Kept pass 1 · no re-search",
                ],
              ].map(([t, d]) => (
                <div
                  key={t}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    {t}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-800">{d}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 p-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  Pass 1 queries
                </div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {(
                    result.steps.agentLoop?.pass1Queries ??
                    result.steps.discovery.queries
                  ).map((q) => (
                    <li key={q} className="rounded-lg bg-zinc-50 px-2 py-1.5">
                      {q}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-zinc-400">
                  Candidates: {result.steps.agentLoop?.pass1Candidates ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white">
                <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  Critic revised queries
                </div>
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                  {(result.steps.agentLoop?.revisedQueries?.length
                    ? result.steps.agentLoop.revisedQueries
                    : ["(none — accepted pass 1)"]
                  ).map((q) => (
                    <li key={q} className="rounded-lg bg-white/10 px-2 py-1.5">
                      {q}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-zinc-500">
                  Merged pool:{" "}
                  {result.steps.agentLoop?.mergedCandidates ??
                    result.steps.discovery.candidatesFound}
                  {result.steps.agentLoop?.heuristicsTriggered?.length
                    ? ` · signals: ${result.steps.agentLoop.heuristicsTriggered.join(", ")}`
                    : ""}
                </p>
              </div>
            </div>

            <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
              Judge line: this is the agent — it can change what gets searched.
              The hybrid reranker still picks the winner. Max one retry so demos
              stay reliable. If the Critic errors, we fail-open and keep pass 1.
            </p>

            <NavButtons
              onBack={() => setStep("search")}
              onNext={() => setStep("rank")}
              nextLabel="See final ranking"
            />
          </section>
        )}

        {/* RANK */}
        {step === "rank" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Hybrid rerank · the pick is math, not the LLM
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {result.steps.ranking.note}
            </p>

            {result.steps.ranking.top[0] && (
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <MediaPlayer
                  url={result.steps.ranking.top[0].url}
                  title={result.steps.ranking.top[0].title}
                  className="rounded-none"
                />
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    Primary pick · final{" "}
                    {result.steps.ranking.top[0].scores.final.toFixed(3)}
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    {result.steps.ranking.top[0].title}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {result.steps.ranking.top[0].description}
                  </p>
                  <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-800">
                    <span className="font-semibold">Why now (Groq): </span>
                    {result.steps.ranking.whyNow}
                  </p>
                  <ScoreBars scores={result.steps.ranking.top[0].scores} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                Ranked shortlist
              </div>
              {result.steps.ranking.top.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-3"
                >
                  <div className="min-w-0">
                    <span className="mr-2 text-xs text-zinc-400">#{i + 1}</span>
                    <span className="text-sm font-medium">{t.title}</span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-sm">
                    {t.scores.final.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-zinc-900 px-4 py-4 text-sm text-zinc-300">
              Ran in {result.latencyMs}ms · model {result.model}
              {result.fromCache ? " · cached replay" : " · live"}
              . This is the
              same stack as production Home curation — demo just exposes every
              step.
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("critic")}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep("feedback")}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                See feedback loop
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === "feedback" && result && (
          <section className="space-y-6 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              Feedback loop · human in the loop
            </h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {result.steps.feedbackLoop.note}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white">
                <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                  Hard · guaranteed
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-200">
                  Exact video id (`yt_…`) is stored and filtered out before
                  ranking. Search can return it — we drop it. UI removes it now.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  Soft · next run bias
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Live identity query text updates on the <em>next</em> curate
                  (not every click). Biases similar content — not a guarantee.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <div className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="bg-zinc-50 p-4">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    Today’s query (before dislike)
                  </div>
                  <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-zinc-600">
                    {result.steps.identityQuery.text}
                  </p>
                </div>
                <div className="bg-zinc-900 p-4 text-white">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                    Next query if you 1★ the winner
                  </div>
                  <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-zinc-300">
                    {result.steps.feedbackLoop.simulatedAfterDislike
                      ?.nextIdentityQuerySnippet ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-3">
              {result.steps.feedbackLoop.channels.map((c) => (
                <li
                  key={c.signal}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4"
                >
                  <div className="text-sm font-semibold text-zinc-900">
                    {c.signal}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.1em] text-zinc-400">
                    Stored in {c.store}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {c.effect}
                  </p>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950/80 ring-1 ring-amber-200">
              Honest gap: skipped activities are not yet a negative signal —
              only completions reshape the query. Attribute changes force a full
              identity rebuild + recurate.
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("rank")}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setStep("attrs");
                  setAgentPulse(0);
                }}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm"
              >
                Restart demo
              </button>
              <Link
                href="/home"
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Open Vector app
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function AttrPicker({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">
        {title}
      </div>
      <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              selected.includes(o)
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm"
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-semibold">{value}</div>
    </div>
  );
}

function ScoreBars({ scores }: { scores: Record<string, number> }) {
  const rows = [
    ["identityFit", "Identity fit"],
    ["stageFit", "Stage / duration"],
    ["potential", "Potential"],
    ["novelty", "Novelty"],
    ["antiAttention", "Anti-clickbait"],
    ["final", "Final"],
  ] as const;
  return (
    <div className="space-y-2">
      {rows.map(([k, label]) => {
        const v = scores[k];
        if (typeof v !== "number") return null;
        const pct = Math.round(Math.max(0, Math.min(1, v)) * 100);
        return (
          <div key={k}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-zinc-600">{label}</span>
              <span className="font-semibold tabular-nums">{pct}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  k === "final" ? "bg-zinc-900" : "bg-zinc-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
