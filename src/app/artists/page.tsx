"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { MediaPlayer } from "@/components/MediaPlayer";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, Sparkles } from "lucide-react";

type ArtistCard = {
  id: string;
  name: string;
  role: string;
  blurb: string;
  why: string;
  focus: string[];
  image: string;
  matched: string[];
  score: number;
  links: { label: string; url: string }[];
  userFeedback?: {
    rating: number;
    sentiment: string;
    note: string | null;
  } | null;
};

export default function ArtistsPage() {
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState("People to follow");
  const [tokens, setTokens] = useState<string[]>([]);
  const [path, setPath] = useState<{
    id?: string;
    me: string[];
    iam: string[];
    method: string;
  } | null>(null);
  const [artists, setArtists] = useState<ArtistCard[]>([]);
  const [active, setActive] = useState<ArtistCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fbBusy, setFbBusy] = useState(false);
  const [fbNote, setFbNote] = useState("");

  async function reloadArtists() {
    const res = await fetch("/api/artists");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load artists");
      return;
    }
    setTheme(json.theme);
    setTokens(json.tokens ?? []);
    setPath(json.path);
    setArtists(json.artists ?? []);
    setActive((prev) => {
      const next = json.artists ?? [];
      if (!prev) return next[0] ?? null;
      return next.find((a: ArtistCard) => a.id === prev.id) ?? next[0] ?? null;
    });
  }

  useEffect(() => {
    (async () => {
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
      setName(profile?.display_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      if (!profile?.onboarding_complete) {
        window.location.href = "/onboarding";
        return;
      }

      await reloadArtists();
      setLoading(false);
    })();
  }, []);

  async function rateArtist(
    sentiment: "liked" | "disliked" | "mixed",
    rating: number,
  ) {
    if (!active) return;
    setFbBusy(true);
    const res = await fetch("/api/artists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: active.id,
        artistName: active.name,
        pathId: path?.id,
        sentiment,
        rating,
        note: fbNote || undefined,
      }),
    });
    setFbBusy(false);
    if (!res.ok) return;
    setFbNote("");
    await reloadArtists();
  }

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl} title="Artists">
      <div className="space-y-6">
        <header>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            <Sparkles className="h-3.5 w-3.5" />
            Mentors matched to you
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Artists
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
            {theme}. Recommendations come from your onboarding interests,
            Me / I Am attributes, and method — e.g. if you signal{" "}
            <span className="font-medium text-zinc-700">entrepreneur</span>, we
            surface founders and builders.
          </p>
          {path && (
            <p className="mt-2 text-xs text-zinc-400">
              Path signal: {path.me?.[0]} → {path.iam?.[0]} · {path.method}
            </p>
          )}
          {!!tokens.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tokens.slice(0, 10).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] capitalize text-zinc-600"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500">
            Matching mentors to your interests…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {artists.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActive(a)}
                  className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                    active?.id === a.id
                      ? "border-zinc-900 bg-white shadow-sm"
                      : "border-zinc-200 bg-white hover:border-zinc-400"
                  }`}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    <Image src={a.image} alt="" fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                      {a.role}
                    </div>
                    <div className="mt-0.5 font-semibold">{a.name}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                      {a.blurb}
                    </p>
                    {!!a.matched.length && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.matched.slice(0, 3).map((m) => (
                          <span
                            key={m}
                            className="rounded-full bg-zinc-900/5 px-2 py-0.5 text-[10px] capitalize text-zinc-600"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
              {!artists.length && (
                <p className="text-sm text-zinc-500">
                  No matches yet. Add interests in{" "}
                  <Link href="/onboarding?mode=new" className="underline">
                    a new path
                  </Link>{" "}
                  or pick Mentors / Entrepreneur in onboarding questions.
                </p>
              )}
            </div>

            {active && (
              <aside className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="relative h-44 w-full bg-zinc-100">
                  <Image
                    src={active.image}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    {active.role}
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {active.name}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {active.blurb}
                  </p>
                  <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm leading-relaxed text-zinc-700">
                    <span className="font-semibold text-zinc-900">Why you: </span>
                    {active.why}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {active.focus.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 space-y-2">
                    {active.links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-400"
                      >
                        <span className="min-w-0 truncate">{l.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      </a>
                    ))}
                  </div>
                  {active.links[0] && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                      <MediaPlayer
                        url={active.links[0].url}
                        title={active.links[0].label}
                        className="rounded-none"
                      />
                    </div>
                  )}

                  {/* Human-in-the-loop artist rating */}
                  <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                      Rate this mentor
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Low ratings hide them next time and teach the curator what
                      not to recommend.
                    </p>
                    {active.userFeedback && (
                      <p className="mt-2 text-xs font-medium text-zinc-700">
                        Saved: {active.userFeedback.rating}/5 ·{" "}
                        {active.userFeedback.sentiment}
                      </p>
                    )}
                    <textarea
                      value={fbNote}
                      onChange={(e) => setFbNote(e.target.value)}
                      rows={2}
                      placeholder="Optional: why they fit — or don’t"
                      className="mt-2 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={fbBusy}
                        onClick={() => rateArtist("liked", 5)}
                        className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      >
                        Like · keep
                      </button>
                      <button
                        type="button"
                        disabled={fbBusy}
                        onClick={() => rateArtist("mixed", 3)}
                        className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700"
                      >
                        Mixed
                      </button>
                      <button
                        type="button"
                        disabled={fbBusy}
                        onClick={() => rateArtist("disliked", 1)}
                        className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-500"
                      >
                        Not for me
                      </button>
                    </div>
                  </div>

                  <Link
                    href="/media"
                    className="mt-4 inline-block text-sm text-zinc-500 underline-offset-2 hover:underline"
                  >
                    Discover more people & media →
                  </Link>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
