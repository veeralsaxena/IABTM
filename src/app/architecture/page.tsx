import Link from "next/link";
import { SystemArchitectureCanvas } from "@/components/architecture/SystemArchitectureCanvas";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,24,28,0.9),#050506_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-display text-2xl font-bold text-white">
            Vector
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/demo"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-white/10"
            >
              Live demo
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
            >
              Open app
            </Link>
          </div>
        </div>

        <div className="mb-8 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            System design
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
            How Vector actually decides
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400 md:text-lg">
            Orchestrated pipeline with one real agentic hop: the{" "}
            <span className="text-teal-200">Critic Agent</span> observes the
            first search, decides accept or retry, and can re-search once.
            Method matching and ranking stay deterministic on purpose. Step
            through with Prev / Next — this view does not re-run the pipeline.
          </p>
        </div>

        <SystemArchitectureCanvas />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              t: "Why hybrid?",
              d: "Lexical alone misses synonyms. Pure pgvector needs a pre-indexed catalog. Live web candidates aren’t in Postgres until we embed the shortlist — so we discover, embed, then cosine + rules.",
            },
            {
              t: "What’s “agentic” here?",
              d: "The Critic Agent: Observe pass-1 → Reason → Decide accept|retry → Act (revised search, max once). Fail-open if it errors. Everything else is LLM roles, tools, or rules — labeled honestly.",
            },
            {
              t: "Feedback that sticks",
              d: "Hard: exact yt_/web_ ids filtered forever. Soft: disliked titles + chat preferences rewrite the next live identity query. UI removes the card immediately; soft text refreshes on the next curate.",
            },
            {
              t: "Becoming Drop",
              d: "Identity commerce: real IABTM merch scored like media (identity/stage/tone). Plus a Path Journal gift — embossed Me→I Am + method prompts. FNP personalizes a name; we personalize the transformation.",
            },
            {
              t: "Vector Companion",
              d: "RAG chatbot: Gemini embeds the question, retrieves top personal memory chunks (path, briefing, reviews, preferences) by cosine, then Groq generates. Preference notes write back into the next identity query.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="font-semibold text-white">{c.t}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6">
          <div className="font-display text-xl font-bold text-white">
            Stack (production-shaped)
          </div>
          <ul className="mt-4 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
            <li>Next.js app + Supabase Auth / Postgres</li>
            <li>Groq (`openai/gpt-oss-120b`) for writers</li>
            <li>Gemini `embedding-001` · 768-d</li>
            <li>Live YouTube / DuckDuckGo / Spotify discovery</li>
            <li>Daily briefing cache + path identity_embedding</li>
            <li>media_reviews hard blocklist by stable id</li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/demo"
              className="rounded-full bg-teal-400 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Run live demo (cached fallback ready)
            </Link>
            <Link
              href="/home"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200"
            >
              Open product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
