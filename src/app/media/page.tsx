"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MediaRow = {
  id: string;
  title: string;
  description: string;
  media_type: string;
  thumbnail_url: string | null;
  url: string | null;
  creator: string | null;
  methods: string[];
  potential_score: number;
  journey_stage: string;
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
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        setName(profile?.display_name ?? null);
      }
      const { data } = await supabase
        .from("media")
        .select(
          "id,title,description,media_type,thumbnail_url,url,creator,methods,potential_score,journey_stage",
        )
        .order("potential_score", { ascending: false });
      setItems((data as MediaRow[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const typeOk = type === "all" || item.media_type === type;
      const qOk =
        !q ||
        item.title.toLowerCase().includes(q.toLowerCase()) ||
        item.description.toLowerCase().includes(q.toLowerCase());
      return typeOk && qOk;
    });
  }, [items, type, q]);

  return (
    <AppShell name={name}>
      <div className="reveal">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              Catalog
            </p>
            <h1 className="font-display mt-1 text-4xl font-bold text-ink">
              Curated Media
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-soft">
              Ranked by potential score in the seed corpus. Live daily picks
              still come from the agentic pipeline on Today.
            </p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search films, mentors, music…"
            className="w-full rounded-full border border-line bg-paper-elevated px-4 py-2.5 text-sm outline-none ring-accent focus:ring-2 md:w-72"
          />
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm capitalize",
                type === t
                  ? "bg-ink text-paper-elevated"
                  : "border border-line text-ink-soft",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-line bg-paper-elevated/80 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"
            >
              {item.thumbnail_url && (
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={item.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-signal">
                    {item.media_type}
                  </span>
                  <span className="text-xs text-accent">
                    {item.potential_score.toFixed(2)}
                  </span>
                </div>
                <h2 className="mt-2 font-semibold text-ink">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                  {item.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.methods.slice(0, 2).map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-soft"
                    >
                      {m}
                    </span>
                  ))}
                </div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Open
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        {!filtered.length && (
          <p className="mt-10 text-center text-ink-soft">
            No media yet. Run <code className="text-ink">npm run seed</code> to
            populate the catalog.
          </p>
        )}
      </div>
    </AppShell>
  );
}
