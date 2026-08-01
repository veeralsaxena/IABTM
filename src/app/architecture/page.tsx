import Link from "next/link";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-bold">
            CURATE
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            Open app
          </Link>
        </div>

        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          System design
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-500">
          Production-shaped loop: identity in → live discovery → potential
          rerank → explain → behave → adapt. The LLM never picks the winner.
        </p>

        <ol className="mt-10 space-y-4">
          {[
            [
              "Inputs",
              "Me / I Am attributes, questions, learning styles, check-ins, completed activities, resonance / rejection.",
            ],
            [
              "Path + identity query",
              "Method for the Me→I Am gap. Gemini embeds a stage-aware identity query (768-d), enriched with what you practiced and rejected.",
            ],
            [
              "Query planner (Groq)",
              "Writes search queries per media type and proposes outdoor / indoor / social activities.",
            ],
            [
              "Web discovery",
              "Live YouTube + DuckDuckGo. Discover tabs are session-cached so switching types does not re-hit the network.",
            ],
            [
              "Potential reranker",
              "Self-built scorer: identity fit, method keywords, duration, novelty, anti-clickbait. Deterministic shortlist.",
            ],
            [
              "Explain + act",
              "Groq writes why-now. Sidebar activities can be marked done — that signal feeds the next identity query.",
            ],
            [
              "Adapt",
              "Changing attributes in Settings invalidates today’s briefing and rebuilds method + media. Completing activities biases tomorrow toward practice-aligned content.",
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
