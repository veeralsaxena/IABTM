"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { MediaPlayer } from "@/components/MediaPlayer";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MediaRow = {
  id: string;
  title: string;
  description: string;
  media_type: string;
  thumbnail_url: string | null;
  url: string | null;
  methods?: string[];
  creator?: string | null;
  duration_minutes?: number | null;
  scores?: { final?: number };
};

const TYPES = [
  "film",
  "music",
  "art",
  "animation",
  "editorial",
  "print",
  "people",
  "podcast",
] as const;

type MediaType = (typeof TYPES)[number];

const CACHE_KEY = "curate_discover_cache_v1";

function readSessionCache(): Partial<Record<MediaType, MediaRow[]>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<MediaType, MediaRow[]>>) : {};
  } catch {
    return {};
  }
}

function writeSessionCache(cache: Partial<Record<MediaType, MediaRow[]>>) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota
  }
}

export default function MediaPage() {
  const [cache, setCache] = useState<Partial<Record<MediaType, MediaRow[]>>>({});
  const [type, setType] = useState<MediaType>("film");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<MediaRow | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pathLabel, setPathLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefetching, setPrefetching] = useState(false);
  const inflight = useRef<Partial<Record<MediaType, Promise<MediaRow[]>>>>({});

  useEffect(() => {
    setCache(readSessionCache());
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
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setName(profile?.display_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      const { data: path } = await supabase
        .from("paths")
        .select("me_labels, iam_labels, method")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (path) {
        setPathLabel(
          `${path.me_labels?.[0] ?? "Me"} → ${path.iam_labels?.[0] ?? "I Am"} · ${path.method}`,
        );
      }
    })();
  }, []);

  const fetchType = useCallback(async (mediaType: MediaType, force = false) => {
    if (!force && mediaType in cache) return cache[mediaType] ?? [];
    if (!force && inflight.current[mediaType]) return inflight.current[mediaType]!;

    const run = (async () => {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Discovery failed");
      return (json.items ?? []) as MediaRow[];
    })();

    inflight.current[mediaType] = run;
    try {
      const items = await run;
      setCache((prev) => {
        const next = { ...prev, [mediaType]: items };
        writeSessionCache(next);
        return next;
      });
      return items;
    } finally {
      delete inflight.current[mediaType];
    }
  }, [cache]);

  const ensureType = useCallback(
    async (mediaType: MediaType, force = false) => {
      if (!force && mediaType in cache) {
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await fetchType(mediaType, force);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Discovery failed");
      } finally {
        setLoading(false);
      }
    },
    [cache, fetchType],
  );

  useEffect(() => {
    setActive(null);
    ensureType(type);
  }, [type, ensureType]);

  // Prefetch remaining tabs quietly after first load
  useEffect(() => {
    if (!cache.film && !cache[type]) return;
    let cancelled = false;
    (async () => {
      setPrefetching(true);
      for (const t of TYPES) {
        if (cancelled) break;
        if (cache[t]?.length) continue;
        try {
          await fetchType(t);
        } catch {
          // keep going
        }
      }
      if (!cancelled) setPrefetching(false);
    })();
    return () => {
      cancelled = true;
    };
    // only kick once we have at least one tab
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(cache[type]?.length)]);

  const items = cache[type] ?? [];
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!q) return true;
      const hay = `${item.title} ${item.description} ${item.creator ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q]);

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl}>
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Discover</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Live web + YouTube for your path
              {pathLabel ? ` — ${pathLabel}` : ""}. Tabs stay cached in this
              session so switching is instant.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {prefetching && (
              <span className="self-center text-xs text-zinc-400">
                Prefetching tabs…
              </span>
            )}
            <Link
              href="/paths"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"
            >
              Change path
            </Link>
          </div>
        </div>

        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm capitalize transition",
                type === t
                  ? "border-zinc-900 font-semibold text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {t}
              {cache[t]?.length ? (
                <span className="ml-1 text-[10px] text-zinc-400">
                  {cache[t]!.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter cached results…"
            className="min-w-[200px] flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm outline-none ring-zinc-900 focus:ring-2 md:max-w-xs"
          />
          <button
            type="button"
            onClick={() => ensureType(type, true)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Refresh this tab
          </button>
        </div>

        {loading && !items.length && (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            Searching the web for <span className="font-semibold">{type}</span>…
          </div>
        )}

        {error && !loading && !items.length && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {active && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <MediaPlayer
              url={active.url}
              title={active.title}
              compact={active.media_type === "music"}
            />
            <div className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                {active.media_type}
              </div>
              <h2 className="mt-1 text-2xl font-semibold">{active.title}</h2>
              <p className="mt-2 text-sm text-zinc-500">{active.description}</p>
              <button
                onClick={() => setActive(null)}
                className="mt-3 text-sm text-zinc-500 underline-offset-2 hover:underline"
              >
                Close player
              </button>
            </div>
          </div>
        )}

        {!!items.length && (
          <div className="mt-5 space-y-2.5">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(item)}
                className="flex w-full gap-4 rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-400 hover:shadow-sm"
              >
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:h-24 sm:w-40">
                  {item.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {item.media_type}
                    {item.creator ? ` · ${item.creator}` : ""}
                  </div>
                  <h2 className="mt-1 text-base font-semibold leading-snug sm:text-lg">
                    {item.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500">
                    {item.description}
                  </p>
                </div>
                <div className="hidden shrink-0 self-center sm:block">
                  <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Open
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !filtered.length && !error && (
          <p className="mt-12 text-center text-zinc-500">
            No results yet. Hit Refresh this tab.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
