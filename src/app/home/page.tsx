"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPanel } from "@/components/StatusPanel";
import { MediaPlayer } from "@/components/MediaPlayer";
import { createClient } from "@/lib/supabase/client";

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
    }>;
    activity: {
      id: string;
      title: string;
      description: string | null;
      category: string | null;
    } | null;
    reason: string;
    whyNow: string;
    trace?: {
      stage: string;
      retrieved: number;
      latencyMs: number;
      model: string;
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
    curated: "0 of 16",
    global: "0 of 16",
    experts: "0 of 4",
    activities: "0 of 8",
  });
  const checkInRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

    setStats({
      curated: `${viewed ?? 0} of 16`,
      global: `${viewed ?? 0} of 16`,
      experts: "0 of 4",
      activities: `${doneActs ?? 0} of 8`,
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
    if (action === "viewed" || action === "completed" || action === "resonated") {
      load(false);
    }
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

  return (
    <DashboardShell
      name={name}
      avatarUrl={avatarUrl}
      rightPanel={
        data ? (
          <StatusPanel
            pathLabel={`${data.path.me_labels[0]} to ${data.path.iam_labels[0]} through ${data.path.method}`}
            dayNumber={data.path.day_number}
            onCheckInClick={() => {
              setShowCheckIn(true);
              setTimeout(() => checkInRef.current?.focus(), 50);
            }}
            stats={stats}
            activity={data.briefing.activity}
            onMarkDone={() =>
              data.briefing.activity &&
              interact("completed", undefined, data.briefing.activity.id)
            }
            onRefresh={() => load(true)}
          />
        ) : undefined
      }
    >
      {loading && (
        <div className="rounded-2xl bg-zinc-50 px-6 py-16 text-center text-zinc-500">
          Curating today’s focus…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => load(true)}
            className="mt-4 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8">
          <section>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Hey, {name || "there"}
            </h1>

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 md:p-5">
              <div className="grid gap-3 md:grid-cols-3 md:gap-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                    I am
                  </div>
                  <div className="mt-1 text-lg font-semibold leading-snug">
                    {data.path.iam_labels.join(", ")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                    Through
                  </div>
                  <div className="mt-1 text-lg font-semibold leading-snug">
                    {data.path.method}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                    Better than
                  </div>
                  <div className="mt-1 text-lg font-semibold leading-snug">
                    {data.path.me_labels.join(", ")}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  <span>Me</span>
                  <span>
                    Day {data.path.day_number} / {data.path.total_days}
                  </span>
                  <span>I Am</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all"
                    style={{ width: `${Math.max(progress, 3)}%` }}
                  />
                </div>
              </div>
              {data.path.method_rationale && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                  {data.path.method_rationale}
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                  Today&apos;s growth focus
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  One piece. Right now.
                </h2>
              </div>
              <button
                onClick={() => load(true)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
              >
                Recurate
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <MediaPlayer
                url={data.briefing.primary.url}
                title={data.briefing.primary.title}
                className="rounded-none"
              />
              <div className="p-5 md:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-sky-700">
                    {data.briefing.primary.media_type}
                  </span>
                  {data.briefing.primary.duration_minutes && (
                    <span className="text-xs text-zinc-400">
                      {data.briefing.primary.duration_minutes} min
                    </span>
                  )}
                  {data.briefing.primary.scores?.final != null && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
                      potential{" "}
                      {Number(data.briefing.primary.scores.final).toFixed(2)}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {data.briefing.primary.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {data.briefing.primary.description}
                </p>
                <p className="mt-4 rounded-2xl bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed text-zinc-800">
                  <span className="font-semibold text-emerald-800">Why now: </span>
                  {data.briefing.whyNow || data.briefing.primary.why}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => interact("viewed", data.briefing.primary.id)}
                    className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Mark viewed
                  </button>
                  <button
                    onClick={() =>
                      interact("resonated", data.briefing.primary.id)
                    }
                    className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm"
                  >
                    Resonated
                  </button>
                  <button
                    onClick={() =>
                      interact("not_today", data.briefing.primary.id)
                    }
                    className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500"
                  >
                    Not today
                  </button>
                  <button
                    onClick={() =>
                      interact("not_for_me", data.briefing.primary.id)
                    }
                    className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500"
                  >
                    Not for me
                  </button>
                </div>
              </div>
            </div>
          </section>

          {(showCheckIn || reflection) && (
            <section className="rounded-3xl border border-zinc-200 p-5">
              <h3 className="text-lg font-semibold">Today&apos;s check-in</h3>
              <textarea
                ref={checkInRef}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                rows={3}
                placeholder="Have you spent a moment on your practice today?"
                className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none ring-zinc-900 focus:ring-2"
              />
              <button
                onClick={submitCheckIn}
                disabled={busy || !checkIn.trim()}
                className="mt-3 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Listening…" : "Reflect"}
              </button>
              {reflection && (
                <p className="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-zinc-700">
                  {reflection}
                </p>
              )}
            </section>
          )}

          {data.briefing.secondary.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold tracking-tight">
                Also fitting today
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                    <div className="p-4">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                        {item.media_type}
                      </div>
                      <h4 className="mt-1 font-semibold leading-snug">
                        {item.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {data.briefing.trace && (
            <details className="rounded-2xl border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
              <summary className="cursor-pointer font-medium text-zinc-700">
                Agent trace
              </summary>
              <ul className="mt-3 space-y-1">
                <li>Stage: {data.briefing.trace.stage}</li>
                <li>Retrieved: {data.briefing.trace.retrieved}</li>
                <li>Latency: {data.briefing.trace.latencyMs}ms</li>
                <li>Model: {data.briefing.trace.model}</li>
              </ul>
            </details>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
