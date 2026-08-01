"use client";

import { CheckCircle2, Flame, Film, Globe, RefreshCw, Users } from "lucide-react";

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
  activity,
  onMarkDone,
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
  activity?: Activity | null;
  onMarkDone?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="sticky top-4 space-y-4">
      <div className="rounded-3xl bg-zinc-900 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>You&apos;re currently at</span>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <h2 className="mt-2 text-[17px] font-semibold leading-snug tracking-tight">
          {dayNumber} days on path {pathLabel}
        </h2>

        <button
          type="button"
          onClick={onCheckInClick}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-zinc-800 px-3 py-3 text-left transition hover:bg-zinc-700"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100/90 text-zinc-900">
            ✦
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-zinc-400">Today&apos;s check-in</div>
            <div className="truncate text-sm">
              {checkInPrompt || "Have you spent a moment on your practice?"}
            </div>
          </div>
          <div className="flex items-center gap-1 text-orange-400">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-semibold">{Math.max(1, dayNumber)}</span>
          </div>
        </button>

        <ul className="mt-5 space-y-3">
          {[
            { icon: Film, label: "Curated Media", value: stats.curated, color: "bg-sky-400/20 text-sky-300" },
            { icon: Globe, label: "Global Media Viewed", value: stats.global, color: "bg-indigo-400/20 text-indigo-300" },
            { icon: Users, label: "Expert consultation", value: stats.experts, color: "bg-fuchsia-400/20 text-fuchsia-300" },
            { icon: CheckCircle2, label: "Activities completed", value: stats.activities, color: "bg-emerald-400/20 text-emerald-300" },
          ].map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.label} className="flex items-center gap-3 text-sm">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${row.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex-1 text-zinc-200">{row.label}</span>
                <span className="tabular-nums text-zinc-400">{row.value}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-3xl bg-zinc-900 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400">Suggested activities</div>
            <div className="mt-1 text-lg font-semibold">Give it a shot</div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {activity ? (
          <div className="mt-4 rounded-2xl bg-zinc-800 p-3">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">
              {activity.category || "Practice"}
            </div>
            <div className="mt-1 text-sm font-medium leading-snug">
              {activity.title}
            </div>
            {activity.description && (
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {activity.description}
              </p>
            )}
            <button
              type="button"
              onClick={onMarkDone}
              className="mt-3 w-full rounded-full bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Mark done
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-400">No activity suggested yet.</p>
        )}
      </div>
    </div>
  );
}
