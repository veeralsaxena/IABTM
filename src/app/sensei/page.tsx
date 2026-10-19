"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import type { PathRecord } from "@/types";
import type { SenseiDay, SenseiEventKind } from "@/lib/sensei/engine";

type Payload = {
  name: string | null;
  path: PathRecord;
  day: SenseiDay;
  elevenLabsConfigured: boolean;
};

function speakBrowser(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export default function SenseiPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/sensei");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load Sensei");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function log(kind: SenseiEventKind) {
    setBusy(true);
    const res = await fetch("/api/sensei", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not log");
      return;
    }
    await load();
  }

  async function playViz() {
    if (!data) return;
    const script = data.day.twoTracks.subconscious.visualization.script;
    setPlaying(true);
    try {
      const res = await fetch("/api/sensei/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script }),
      });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        audioRef.current?.pause();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPlaying(false);
        await audio.play();
      } else {
        speakBrowser(script);
        setTimeout(() => setPlaying(false), 8000);
      }
    } catch {
      speakBrowser(script);
      setPlaying(false);
    }
    await log("viz");
  }

  const day = data?.day;
  const path = data?.path;
  const licensed = day?.twoTracks.subconscious.licensed;
  const practice = day?.twoTracks.action.primary;

  return (
    <DashboardShell
      name={data?.name ?? null}
      title="Sensei"
      rightPanel={
        day ? (
          <div className="space-y-4 p-1 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                This week
              </div>
              <div className="mt-1 font-display text-2xl font-bold">
                {day.week.hits}/{day.week.target}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{day.contract.label}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900"
                style={{
                  width: `${Math.min(100, (day.week.hits / Math.max(1, day.week.target)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Freezes left: {day.week.freezesLeft}. Missed days do not shame
              you. Offline practice counts.
            </p>
            <button
              type="button"
              disabled={busy || day.week.freezesLeft <= 0}
              onClick={() => log("freeze")}
              className="w-full rounded-full border border-zinc-200 px-3 py-2 text-xs disabled:opacity-40"
            >
              Use this week’s freeze
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            MVP · before production
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Today with your Sensei
          </h1>
          {path && (
            <p className="mt-1 text-sm text-zinc-500">
              {path.me_labels[0]} → {path.iam_labels[0]} · {path.method} · Day{" "}
              {path.day_number}/{path.total_days}
            </p>
          )}
        </div>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            Building today’s two tracks…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}{" "}
            {error.includes("No active path") && (
              <Link href="/onboarding" className="underline">
                Onboard first
              </Link>
            )}
          </div>
        )}

        {day && path && !loading && (
          <>
            <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-700">
              {day.companionLine}
            </p>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                Diagnosis · {day.diagnosis.lens} · next move {day.intervention}
              </div>
              <p className="mt-1 text-zinc-700">{day.diagnosis.summary}</p>
            </div>

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                  Track 1 · Subconscious
                </div>
                <h2 className="mt-0.5 text-lg font-semibold">
                  {day.twoTracks.subconscious.visualization.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {day.twoTracks.subconscious.identityLine}
                </p>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-zinc-700">
                  {day.twoTracks.subconscious.visualization.script}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={playViz}
                    disabled={busy}
                    className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {playing ? "Playing…" : "Play rehearsal"}
                  </button>
                  <span className="self-center text-xs text-zinc-400">
                    {data.elevenLabsConfigured
                      ? "ElevenLabs"
                      : "Browser voice (add ELEVENLABS_API_KEY for studio audio)"}
                  </span>
                </div>
                {licensed && (
                  <div className="rounded-xl bg-zinc-50 px-3 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Licensed payload · {licensed.durationMinutes} min ·{" "}
                      {licensed.partner}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {licensed.title}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {licensed.whyThisPartner} {licensed.whyNow}
                    </p>
                    <a
                      href={licensed.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs underline"
                    >
                      Partner shelf
                    </a>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                Track 2 · Action
              </div>
              <h2 className="mt-0.5 text-lg font-semibold">
                {practice?.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {practice?.description}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {day.twoTracks.action.note}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => log("practice")}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  I did it
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => log("offline")}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm"
                >
                  Did it offline
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => log("skip")}
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-500"
                >
                  Not today
                </button>
              </div>
            </section>

            {day.essential && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                  Essential · right time
                </div>
                <h2 className="mt-0.5 text-lg font-semibold">
                  {day.essential.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {day.essential.subtitle}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {day.essential.unlocked
                    ? "Unlocked for this Path stage."
                    : `${day.essential.daysRemaining} days until this checkpoint.`}
                </p>
                <Link
                  href="/shop"
                  className="mt-3 inline-block text-sm underline"
                >
                  Becoming Drop
                </Link>
              </section>
            )}

            <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-xs text-zinc-500 sm:p-5">
              EAST · Easy: {day.east.easy} Attractive: {day.east.attractive}{" "}
              Social: {day.east.social} Timely: {day.east.timely}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
