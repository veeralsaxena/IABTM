"use client";

import {
  CheckCircle2,
  Flame,
  Film,
  Globe,
  RefreshCw,
  Trees,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
};

export function StatusPanel({
  pathLabel,
  dayNumber,
  checkInPrompt,
  onCheckInClick,
  stats,
  activities = [],
  onMarkDone,
  onSkip,
  onRefresh,
}: {
  pathLabel: string;
  dayNumber: number;
  checkInPrompt?: string;
  onCheckInClick?: () => void;
  stats: {
    curated: string;
    global: string;
    experts: string;
    activities: string;
  };
  activities?: Activity[];
  onMarkDone?: (activityId: string) => void | Promise<void>;
  onSkip?: (activityId: string) => void | Promise<void>;
  onRefresh?: () => void;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  async function mark(id: string) {
    if (done.has(id) || skipped.has(id) || busyId) return;
    setBusyId(id);
    try {
      await onMarkDone?.(id);
      setDone((prev) => new Set(prev).add(id));
    } finally {
      setBusyId(null);
    }
  }

  async function skip(id: string) {
    if (done.has(id) || skipped.has(id) || busyId) return;
    setBusyId(id);
    try {
      await onSkip?.(id);
      setSkipped((prev) => new Set(prev).add(id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="sticky top-3 space-y-3">
      <div className="rounded-2xl bg-[#171717] p-4 text-white shadow-md">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Active path</span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <h2 className="mt-2 text-[15px] font-semibold leading-snug tracking-tight">
          Day {dayNumber} · {pathLabel}
        </h2>

        <button
          type="button"
          onClick={onCheckInClick}
          className="mt-3 flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-zinc-900">
            ✦
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-zinc-400">Check-in</div>
            <div className="truncate text-sm">
              {checkInPrompt || "Did you practice today?"}
            </div>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold">{Math.max(1, dayNumber)}</span>
          </div>
        </button>

        <ul className="mt-4 space-y-2.5">
          {[
            {
              icon: Film,
              label: "Media engaged",
              value: stats.curated,
              color: "bg-sky-400/20 text-sky-300",
            },
            {
              icon: Globe,
              label: "Web discoveries",
              value: stats.global,
              color: "bg-zinc-500/30 text-zinc-200",
            },
            {
              icon: Users,
              label: "Mentors found",
              value: stats.experts,
              color: "bg-violet-400/20 text-violet-300",
            },
            {
              icon: CheckCircle2,
              label: "Activities done",
              value: `${Number(stats.activities) + done.size}`,
              color: "bg-emerald-400/20 text-emerald-300",
            },
          ].map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.label} className="flex items-center gap-3 text-sm">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${row.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="flex-1 text-zinc-200">{row.label}</span>
                <span className="tabular-nums text-zinc-400">{row.value}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl bg-[#171717] p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">Do these next</div>
            <div className="mt-0.5 text-base font-semibold">Activities</div>
          </div>
          <Trees className="h-4 w-4 text-zinc-300" />
        </div>

        <div className="mt-3 space-y-2">
          {activities.length ? (
            activities.map((activity) => {
              const isDone = done.has(activity.id);
              const isSkipped = skipped.has(activity.id);
              return (
                <div
                  key={activity.id}
                  className={cn(
                    "rounded-xl bg-white/5 p-3 transition",
                    (isDone || isSkipped) && "opacity-60",
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                    {activity.category || "Practice"}
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-sm font-medium leading-snug",
                      (isDone || isSkipped) && "line-through",
                    )}
                  >
                    {activity.title}
                  </div>
                  {activity.description && (
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {activity.description}
                    </p>
                  )}
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      disabled={isDone || isSkipped || busyId === activity.id}
                      onClick={() => mark(activity.id)}
                      className={cn(
                        "flex-1 rounded-full py-1.5 text-xs font-semibold",
                        isDone
                          ? "bg-white/10 text-zinc-300"
                          : "bg-white text-zinc-900 hover:bg-zinc-100",
                      )}
                    >
                      {isDone
                        ? "Done ✓"
                        : busyId === activity.id
                          ? "…"
                          : "Mark done"}
                    </button>
                    <button
                      type="button"
                      disabled={isDone || isSkipped || busyId === activity.id}
                      onClick={() => skip(activity.id)}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      {isSkipped ? "Skipped" : "Skip"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-zinc-400">No activities yet — recurate.</p>
          )}
        </div>
      </div>
    </div>
  );
}
