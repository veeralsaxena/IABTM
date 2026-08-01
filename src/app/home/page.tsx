"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import { StatusPanel } from "@/components/StatusPanel";
import { MediaPlayer } from "@/components/MediaPlayer";
import { MediaReviewPanel } from "@/components/MediaReviewPanel";
import { IdentityVectorMap } from "@/components/IdentityVectorMap";
import {
  PostCard,
  PostComposer,
  type FeedPost,
} from "@/components/PostComposer";
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
  const [daysAway, setDaysAway] = useState(0);
  const [returner, setReturner] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [reflection, setReflection] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showBriefing, setShowBriefing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({
    curated: "0",
    global: "0",
    experts: "0",
    activities: "0",
  });
  const checkInRef = useRef<HTMLTextAreaElement>(null);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    const res = await fetch("/api/posts");
    const json = await res.json();
    setPostsLoading(false);
    if (res.ok) setPosts(json.posts ?? []);
  }, []);

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

    const { count: reviewCount } = await supabase
      .from("media_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setStats({
      curated: `${viewed ?? 0}`,
      global: `${(viewed ?? 0) + (reviewCount ?? 0)}`,
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
    setDaysAway(json.daysAway ?? 0);
    setReturner(Boolean(json.returner));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadPosts();
  }, [load, loadPosts]);

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

  async function deletePost(id: string) {
    const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) setPosts((p) => p.filter((x) => x.id !== id));
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
      title="Home"
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
          id: "artists",
          title: "Artists matched",
          body: "Open Artists for entrepreneurs & mentors from your interests.",
          href: "/artists",
          time: "Tip",
        },
        {
          id: "reviews",
          title: "Reviews train the agent",
          body: "Rate media after watching — liked / didn’t land feeds tomorrow.",
          href: "/media",
          time: "Tip",
        },
        ...(returner
          ? [
              {
                id: "returner",
                title: `Welcome back · ${daysAway} days away`,
                body: "We refreshed your briefing with softer re-entry picks and advanced your path day.",
                href: "/home",
                time: "Now",
              },
            ]
          : []),
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
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              Your feed
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Hey, {name || "there"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/artists"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
            >
              Artists
            </Link>
            <Link
              href="/paths"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400"
            >
              Switch path
            </Link>
          </div>
        </div>

        {/* Social compose — IABTM-style home */}
        <PostComposer
          name={name}
          avatarUrl={avatarUrl}
          onPosted={(post) => setPosts((p) => [post, ...p])}
        />

        {returner && daysAway >= 2 && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 sm:px-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-sky-700/70">
              Welcome back
            </div>
            <h2 className="mt-1 text-lg font-semibold text-sky-950">
              You were away {daysAway} days — we adapted
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-sky-900/80">
              Path day advanced, today’s briefing was refreshed, and picks skew
              shorter / lower-friction so re-entry feels kind — not punishing.
              Your past low ratings still block similar content.
            </p>
          </div>
        )}

        {data && !loading && (
          <IdentityVectorMap
            me={data.path.me_labels}
            iam={data.path.iam_labels}
            method={data.path.method}
            dayNumber={data.path.day_number}
            totalDays={data.path.total_days}
            scores={data.briefing.primary.scores}
            mediaTitle={data.briefing.primary.title}
          />
        )}

        {/* Today’s curated pick stays on home */}
        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            Ranking today’s media for your path…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => load(true)}
              className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setShowBriefing((s) => !s)}
              className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 text-left sm:px-5"
            >
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                  Today’s curated pick · {data.path.method}
                </div>
                <div className="mt-0.5 text-base font-semibold">
                  {data.briefing.primary.title}
                </div>
              </div>
              <span className="text-xs text-zinc-400">
                {showBriefing ? "Hide" : "Show"}
              </span>
            </button>

            {showBriefing && (
              <>
                <MediaPlayer
                  url={data.briefing.primary.url}
                  title={data.briefing.primary.title}
                  className="rounded-none"
                />
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium uppercase text-zinc-700">
                      {data.briefing.primary.media_type}
                    </span>
                    {data.briefing.primary.creator && (
                      <span className="self-center">
                        {data.briefing.primary.creator}
                      </span>
                    )}
                    <span className="self-center">
                      Day {data.path.day_number}/{data.path.total_days}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    {data.briefing.primary.description}
                  </p>
                  <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-800">
                    <span className="font-semibold text-zinc-900">Why now: </span>
                    {data.briefing.whyNow || data.briefing.primary.why}
                  </p>
                  <div className="flex flex-wrap gap-2">
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
                    <button
                      onClick={() => load(true)}
                      className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-500"
                    >
                      Recurate
                    </button>
                  </div>

                  <MediaReviewPanel
                    mediaRef={data.briefing.primary.id}
                    mediaTitle={data.briefing.primary.title}
                    mediaType={data.briefing.primary.media_type}
                    mediaUrl={data.briefing.primary.url}
                    pathId={data.path.id}
                  />

                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-900"
                      style={{ width: `${Math.max(progress, 3)}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {(showCheckIn || reflection) && data && (
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

        {/* Community feed */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Posts</h2>
            <span className="text-xs text-zinc-400">
              {postsLoading ? "Loading…" : `${posts.length} in feed`}
            </span>
          </div>

          {!postsLoading && posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
              <p className="text-sm text-zinc-500">
                No posts yet. Share your thoughts with the world — create your
                first post above.
              </p>
            </div>
          )}

          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={deletePost} />
          ))}
        </section>

        {data && data.briefing.secondary.length > 0 && (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <h3 className="text-lg font-semibold tracking-tight">
                Also ranked for you
              </h3>
              <Link
                href="/media"
                className="text-sm text-zinc-700 underline-offset-2 hover:underline"
              >
                Curated media
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.briefing.secondary.slice(0, 4).map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                >
                  <MediaPlayer
                    url={item.url}
                    title={item.title}
                    className="rounded-none"
                    compact={item.media_type === "music"}
                  />
                  <div className="space-y-2 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-400">
                      {item.media_type}
                      {item.creator ? ` · ${item.creator}` : ""}
                    </div>
                    <h4 className="line-clamp-2 text-sm font-semibold leading-snug">
                      {item.title}
                    </h4>
                    <MediaReviewPanel
                      compact
                      mediaRef={item.id}
                      mediaTitle={item.title}
                      mediaType={item.media_type}
                      mediaUrl={item.url}
                      pathId={data.path.id}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
