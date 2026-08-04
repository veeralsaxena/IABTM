"use client";

import { useState } from "react";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverExplain } from "@/components/HoverExplain";

type ScoreMap = {
  identityFit?: number;
  stageFit?: number;
  potential?: number;
  novelty?: number;
  antiAttention?: number;
  final?: number;
};

const SCORE_EXPLAIN: Record<
  keyof ScoreMap,
  { label: string; hint: string; explain: string }
> = {
  identityFit: {
    label: "Identity fit",
    hint: "Match to Me → I Am",
    explain:
      "NOT pure magic. If Gemini embeddings ran: 75% cosine(identity embed, media embed) + 25% word overlap with Me/I Am/method. If embeddings failed: word overlap only. Uses vectors when available.",
  },
  stageFit: {
    label: "Stage fit",
    hint: "Length & journey day",
    explain:
      "NOT a vector. Rule on video length vs journey: early path or returner (≥2 days away) prefers ≤12 min (score 1), ≤20 (0.7), else 0.35. Middle/late prefers 5–25 min. Long videos get cut for returners. Stored as stageFit in the UI.",
  },
  potential: {
    label: "Potential",
    hint: "Growth over dopamine",
    explain:
      "NOT a separate model. Blend: 50% identityFit + 20% semanticProxy (vector/query overlap) + 15% duration/stage + 15% feedback (likes/dislikes). Favors growth fit over clickbait.",
  },
  novelty: {
    label: "Novelty",
    hint: "Not already seen",
    explain:
      "NOT a vector. Binary-ish rule: 1.0 if this media id was never seen / not hard-blocked; 0.15 if you already watched it or marked Don’t show again. Keeps the feed from repeating.",
  },
  antiAttention: {
    label: "Anti-clickbait",
    hint: "Penalizes hype",
    explain:
      "NOT a vector. Regex on title/description (“shocking”, “overnight”, “hack your brain”…). Clean → 0.9; clickbait hit → 0.25. Explicitly anti–attention-economy.",
  },
  final: {
    label: "Final rank",
    hint: "Hybrid reranker output",
    explain:
      "Weighted sum that sorts the list. With vectors: ~30% identity + 16% semantic + 12% method + 10% duration + 8% learning-style + 8% novelty + 8% anti-clickbait + 8% feedback. Highest final = today’s primary pick.",
  },
};

/**
 * Identity Vector Map + Score Lens
 * Hover any score for the exact calculation (judge-ready).
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
              Me → Method → I Am · hover bars for how each score is calculated
            </div>
          </div>
        </div>
        <span className="text-xs text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-zinc-100 px-4 pb-5 pt-4 sm:px-5">
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

          {scores && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                <Eye className="h-3.5 w-3.5" />
                Score lens · hover any row
                {mediaTitle ? (
                  <span className="normal-case tracking-normal text-zinc-500">
                    · {mediaTitle}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2.5">
                {(Object.keys(SCORE_EXPLAIN) as Array<keyof ScoreMap>).map(
                  (key) => {
                    const meta = SCORE_EXPLAIN[key];
                    const raw = scores[key];
                    if (typeof raw !== "number") return null;
                    const pct = Math.round(clamp01(raw) * 100);
                    return (
                      <HoverExplain
                        key={key}
                        label={meta.label}
                        explain={meta.explain}
                        className="block w-full"
                        side="bottom"
                      >
                        <div className="w-full cursor-help rounded-lg px-1 py-0.5 hover:bg-zinc-50">
                          <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-700 underline decoration-dotted decoration-zinc-300 underline-offset-2">
                              {meta.label}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {meta.hint}
                            </span>
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
                      </HoverExplain>
                    );
                  },
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Only <strong className="font-medium text-zinc-700">identity fit</strong>{" "}
                (and part of potential) uses embeddings. Novelty, stage/duration,
                and anti-clickbait are explicit rules — by design, so we can explain them.
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
