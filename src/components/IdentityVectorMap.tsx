"use client";

import { useState } from "react";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ScoreMap = {
  identityFit?: number;
  stageFit?: number;
  potential?: number;
  novelty?: number;
  antiAttention?: number;
  final?: number;
};

/**
 * Identity Vector Map + Score Lens
 * Frontend-only differentiator vs typical growth apps:
 * shows the Me → Method → I Am vector and the potential-score breakdown
 * so users see *why* a pick ranked — not just a opaque feed.
 */
export function IdentityVectorMap({
  me,
  iam,
  method,
  dayNumber,
  totalDays,
  scores,
  mediaTitle,
}: {
  me: string[];
  iam: string[];
  method: string;
  dayNumber: number;
  totalDays: number;
  scores?: ScoreMap | null;
  mediaTitle?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const progress = Math.min(100, (dayNumber / Math.max(1, totalDays)) * 100);

  const bars: { key: keyof ScoreMap; label: string; hint: string }[] = [
    { key: "identityFit", label: "Identity fit", hint: "Match to Me → I Am" },
    { key: "stageFit", label: "Stage fit", hint: "Length & journey day" },
    { key: "potential", label: "Potential", hint: "Growth over dopamine" },
    { key: "novelty", label: "Novelty", hint: "Not already seen" },
    { key: "antiAttention", label: "Anti-clickbait", hint: "Penalizes hype" },
    { key: "final", label: "Final rank", hint: "Hybrid reranker output" },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              Identity vector · real reranker scores
            </div>
            <div className="text-sm font-semibold text-zinc-900">
              Me → Method → I Am, plus today’s pick score breakdown
            </div>
          </div>
        </div>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-zinc-100 px-4 pb-5 pt-4 sm:px-5">
          {/* Me → Method → I Am visual */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                Me · now
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {me.slice(0, 4).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <ArrowRight className="mx-auto hidden h-4 w-4 text-zinc-300 sm:block" />

            <div className="rounded-xl bg-zinc-900 p-3 text-white">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                Method · vector
              </div>
              <div className="mt-1.5 text-sm font-semibold leading-snug">
                {method}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${Math.max(progress, 4)}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-zinc-400">
                Day {dayNumber} / {totalDays}
              </div>
            </div>

            <ArrowRight className="mx-auto hidden h-4 w-4 text-zinc-300 sm:block" />

            <div className="rounded-xl bg-zinc-50 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                I Am · becoming
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {iam.slice(0, 4).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Score Lens — attention apps hide this; Vector shows it */}
          {scores && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                <Eye className="h-3.5 w-3.5" />
                Score lens
                {mediaTitle ? (
                  <span className="normal-case tracking-normal text-zinc-500">
                    · {mediaTitle}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2.5">
                {bars.map(({ key, label, hint }) => {
                  const raw = scores[key];
                  if (typeof raw !== "number") return null;
                  const pct = Math.round(clamp01(raw) * 100);
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-zinc-700">
                          {label}
                        </span>
                        <span className="text-[11px] text-zinc-400">{hint}</span>
                        <span className="text-xs font-semibold tabular-nums text-zinc-900">
                          {pct}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            key === "final" ? "bg-zinc-900" : "bg-zinc-400",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                These bars are <span className="font-medium text-zinc-700">not decoration</span> —
                they are the hybrid reranker outputs for today’s primary pick
                (identity fit, duration/stage, potential, novelty, anti-clickbait,
                final). Same numbers the agent used to choose the video.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
