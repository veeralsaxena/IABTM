import Link from "next/link";

export default function ArchitecturePage() {
  return (
    <div className="relative z-10 mx-auto max-w-4xl px-5 py-10 md:px-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <Link href="/" className="font-display text-2xl font-bold text-ink">
            CURATE
          </Link>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/70">
            System architecture for judges
          </p>
        </div>
        <Link
          href="/login"
          className="btn-primary rounded-full px-4 py-2 text-sm font-medium"
        >
          Open app
        </Link>
      </div>

      <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
        Not an LLM wrapper — a potential-first curation loop
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Inspired by recent agentic recommender research (ARAG-style
        multi-agent retrieval + ranking), CURATE separates identity modeling,
        vector retrieval, potential scoring, diversity critique, and
        explanation. The LLM explains and selects methods — it does not alone
        decide what is relevant.
      </p>

      <section className="mt-12 space-y-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Pipeline</h2>
        <ol className="space-y-4">
          {[
            {
              t: "1. Identity Agent",
              d: "Builds a natural-language identity query from Me attributes, I Am attributes, method, journey stage, learning styles, and latest check-in. Embeds it with Gemini text-embedding-004 into a 768-d vector.",
            },
            {
              t: "2. Retriever (pgvector)",
              d: "Approximate nearest-neighbor search over the media catalog with method + stage filters. This is classical RecSys retrieval — not prompt stuffing.",
            },
            {
              t: "3. Potential Scorer",
              d: "Deterministic multi-factor ranker: identity fit, stage fit, method fit, learning-style fit, novelty, potential_score, and an anti-attention penalty. Optimizes for growth, not clicks.",
            },
            {
              t: "4. Diversity Critic",
              d: "Rebalances the top slate across media types (film, music, people, print…) so the day is not a monoculture feed.",
            },
            {
              t: "5. Explainer Agent (Groq)",
              d: "Produces the human-facing why-now narrative grounded in scores and identity — transparent enough for judges and users.",
            },
            {
              t: "6. Feedback Loop",
              d: "Resonated / Not today / Not for me / completed activities write to interactions and influence novelty + future ranking.",
            },
          ].map((step) => (
            <li
              key={step.t}
              className="rounded-2xl border border-line bg-paper-elevated/70 p-5"
            >
              <div className="font-display text-xl font-semibold text-ink">
                {step.t}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {step.d}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold text-ink">Stack</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Frontend", "Next.js 16 · React · Tailwind · Syne/Manrope"],
            ["Auth + DB", "Supabase Auth · Postgres · RLS"],
            ["Vectors", "pgvector HNSW · Gemini embeddings"],
            ["Agents", "Groq Llama 3.3 for method + explain + check-in NLP"],
            ["Product surface", "Onboarding · Daily briefing · Media · Trace"],
            ["Thesis", "Potential over attention · identity over engagement"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-line bg-paper-elevated/60 px-4 py-3"
            >
              <div className="text-xs uppercase tracking-[0.14em] text-signal">
                {k}
              </div>
              <div className="mt-1 text-sm text-ink">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[1.5rem] border border-accent/25 bg-accent-soft/40 p-6">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Innovation vs IABTM today
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          IABTM already assigns a path and a curated catalog. CURATE personalizes{" "}
          <em>within</em> the path: same Procrastination → Action-oriented
          journey can yield different daily media depending on stage, check-ins,
          learning style, and feedback — turning a fixed library into a living
          curator.
        </p>
      </section>

      <pre className="mt-12 overflow-x-auto rounded-2xl bg-ink p-5 text-xs leading-relaxed text-paper-elevated">
{`Me + I Am + Method + Stage + Check-in
            │
            ▼
     Identity Embedding (Gemini)
            │
            ▼
   pgvector Candidate Recall
            │
            ▼
 Potential Scorer (deterministic)
            │
            ▼
   Diversity Critic → Daily Slate
            │
            ▼
   Explainer (Groq) → Why Now
            │
            ▼
 Feedback (resonate / skip / complete)`}
      </pre>
    </div>
  );
}
