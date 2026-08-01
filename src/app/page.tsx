import Link from "next/link";
import Image from "next/image";

const collage = [
  {
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80",
    alt: "People collaborating with focus",
  },
  {
    src: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&q=80",
    alt: "Planning notebook and calendar",
  },
  {
    src: "https://images.unsplash.com/photo-1499728603263-13726abce5fd?w=900&q=80",
    alt: "Quiet reflective moment outdoors",
  },
  {
    src: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&q=80",
    alt: "Music and atmosphere",
  },
];

export default function LandingPage() {
  return (
    <div className="relative z-10">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 md:px-8">
        <header className="flex items-center justify-between">
          <div>
            <div className="font-display text-2xl font-bold text-ink">CURATE</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink-soft/70">
              for IABTM · Hack Better Than Me
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/architecture"
              className="hidden text-sm text-ink-soft hover:text-ink sm:inline"
            >
              How it works
            </Link>
            <Link
              href="/login"
              className="btn-primary rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Start here
            </Link>
          </div>
        </header>

        <section className="reveal mt-14 grid flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-paper-elevated/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Potential over attention
            </p>
            <h1 className="font-display text-5xl font-bold leading-[0.95] text-ink md:text-7xl">
              Media that grows
              <span className="block text-accent">with who you&apos;re becoming</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
              Tell CURATE who you are and who you want to be. It builds a path,
              then picks one piece of media each day — with a reason — so you
              stop scrolling and start becoming.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="btn-primary rounded-full px-6 py-3 text-sm font-semibold"
              >
                Build your path
              </Link>
              <Link
                href="/architecture"
                className="rounded-full border border-line bg-paper-elevated/90 px-6 py-3 text-sm font-medium text-ink"
              >
                See the system
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="agent-orbit absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-signal/25 via-transparent to-accent/30 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-3">
              {collage.map((shot, i) => (
                <div
                  key={shot.src}
                  className={`relative overflow-hidden rounded-2xl border border-line/60 shadow-[var(--shadow)] ${
                    i % 2 === 1 ? "translate-y-6" : ""
                  }`}
                >
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={450}
                    height={560}
                    className="aspect-[4/5] w-full object-cover"
                    priority={i < 2}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-24 overflow-hidden rounded-[2rem] border border-line bg-ink text-paper-elevated">
          <div className="grid md:grid-cols-2">
            <div className="relative min-h-[280px]">
              <Image
                src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&q=80"
                alt="Desk setup for intentional work"
                fill
                className="object-cover opacity-90"
              />
            </div>
            <div className="flex flex-col justify-center p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.18em] text-paper-elevated/60">
                Today&apos;s growth focus
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold md:text-4xl">
                One recommendation.
                <br />
                One clear why.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-paper-elevated/75">
                Identity embedding → vector recall → potential scoring →
                diversity check → explanation. The LLM doesn&apos;t invent the
                catalog; it explains the ranked pick.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Knows your gap",
              body: "Me → I Am attributes become a living identity vector, not a one-time quiz.",
              img: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
            },
            {
              title: "Ranks for growth",
              body: "Scores stage fit, method fit, novelty, and penalizes attention traps.",
              img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
            },
            {
              title: "Learns from you",
              body: "Resonated, not today, and check-ins feed the next day’s curation.",
              img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
            },
          ].map((card, i) => (
            <article
              key={card.title}
              className="reveal overflow-hidden rounded-2xl border border-line bg-paper-elevated/70"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative aspect-[16/10]">
                <Image src={card.img} alt="" fill className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-xl font-semibold text-ink">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {card.body}
                </p>
              </div>
            </article>
          ))}
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-sm text-ink-soft">
          <span>Hack Better Than Me · title sponsor IABTM</span>
          <Link href="/login" className="font-medium text-ink underline-offset-2 hover:underline">
            Enter CURATE →
          </Link>
        </footer>
      </div>
    </div>
  );
}
