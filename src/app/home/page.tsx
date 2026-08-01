"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPanel } from "@/components/StatusPanel";
import { MediaPlayer } from "@/components/MediaPlayer";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
};

type BriefingPayload = {
  path: {
    id: string;
    me_labels: string[];
    iam_labels: string[];
    method: string;
    method_rationale: string | null;
    day_number: number;
    total_days: number;
  };
  briefing: {
    primary: {
      id: string;
      title: string;
      description: string;
      media_type: string;
      thumbnail_url?: string | null;
      url?: string | null;
      duration_minutes?: number | null;
      creator?: string | null;
      why?: string;
      scores?: Record<string, number>;
    };
    secondary: Array<{
      id: string;
      title: string;
      media_type: string;
      thumbnail_url?: string | null;
      description: string;
      url?: string | null;
      creator?: string | null;
    }>;
    activity: Activity | null;
    activities?: Activity[];
    reason: string;
    whyNow: string;
    discovery?: {
      source: string;
      candidatesFound: number;
    };
    trace?: {
      stage: string;
      retrieved: number;
      latencyMs: number;
      model: string;
      discoverySource?: string;
    };
  };
};

export default function HomePage() {
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [data, setData] = useState<BriefingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [reflection, setReflection] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({
    curated: "0",
    global: "0",
    experts: "0",
    activities: "0",
  });
  const checkInRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    setName(profile?.display_name ?? user.email?.split("@")[0] ?? null);
    setAvatarUrl(profile?.avatar_url ?? null);

    if (!profile?.onboarding_complete) {
      window.location.href = "/onboarding";
      return;
    }

    const { count: viewed } = await supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("action", ["viewed", "completed", "resonated"]);

    const { count: doneActs } = await supabase
      .from("interactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "completed")
      .not("activity_id", "is", null);

    const { count: pathCount } = await supabase
      .from("paths")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setStats({
      curated: `${viewed ?? 0}`,
      global: `${viewed ?? 0}`,
      experts: `${pathCount ?? 0} paths`,
      activities: `${doneActs ?? 0}`,
    });

    const res = await fetch("/api/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load today’s briefing");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function interact(
    action: string,
    mediaId?: string,
    activityId?: string,
  ) {
    if (!data) return;
    await fetch("/api/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        mediaId,
        activityId,
        pathId: data.path.id,
      }),
    });
  }

  async function submitCheckIn() {
    if (!checkIn.trim() || !data) return;
    setBusy(true);
    const res = await fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: checkIn, pathId: data.path.id }),
    });
    const json = await res.json();
    setBusy(false);
    if (res.ok) {
      setReflection(json.reflection);
      setCheckIn("");
    }
  }

  const progress = data
    ? Math.min(100, (data.path.day_number / data.path.total_days) * 100)
    : 4;

  const activities =
    data?.briefing.activities?.length
      ? data.briefing.activities
      : data?.briefing.activity
        ? [data.briefing.activity]
        : [];

  return (
    <DashboardShell
      name={name}
      avatarUrl={avatarUrl}
      title="Today"
      notifications={[
        {
          id: "briefing",
          title: data ? "Briefing ready" : "Curating…",
          body: data
            ? `${data.briefing.discovery?.candidatesFound ?? data.briefing.trace?.retrieved ?? 0} web candidates ranked for ${data.path.method}.`
            : "Searching the web for your path.",
          href: "/home",
          time: "Today",
        },
        {
          id: "activities",
          title: "Activities adapt the agent",
          body: "Mark done to bias tomorrow’s discovery toward what you practiced.",
          href: "/home",
          time: "Tip",
        },
        {
          id: "settings",
          title: "Attributes drive ranking",
          body: "Change Me / I Am in Settings to rebuild method + media.",
          href: "/settings",
          time: "Tip",
        },
      ]}
      rightPanel={
        data ? (
          <StatusPanel
            pathLabel={`${data.path.me_labels[0]} → ${data.path.iam_labels[0]} · ${data.path.method}`}
            dayNumber={data.path.day_number}
            onCheckInClick={() => {
              setShowCheckIn(true);
              setTimeout(() => checkInRef.current?.focus(), 50);
            }}
            stats={stats}
            activities={activities}
            onMarkDone={async (id) => {
              const act = activities.find((a) => a.id === id);
              await interact("completed", undefined, id);
              if (act?.title && data) {
                await fetch("/api/check-in", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    body: `Completed activity: ${act.title}${act.category ? ` (${act.category})` : ""}`,
                    pathId: data.path.id,
                  }),
                });
              }
            }}
            onRefresh={() => load(true)}
          />
        ) : undefined
      }
    >
      {loading && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-zinc-900" />
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Searching the web and ranking for your path…
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => load(true)}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              Retry search
            </button>
            <Link
              href="/paths"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm"
            >
              Manage paths
            </Link>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  Today&apos;s briefing
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Hey, {name || "there"}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/paths"
                  className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
                >
                  Switch path
                </Link>
                <button
                  onClick={() => load(true)}
                  className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Recurate from web
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                  Better than
                </div>
                <div className="mt-1 font-semibold leading-snug">
                  {data.path.me_labels.join(", ")}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-100 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500/70">
                  Through
                </div>
                <div className="mt-1 font-semibold leading-snug">
                  {data.path.method}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                  Becoming
                </div>
                <div className="mt-1 font-semibold leading-snug">
                  {data.path.iam_labels.join(", ")}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px] text-zinc-400">
                <span>
                  Day {data.path.day_number} / {data.path.total_days}
                </span>
                <span>
                  {data.briefing.discovery?.candidatesFound ??
                    data.briefing.trace?.retrieved ??
                    0}{" "}
                  web candidates ranked
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>
              {data.path.method_rationale && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {data.path.method_rationale}
                </p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                Primary pick · live from the web
              </div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Watch this now
              </h2>
            </div>
            <MediaPlayer
              url={data.briefing.primary.url}
              title={data.briefing.primary.title}
              className="rounded-none"
            />
            <div className="p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-700">
                  {data.briefing.primary.media_type}
                </span>
                {data.briefing.primary.creator && (
                  <span className="text-xs text-zinc-400">
                    {data.briefing.primary.creator}
                  </span>
                )}
                {data.briefing.primary.duration_minutes && (
                  <span className="text-xs text-zinc-400">
                    {data.briefing.primary.duration_minutes} min
                  </span>
                )}
                {data.briefing.primary.scores?.final != null && (
                  <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-white">
                    potential{" "}
                    {Number(data.briefing.primary.scores.final).toFixed(2)}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight">
                {data.briefing.primary.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {data.briefing.primary.description}
              </p>
              <p className="mt-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-800">
                <span className="font-semibold text-zinc-900">Why now: </span>
                {data.briefing.whyNow || data.briefing.primary.why}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["viewed", "Mark viewed", "bg-zinc-900 text-white border-zinc-900"],
                  ["resonated", "Resonated", ""],
                  ["not_today", "Not today", "text-zinc-500"],
                  ["not_for_me", "Not for me", "text-zinc-500"],
                ].map(([action, label, cls]) => (
                  <button
                    key={action}
                    onClick={() =>
                      interact(action, data.briefing.primary.id)
                    }
                    className={`rounded-full border border-zinc-200 px-4 py-2 text-sm ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {(showCheckIn || reflection) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <h3 className="text-lg font-semibold">Check-in</h3>
              <textarea
                ref={checkInRef}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                rows={3}
                placeholder="What did you practice today?"
                className="mt-3 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none ring-zinc-900 focus:ring-2"
              />
              <button
                onClick={submitCheckIn}
                disabled={busy || !checkIn.trim()}
                className="mt-3 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Listening…" : "Reflect"}
              </button>
              {reflection && (
                <p className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-zinc-700">
                  {reflection}
                </p>
              )}
            </section>
          )}

          {data.briefing.secondary.length > 0 && (
            <section>
              <div className="mb-3 flex items-end justify-between">
                <h3 className="text-lg font-semibold tracking-tight">
                  Also ranked for you
                </h3>
                <Link href="/media" className="text-sm text-zinc-700 underline-offset-2 hover:underline">
                  Browse all types
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.briefing.secondary.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                  >
                    <MediaPlayer
                      url={item.url}
                      title={item.title}
                      className="rounded-none"
                    />
                    <div className="p-3">
                      <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                        {item.media_type}
                        {item.creator ? ` · ${item.creator}` : ""}
                      </div>
                      <h4 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                        {item.title}
                      </h4>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {data.briefing.trace && (
            <details className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
              <summary className="cursor-pointer font-medium text-zinc-700">
                Agent trace · how this was chosen
              </summary>
              <ul className="mt-3 space-y-1">
                <li>Stage: {data.briefing.trace.stage}</li>
                <li>Retrieved from web: {data.briefing.trace.retrieved}</li>
                <li>Latency: {data.briefing.trace.latencyMs}ms</li>
                <li>Stack: {data.briefing.trace.model}</li>
                {data.briefing.trace.discoverySource && (
                  <li>Sources: {data.briefing.trace.discoverySource}</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
