import Link from "next/link";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold">
            Vector
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/demo"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800"
            >
              Live demo
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              Open app
            </Link>
          </div>
        </div>

        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          System design
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-500">
          Hybrid retrieval: identity block → Gemini embedding (pgvector-ready)
          → live web discovery → vector + lexical rerank → explain → adapt.
        </p>

        <ol className="mt-10 space-y-4">
          {[
            [
              "Inputs",
              "Me / I Am attributes, questions, learning styles, check-ins, completed activities, resonance / rejection.",
            ],
            [
              "Identity block",
              "Three answers — who I am now, who I’m becoming, how I get there — concatenated and embedded with Gemini (768-d). Stored on the path as identity_embedding for pgvector.",
            ],
            [
              "Query planner (Groq)",
              "Writes search queries per media type and proposes outdoor / indoor / social activities.",
            ],
            [
              "Web discovery",
              "Live YouTube + Spotify embeds (+ DuckDuckGo when reachable). Tabs are session-cached.",
            ],
            [
              "Hybrid rerank + human-in-the-loop",
              "Cosine + lexical rules choose winners. Low ratings / written reviews are stored and used next run: avoid those titles, boost liked ones, and inject dislike reasons into the identity query. LLM does not pick the winner.",
            ],
            [
              "Explain + act (ReAct loop)",
              "Observe feedback → Reason (identity + planner) → Act (retrieve/rerank) → Explain → user rates again. That is the closed Reason–Act cycle.",
            ],
            [
              "Return after absence",
              "If away 2+ days: advance path day, invalidate stale briefing, prefer shorter re-entry content.",
            ],
            [
              "Adapt",
              "Attribute changes rebuild method + invalidate today’s briefing. Behavior signals reshape tomorrow’s search.",
            ],
          ].map(([t, d], i) => (
            <li
              key={t}
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                Step {i + 1}
              </div>
              <div className="mt-1 text-xl font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{d}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl bg-zinc-900 p-5 text-sm leading-relaxed text-zinc-300">
          <div className="font-semibold text-white">
            Why not lexical-only? Why not pgvector-only?
          </div>
          <p className="mt-2">
            Lexical overlap alone misses synonyms (“procrastinating” vs “putting
            things off”). Pure pgvector alone needs a pre-indexed catalog —
            live web candidates aren’t in Postgres until we embed them. Best
            production pattern: store the identity vector in Supabase pgvector,
            discover from the web, embed the shortlist, score with cosine +
            rules. That is what this stack does.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="font-semibold">UI shell decisions</div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-500">
            <li>
              <strong className="text-zinc-800">240→64 left rail</strong> —
              industry dashboard default; collapse for focus on the primary pick.
            </li>
            <li>
              <strong className="text-zinc-800">280px right panel, hidable</strong> —
              activities are secondary; main column owns attention.
            </li>
            <li>
              <strong className="text-zinc-800">Top-right notifications</strong> —
              path signals live in the header (F-pattern), not in the briefing.
            </li>
            <li>
              <strong className="text-zinc-800">Main max-width ~64rem</strong> —
              readable measure; avoids stretched empty middle on wide screens.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
