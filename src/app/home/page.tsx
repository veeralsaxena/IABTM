"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";

type BriefingPayload = {
  cached?: boolean;
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
      creator?: string | null;
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
      ranked: Array<{ title: string; final: number }>;
      latencyMs: number;
      model: string;
    };
  };
};

export default function HomePage() {
  const [name, setName] = useState<string | null>(null);
  const [data, setData] = useState<BriefingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [reflection, setReflection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      .select("display_name, onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    setName(profile?.display_name ?? user.email?.split("@")[0] ?? null);

    if (!profile?.onboarding_complete) {
      window.location.href = "/onboarding";
      return;
    }

    const res = await fetch("/api/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not curate today");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function interact(action: string, mediaId?: string, activityId?: string) {
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
    : 0;

  return (
    <AppShell name={name}>
      {loading && (
        <div className="reveal grain-panel rounded-2xl p-10 text-center text-ink-soft">
          Running identity → retrieve → score → explain…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[var(--danger)]/30 bg-red-50 p-6">
          <p className="text-[var(--danger)]">{error}</p>
          <p className="mt-2 text-sm text-ink-soft">
            If the catalog is empty, run the seed script. Or{" "}
            <Link href="/onboarding" className="underline">
              rebuild your path
            </Link>
            .
          </p>
          <button
            onClick={() => load(true)}
            className="btn-primary mt-4 rounded-full px-4 py-2 text-sm"
          >
            Retry curation
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8">
          <section className="reveal">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              Hey{name ? `, ${name}` : ""}
            </p>
            <h1 className="font-display mt-2 text-4xl font-bold text-ink md:text-5xl">
              I am{" "}
              <span className="text-accent">{data.path.iam_labels[0]}</span>
            </h1>
            <p className="mt-2 text-ink-soft">
              Better than{" "}
              <span className="text-ink">{data.path.me_labels.join(", ")}</span>{" "}
              through{" "}
              <span className="font-semibold text-signal">
                {data.path.method}
              </span>
            </p>

            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs uppercase tracking-[0.14em] text-ink-soft">
                <span>Me</span>
                <span>
                  Day {data.path.day_number} / {data.path.total_days}
                </span>
                <span>I Am</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mist">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-signal to-accent transition-all duration-700"
                  style={{ width: `${Math.max(progress, 4)}%` }}
                />
              </div>
            </div>
            {data.path.method_rationale && (
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-soft">
                {data.path.method_rationale}
              </p>
            )}
          </section>

          <section className="reveal grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="grain-panel overflow-hidden rounded-[1.75rem]">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Today&apos;s growth focus
                  </div>
                  <div className="font-display text-xl font-semibold text-ink">
                    One piece. Right now.
                  </div>
                </div>
                <button
                  onClick={() => load(true)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft hover:border-ink hover:text-ink"
                >
                  Recurate
                </button>
              </div>

              {data.briefing.primary.thumbnail_url && (
                <div className="relative aspect-[16/9] w-full">
                  <Image
                    src={data.briefing.primary.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 60vw"
                  />
                </div>
              )}

              <div className="p-5 md:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-signal-soft px-2.5 py-1 text-xs uppercase tracking-[0.12em] text-signal">
                    {data.briefing.primary.media_type}
                  </span>
                  {data.briefing.primary.duration_minutes && (
                    <span className="text-xs text-ink-soft">
                      {data.briefing.primary.duration_minutes} min
                    </span>
                  )}
                  {data.briefing.primary.scores?.final != null && (
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">
                      potential{" "}
                      {Number(data.briefing.primary.scores.final).toFixed(2)}
                    </span>
                  )}
                </div>
                <h2 className="font-display text-3xl font-semibold text-ink">
                  {data.briefing.primary.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {data.briefing.primary.description}
                </p>
                <p className="mt-4 rounded-xl bg-accent-soft/60 px-4 py-3 text-sm leading-relaxed text-ink">
                  <span className="font-semibold text-accent">Why now: </span>
                  {data.briefing.whyNow || data.briefing.primary.why}
                </p>
                <p className="mt-3 text-sm text-ink-soft">{data.briefing.reason}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {data.briefing.primary.url && (
                    <a
                      href={data.briefing.primary.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        interact("viewed", data.briefing.primary.id)
                      }
                      className="btn-primary rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      Open media
                    </a>
                  )}
                  <button
                    onClick={() =>
                      interact("resonated", data.briefing.primary.id)
                    }
                    className="rounded-full border border-line px-4 py-2.5 text-sm"
                  >
                    Resonated
                  </button>
                  <button
                    onClick={() =>
                      interact("not_today", data.briefing.primary.id)
                    }
                    className="rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft"
                  >
                    Not today
                  </button>
                  <button
                    onClick={() =>
                      interact("not_for_me", data.briefing.primary.id)
                    }
                    className="rounded-full border border-line px-4 py-2.5 text-sm text-ink-soft"
                  >
                    Not for me
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grain-panel rounded-[1.5rem] p-5">
                <div className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                  Today&apos;s check-in
                </div>
                <textarea
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  rows={4}
                  placeholder="Have you spent a moment on your becoming today?"
                  className="mt-3 w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
                />
                <button
                  onClick={submitCheckIn}
                  disabled={busy || !checkIn.trim()}
                  className="btn-primary mt-3 w-full rounded-full py-2.5 text-sm font-semibold"
                >
                  {busy ? "Listening…" : "Reflect"}
                </button>
                {reflection && (
                  <p className="mt-3 rounded-xl bg-signal-soft/70 px-3 py-2 text-sm text-ink">
                    {reflection}
                  </p>
                )}
              </div>

              {data.briefing.activity && (
                <div className="grain-panel rounded-[1.5rem] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                    Suggested activity
                  </div>
                  <h3 className="font-display mt-2 text-xl font-semibold text-ink">
                    {data.briefing.activity.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {data.briefing.activity.description}
                  </p>
                  <button
                    onClick={() =>
                      interact(
                        "completed",
                        undefined,
                        data.briefing.activity!.id,
                      )
                    }
                    className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper-elevated"
                  >
                    Mark done
                  </button>
                </div>
              )}

              {data.briefing.trace && (
                <div className="rounded-[1.5rem] border border-dashed border-line p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-signal">
                    Agent trace
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                    <li>Stage: {data.briefing.trace.stage}</li>
                    <li>Retrieved: {data.briefing.trace.retrieved}</li>
                    <li>Latency: {data.briefing.trace.latencyMs}ms</li>
                    <li className="truncate">Model: {data.briefing.trace.model}</li>
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-display text-2xl font-semibold text-ink">
              Also fitting today
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {data.briefing.secondary.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-line bg-paper-elevated/80"
                >
                  {item.thumbnail_url && (
                    <div className="relative aspect-[16/10] w-full">
                      <Image
                        src={item.thumbnail_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                      {item.media_type}
                    </div>
                    <h4 className="mt-1 font-semibold text-ink">{item.title}</h4>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
