"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/client";
import {
  ASPIRATIONAL_ATTRIBUTES,
  CURRENT_ATTRIBUTES,
} from "@/lib/data/catalog";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

type Tab = "general" | "paths" | "attributes" | "feedback";

type PathRow = {
  id: string;
  me_labels: string[];
  iam_labels: string[];
  method: string;
  method_rationale: string | null;
  day_number: number;
  total_days: number;
  status: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  media_title: string | null;
  media_type: string | null;
  rating: number;
  sentiment: string;
  review: string;
  updated_at: string;
};

type ArtistFbRow = {
  id: string;
  artist_name: string | null;
  rating: number;
  sentiment: string;
  note: string | null;
  updated_at: string;
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [me, setMe] = useState<string[]>([]);
  const [iam, setIam] = useState<string[]>([]);
  const [customMe, setCustomMe] = useState("");
  const [customIam, setCustomIam] = useState("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [artistFb, setArtistFb] = useState<ArtistFbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const res = await fetch("/api/settings");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load settings");
      setLoading(false);
      return;
    }
    setName(json.profile?.display_name ?? null);
    setAvatarUrl(json.profile?.avatar_url ?? null);
    setDisplayName(json.profile?.display_name ?? "");
    setPreview(json.profile?.avatar_url ?? null);
    setPaths(json.paths ?? []);
    if (json.activePath) {
      setMe(json.activePath.me_labels ?? []);
      setIam(json.activePath.iam_labels ?? []);
    }

    const [{ data: revs }, { data: arts }] = await Promise.all([
      supabase
        .from("media_reviews")
        .select(
          "id, media_title, media_type, rating, sentiment, review, updated_at",
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("artist_feedback")
        .select("id, artist_name, rating, sentiment, note, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);
    setReviews((revs as ReviewRow[]) ?? []);
    setArtistFb((arts as ArtistFbRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    if (list.includes(value)) setList(list.filter((x) => x !== value));
    else if (list.length < 5) setList([...list, value]);
  }

  function addCustom(
    list: string[],
    setList: (v: string[]) => void,
    value: string,
    clear: () => void,
  ) {
    const v = value.trim();
    if (!v) return;
    if (list.includes(v) || list.length >= 5) return;
    setList([...list, v]);
    clear();
  }

  async function saveGeneral() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let nextAvatar = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        nextAvatar = `${data.publicUrl}?t=${Date.now()}`;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "general",
          displayName: displayName.trim(),
          avatarUrl: nextAvatar,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setName(displayName.trim());
      setAvatarUrl(nextAvatar);
      setMessage("Profile updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function activatePath(pathId: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "path", pathId }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Could not switch path");
      return;
    }
    sessionStorage.removeItem("curate_discover_cache_v1");
    setMessage("Active path switched. Today’s briefing will rebuild.");
    await load();
  }

  async function applyAttributes() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "attributes", me, iam }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Could not apply attributes");
      return;
    }
    sessionStorage.removeItem("curate_discover_cache_v1");
    setMessage(
      `Attributes applied. Method is now ${json.method?.id ?? "updated"}. Recommendations will refresh.`,
    );
    await load();
  }

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl}>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Profile, paths, and attributes that drive curation.
          </p>
        </div>

        <div className="flex gap-1 border-b border-zinc-200">
          {(
            [
              ["general", "General"],
              ["paths", "Paths"],
              ["attributes", "Attributes"],
              ["feedback", "Feedback"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "border-b-2 px-4 py-2.5 text-sm",
                tab === id
                  ? "border-zinc-900 font-semibold text-zinc-900"
                  : "border-transparent text-zinc-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            Loading settings…
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            {message}{" "}
            {tab !== "general" && (
              <Link href="/home" className="font-medium underline underline-offset-2">
                Open Today
              </Link>
            )}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && tab === "general" && (
          <section className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Name and photo used across Today and Discover.
            </p>
            <div className="mt-6 flex flex-col items-start gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-24 w-24 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200"
              >
                {preview ? (
                  <Image src={preview} alt="" fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-zinc-400">
                    <Camera className="h-6 w-6" />
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  setPreview(URL.createObjectURL(file));
                }}
              />
              <label className="w-full text-sm">
                Display name
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900 focus:ring-2"
                />
              </label>
              <button
                onClick={saveGeneral}
                disabled={saving || !displayName.trim()}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </section>
        )}

        {!loading && tab === "paths" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Switch which journey drives Today and Discover.
              </p>
              <Link
                href="/onboarding?mode=new"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                + New path
              </Link>
            </div>
            {paths.map((path) => (
              <article
                key={path.id}
                className={cn(
                  "rounded-2xl border bg-white p-4",
                  path.status === "active"
                    ? "border-zinc-900"
                    : "border-zinc-200",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {path.status === "active" && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Active
                      </span>
                    )}
                    <h3 className="mt-1 text-lg font-semibold">
                      {path.me_labels.join(", ")} → {path.iam_labels.join(", ")}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {path.method} · Day {path.day_number}/{path.total_days}
                    </p>
                  </div>
                  {path.status !== "active" && (
                    <button
                      onClick={() => activatePath(path.id)}
                      disabled={saving}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Make active
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        {!loading && tab === "attributes" && (
          <section className="space-y-4">
            <p className="text-sm text-zinc-500">
              Edit Me / I Am for the active path, then apply. This reassigns the
              method and rebuilds recommendations.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {(
                [
                  ["Me", me, setMe, customMe, setCustomMe, CURRENT_ATTRIBUTES],
                  [
                    "I Am",
                    iam,
                    setIam,
                    customIam,
                    setCustomIam,
                    ASPIRATIONAL_ATTRIBUTES,
                  ],
                ] as const
              ).map(([title, list, setList, custom, setCustom, catalog]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-zinc-200 bg-white p-4"
                >
                  <div className="text-sm font-semibold">
                    {title}{" "}
                    <span className="font-normal text-zinc-400">
                      ({list.length}/5)
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {list.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggle(list as string[], setList, a)}
                        className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white"
                      >
                        {a} ×
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {catalog.slice(0, 12).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggle(list as string[], setList, a)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          list.includes(a)
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200",
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="Custom attribute"
                      className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addCustom(list as string[], setList, custom, () =>
                          setCustom(""),
                        )
                      }
                      className="rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={applyAttributes}
              disabled={saving || me.length < 1 || iam.length < 1}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Applying…" : "Apply changes & recurate"}
            </button>
          </section>
        )}

        {!loading && tab === "feedback" && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold">How your feedback trains Vector</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Low ratings and “not for me” notes are stored and injected into
                the next identity query + reranker. Disliked media is hard-avoided;
                disliked artists are hidden. This is the human-in-the-loop.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h3 className="font-semibold">Media reviews</h3>
              {!reviews.length && (
                <p className="mt-2 text-sm text-zinc-500">
                  No reviews yet — rate a pick on Home or Curated media.
                </p>
              )}
              <ul className="mt-3 space-y-3">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="font-medium text-zinc-700">
                        {r.rating}/5 · {r.sentiment}
                      </span>
                      <span>{r.media_type}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {r.media_title || "Untitled"}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">{r.review}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h3 className="font-semibold">Artist / mentor feedback</h3>
              {!artistFb.length && (
                <p className="mt-2 text-sm text-zinc-500">
                  No artist ratings yet — open Artists and tap Like / Not for me.
                </p>
              )}
              <ul className="mt-3 space-y-3">
                {artistFb.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3"
                  >
                    <div className="text-xs text-zinc-400">
                      {a.rating}/5 · {a.sentiment}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {a.artist_name || "Artist"}
                    </div>
                    {a.note && (
                      <p className="mt-1 text-sm text-zinc-500">{a.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
