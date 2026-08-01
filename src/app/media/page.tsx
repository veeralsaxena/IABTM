"use client";

import { useEffect, useMemo, useState } from "react";
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
  methods: string[];
  potential_score: number;
};

const TYPES = [
  "all",
  "film",
  "music",
  "art",
  "animation",
  "editorial",
  "print",
  "people",
  "podcast",
];

export default function MediaPage() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [type, setType] = useState("film");
  const [filter, setFilter] = useState<"active" | "all" | "global">("active");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<MediaRow | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pathMethods, setPathMethods] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setName(profile?.display_name ?? null);
        setAvatarUrl(profile?.avatar_url ?? null);
        const { data: path } = await supabase
          .from("paths")
          .select("method")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (path?.method) setPathMethods([path.method, "any"]);
      }
      const { data } = await supabase
        .from("media")
        .select(
          "id,title,description,media_type,thumbnail_url,url,methods,potential_score",
        )
        .order("potential_score", { ascending: false });
      setItems((data as MediaRow[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const typeOk = type === "all" || item.media_type === type;
      const filterOk =
        filter === "global" ||
        filter === "all" ||
        !pathMethods.length ||
        item.methods.some((m) => pathMethods.includes(m));
      const qOk =
        !q ||
        item.title.toLowerCase().includes(q.toLowerCase()) ||
        item.description.toLowerCase().includes(q.toLowerCase());
      return typeOk && filterOk && qOk;
    });
  }, [items, type, filter, q, pathMethods]);

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl}>
      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Curated Media
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
              Watch inline. Ranked for potential on your path — not for clickbait.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm capitalize",
                type === t
                  ? "border-zinc-900 font-semibold text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            [
              ["active", "Active paths"],
              ["all", "All curated"],
              ["global", "Global"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm",
                filter === id
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 text-zinc-600",
              )}
            >
              {label}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title…"
            className="ml-auto min-w-[200px] flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none ring-zinc-900 focus:ring-2 md:max-w-xs"
          />
          <button
            type="button"
            onClick={() => active && setActive(null)}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Get more like this
          </button>
        </div>

        {active && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-200">
            <MediaPlayer url={active.url} title={active.title} />
            <div className="p-5">
              <div className="text-[11px] uppercase tracking-wide text-sky-700">
                {active.media_type}
              </div>
              <h2 className="mt-1 text-2xl font-semibold">{active.title}</h2>
              <p className="mt-2 text-sm text-zinc-500">{active.description}</p>
              <button
                onClick={() => setActive(null)}
                className="mt-4 text-sm text-zinc-500 underline-offset-2 hover:underline"
              >
                Close player
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="flex w-full gap-4 rounded-2xl border border-zinc-200 bg-white p-3 text-left transition hover:border-zinc-300 hover:shadow-sm"
            >
              <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                {item.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 py-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                  {item.media_type}
                </div>
                <h2 className="mt-1 truncate text-lg font-semibold leading-snug">
                  {item.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500">
                  {item.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.methods.slice(0, 2).map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-500"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden shrink-0 self-center sm:block">
                <span className="rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white">
                  Play
                </span>
              </div>
            </button>
          ))}
        </div>

        {!filtered.length && (
          <p className="mt-12 text-center text-zinc-500">
            No media in this filter. Try All curated.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
