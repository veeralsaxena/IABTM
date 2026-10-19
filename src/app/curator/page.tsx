"use client";

import { useState } from "react";
import Link from "next/link";
import { curatorRoutes } from "@/lib/curator/routes";

const steps = [
  ["Search", "POST /api/ingest/search", "Looks on YouTube and Wikipedia. Nothing is saved."],
  ["Save", "POST /api/ingest", "Writes the matches into the local catalog."],
  ["Recommend", "POST /api/curator", "Serves a saved video only when the path is similar."],
] as const;

export default function CuratorPage() {
  const [me, setMe] = useState("Procrastinating");
  const [iam, setIam] = useState("Action-oriented");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState("");

  async function run(path: string, label: string) {
    setBusy(label);
    setOut("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          me: me.split(",").map((s) => s.trim()).filter(Boolean),
          iam: iam.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      setOut(JSON.stringify(json, null, 2));
    } catch (error) {
      setOut(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm text-zinc-500">
          Vector
        </Link>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">
          Curator
        </h1>
        <p className="mt-3 text-zinc-600">
          No account. Say who you are and who you want to become. Saved videos
          stay in the catalog and come back for the next person on a similar path.
        </p>

        <ol className="mt-8 space-y-3">
          {steps.map(([name, route, detail]) => (
            <li key={route} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <div className="font-medium">{name}</div>
              <div className="mt-1 font-mono text-xs text-zinc-500">{route}</div>
              <div className="mt-1 text-sm text-zinc-600">{detail}</div>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Current self
            <input
              value={me}
              onChange={(e) => setMe(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Imagined self
            <input
              value={iam}
              onChange={(e) => setIam(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("/api/ingest/search", "search")}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy === "search" ? "Searching…" : "Search"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("/api/ingest", "save")}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : "Save to catalog"}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run("/api/curator", "recommend")}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy === "recommend" ? "Ranking…" : "Recommend"}
          </button>
        </div>

        <pre className="mt-6 max-h-[28rem] overflow-auto rounded-2xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
          {out || "Result shows up here."}
        </pre>

        <h2 className="mt-10 font-display text-xl font-bold">Where it lives</h2>
        <ul className="mt-3 space-y-1 font-mono text-xs text-zinc-600">
          {curatorRoutes.map((route) => (
            <li key={route.path}>
              {route.method} {route.path} — {route.file}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
