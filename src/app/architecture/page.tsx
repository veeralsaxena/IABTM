import Link from "next/link";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
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
          How curation works
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-500">
          Not a chatbot choosing videos from vibes. A loop: identity embedding →
          vector recall → potential scoring → diversity → explanation →
          feedback.
        </p>

        <ol className="mt-10 space-y-4">
          {[
            ["Identity", "Me / I Am / method / stage / check-in → Gemini embedding (768-d)."],
            ["Retrieve", "pgvector nearest-neighbor over the media catalog with method + stage filters."],
            ["Score", "Deterministic potential score: identity fit, stage, novelty, anti-attention."],
            ["Diversify", "Spread formats so the day isn’t one type of content."],
            ["Explain", "Groq gpt-oss-120b writes the why-now in plain language."],
            ["Learn", "Resonated / not today / completed update future ranking."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-zinc-200 p-5">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">
                Step {i + 1}
              </div>
              <div className="mt-1 text-xl font-semibold">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{d}</p>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-zinc-500">
          Gemini is used for embeddings (and can enrich retrieval later). Groq
          runs the language agents. Ranking itself is not left to the LLM.
        </p>
      </div>
    </div>
  );
}
