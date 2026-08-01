import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-zinc-900">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <header className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">
              CURATE
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              potential over attention
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white"
          >
            Start here
          </Link>
        </header>

        <section className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
              Become the self
              <span className="block text-emerald-800">you imagine</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-500">
              Pick who you are and who you&apos;re becoming. Get a method, then
              one piece of media each day — chosen for growth, with a clear why.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
              >
                Build your path
              </Link>
              <Link
                href="/architecture"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium"
              >
                How it works
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
              "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80",
              "https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=800&q=80",
              "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
            ].map((src, i) => (
              <div
                key={src}
                className={`relative overflow-hidden rounded-2xl ${i % 2 ? "translate-y-5" : ""}`}
              >
                <Image
                  src={src}
                  alt=""
                  width={400}
                  height={500}
                  className="aspect-[4/5] w-full object-cover"
                  priority={i < 2}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "Identity gap",
              d: "Me → I Am attributes become a living vector the curator retrieves against.",
            },
            {
              t: "Potential ranking",
              d: "Deterministic scoring for stage, method, novelty — and penalties for attention traps.",
            },
            {
              t: "Why now",
              d: "An explainer agent turns the ranked pick into a clear reason for today.",
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <h3 className="font-display text-xl font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{c.d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
