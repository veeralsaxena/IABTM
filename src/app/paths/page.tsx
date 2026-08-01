"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PathRow = {
  id: string;
  me_labels: string[];
  iam_labels: string[];
  method: string;
  method_rationale: string | null;
  day_number: number;
  total_days: number;
  progress: number;
  status: string;
  created_at: string;
};

export default function PathsPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<PathRow[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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

    const res = await fetch("/api/paths");
    const json = await res.json();
    if (!res.ok) setError(json.error || "Could not load paths");
    else setPaths(json.paths ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(pathId: string) {
    setBusyId(pathId);
    const res = await fetch("/api/paths", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathId }),
    });
    setBusyId(null);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Could not switch path");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your paths</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              Every Me → I Am journey lives here. Switch the active path, or
              start a new one without losing the old.
            </p>
          </div>
          <Link
            href="/onboarding?mode=new"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            + New path
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            Loading paths…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !paths.length && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-zinc-600">No paths yet.</p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              Create your first path
            </Link>
          </div>
        )}

        <div className="grid gap-3">
          {paths.map((path) => {
            const active = path.status === "active";
            const pct = Math.min(
              100,
              (path.day_number / Math.max(1, path.total_days)) * 100,
            );
            return (
              <article
                key={path.id}
                className={cn(
                  "rounded-2xl border bg-white p-4 sm:p-5",
                  active
                    ? "border-emerald-400 shadow-sm"
                    : "border-zinc-200",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {active && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Active
                        </span>
                      )}
                      <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                        {path.method}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight">
                      {path.me_labels.join(", ")} → {path.iam_labels.join(", ")}
                    </h2>
                    {path.method_rationale && (
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
                        {path.method_rationale}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!active && (
                      <button
                        onClick={() => activate(path.id)}
                        disabled={busyId === path.id}
                        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {busyId === path.id ? "Switching…" : "Make active"}
                      </button>
                    )}
                    {active && (
                      <Link
                        href="/home"
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Open today
                      </Link>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                    <span>
                      Day {path.day_number} / {path.total_days}
                    </span>
                    <span>
                      Started{" "}
                      {new Date(path.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        active ? "bg-emerald-500" : "bg-zinc-400",
                      )}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
