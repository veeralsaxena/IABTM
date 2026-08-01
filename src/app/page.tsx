import Link from "next/link";
import Image from "next/image";

/**
 * Landing UI decisions (why):
 * - Light editorial canvas like IABTM (not dark/green “AI product” chrome)
 * - Brand/headline as the hero signal; one short support line; one CTA group
 * - Full-bleed photographic plane instead of inset cards in the first viewport
 * - Later sections each do one job: how it works, curated media preview, people stories
 * - Avoid purple gradients, glow, and overcrowded pill rows
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
          <div>
            <div className="font-display text-2xl font-bold tracking-tight">
              Vector
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              become the self you imagine
            </div>
          </div>
          <div className="flex items-center gap-2">
          <Link
            href="/architecture"
            className="hidden rounded-full px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 sm:inline"
          >
            System design
          </Link>
          <Link
            href="/demo"
            className="hidden rounded-full px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 sm:inline"
          >
            Live demo
          </Link>
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Start here
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=1800&q=80"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#faf9f7] via-[#faf9f7]/88 to-[#faf9f7]/25" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl items-center px-5 py-28 md:px-8">
          <div className="max-w-xl">
            <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
              Become the self
              <span className="mt-1 block">you imagine</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-zinc-600 md:text-xl">
              A guide that turns who you are and who you&apos;re becoming into a
              path — then finds the right media for that moment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white"
              >
                I want to be better
              </Link>
              <Link
                href="/architecture"
                className="rounded-full border border-zinc-300 bg-white/80 px-7 py-3.5 text-sm font-medium backdrop-blur"
              >
                See the system
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            How the path works
          </h2>
          <p className="mt-3 max-w-2xl text-zinc-500">
            Same inputs IABTM-style platforms use — attributes, questions, a
            method — with a live web curator behind the recommendations.
          </p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Plug in who you are",
                d: "Me attributes, I Am attributes, and a few calibrating questions. Skip what you don’t need.",
              },
              {
                n: "02",
                t: "Get your method",
                d: "A path is chosen for the gap between current and imagined self — Timeboxing, Habit Stacking, and more.",
              },
              {
                n: "03",
                t: "Watch what fits today",
                d: "We search YouTube and the web, then rerank for potential — not clickbait — with a clear why-now.",
              },
            ].map((step) => (
              <div key={step.n}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  {step.n}
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold">
                  {step.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#faf9f7]">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                Vector recommends
              </h2>
              <p className="mt-2 text-zinc-500">
                Formats that actually move identity — film, mentors, music,
                practice.
              </p>
            </div>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline"
            >
              Start to unlock yours
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                src: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
                type: "Film",
                title: "The two-minute start",
              },
              {
                src: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80",
                type: "Podcast",
                title: "Deep work conversations",
              },
              {
                src: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
                type: "Music",
                title: "Focus without hype",
              },
              {
                src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
                type: "People",
                title: "Mentors worth following",
              },
            ].map((item) => (
              <article key={item.title} className="group">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-200">
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                  {item.type}
                </div>
                <h3 className="mt-1 font-display text-xl font-semibold leading-snug">
                  {item.title}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            People on the path
          </h2>
          <p className="mt-2 max-w-xl text-zinc-500">
            Not influencer quotes — short notes from people practicing Me → I
            Am in public, the way growth products should feel.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                place: "Austin",
                name: "Maya R.",
                quote:
                  "I stopped scrolling motivation and started one timebox. The media finally matched the day I was actually in.",
              },
              {
                place: "London",
                name: "Jonah K.",
                quote:
                  "Marking activities done changed what showed up next. It felt like the system was watching my practice, not my clicks.",
              },
              {
                place: "Toronto",
                name: "Priya S.",
                quote:
                  "Custom attributes stuck. Seeing them on the path made the recommendations feel like mine.",
              },
            ].map((s) => (
              <blockquote
                key={s.name}
                className="rounded-2xl border border-zinc-200 bg-[#faf9f7] p-5"
              >
                <p className="text-sm leading-relaxed text-zinc-700">
                  “{s.quote}”
                </p>
                <footer className="mt-4 text-sm text-zinc-500">
                  <span className="font-semibold text-zinc-800">{s.name}</span>
                  <span className="mx-1.5">·</span>
                  {s.place}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-zinc-900 text-white">
        <div className="absolute inset-0 opacity-40">
          <Image
            src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1600&q=80"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-zinc-950/70" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 md:px-8">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            You vs you.
            <span className="mt-2 block text-zinc-300">That’s the only race.</span>
          </h2>
          <p className="mt-5 max-w-lg text-zinc-300">
            Build a path. Practice the activities. Let the curator adapt.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-zinc-900"
          >
            Start here
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-[#faf9f7]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-zinc-500 md:px-8">
          <div className="font-display text-lg font-bold text-zinc-900">
            Vector
          </div>
          <div className="flex gap-4">
            <Link href="/architecture">System</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
