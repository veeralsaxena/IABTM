"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  ChevronDown,
  ExternalLink,
  Shirt,
  Sparkles,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  GarmentMockup,
  GARMENT_COLOR_OPTIONS,
  type GarmentColor,
  type GarmentKind,
} from "@/components/shop/GarmentMockup";
import { DiaryPreview } from "@/components/shop/DiaryPreview";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type StyleVector = Record<string, number>;

type DropItem = {
  id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  kind: string;
  style: { labels: string[]; vector: StyleVector; colorway: string };
  shopUrl: string;
  scores: { styleFit: number; stageFit: number; final: number };
  why: string;
  pathPrint: { frontLine: string; backLine: string; edition: string };
  explain: {
    userLabels: string[];
    productLabels: string[];
    axisDeltas: Array<{
      axis: string;
      user: number;
      product: number;
      gap: number;
    }>;
    stageRule: string;
    formula: string;
  };
};

type CustomEdition = {
  id: string;
  title: string;
  garment: "tee" | "hoodie";
  color: "ink" | "bone" | "forest";
  price: number;
  frontLine: string;
  backLine: string;
  sleeveHint: string;
  edition: string;
  why: string;
  partnerNote: string;
};

type Diary = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  coverName: string;
  coverArc: string;
  dayMarker: string;
  method: string;
  pages: number;
  binding: string;
  ships: string[];
  prompts: Array<{ dayLabel: string; prompt: string }>;
  insides: string[];
  why: string;
  fulfillment: string;
};

type ShopPayload = {
  path: {
    name: string;
    me: string[];
    iam: string[];
    method: string;
    day: number;
    totalDays: number;
  };
  styleProfile: {
    vector: StyleVector;
    labels: string[];
    stage: string;
    rationale: string[];
  };
  howItWorks: {
    industry: string;
    inputs: string[];
    process: string;
    outputs: string[];
    formula: string;
  };
  custom: CustomEdition;
  diary: Diary;
  hero: DropItem | null;
  drop: DropItem[];
  storeUrl: string;
};

type ViewId = "custom" | "catalog" | "diary";

const VIEWS: Array<{
  id: ViewId;
  label: string;
  hint: string;
  Icon: typeof Shirt;
}> = [
  {
    id: "custom",
    label: "Custom Path Edition",
    hint: "New design from your path · partner prints it",
    Icon: Sparkles,
  },
  {
    id: "catalog",
    label: "Ranked IABTM shop",
    hint: "Existing pieces scored to your style",
    Icon: Shirt,
  },
  {
    id: "diary",
    label: "Physical Path Diary",
    hint: "Hardcover that ships to your home",
    Icon: BookMarked,
  },
];

export default function ShopPage() {
  const [name, setName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [data, setData] = useState<ShopPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DropItem | null>(null);
  const [view, setView] = useState<ViewId>("custom");
  const [menuOpen, setMenuOpen] = useState(false);

  // Live customization (before partner print)
  const [garment, setGarment] = useState<GarmentKind>("tee");
  const [color, setColor] = useState<GarmentColor>("bone");
  const [frontLine, setFrontLine] = useState("");
  const [backLine, setBackLine] = useState("");
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    (async () => {
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
      if (!profile?.onboarding_complete) {
        window.location.href = "/onboarding";
        return;
      }
      setName(profile.display_name ?? null);
      setAvatarUrl(profile.avatar_url ?? null);

      const res = await fetch("/api/shop");
      const json = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(json.error || "Could not load your Becoming Drop");
        return;
      }
      setData(json);
      setSelected(json.hero);
      setGarment(json.custom.garment);
      setColor(json.custom.color);
      setFrontLine(json.custom.frontLine);
      setBackLine(json.custom.backLine);
    })();
  }, []);

  const active = selected ?? data?.hero ?? null;
  const currentView = VIEWS.find((v) => v.id === view)!;
  const price =
    view === "custom"
      ? data?.custom.price
      : view === "diary"
        ? data?.diary.price
        : active?.price;

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl} title="Becoming Drop">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Single hero — one composition */}
        <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-[#f7f4ef]">
          <div className="p-6 sm:p-8">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Becoming Drop · one path, three buyable outputs
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Merch from your identity — not a generic shop.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              Same Me → I Am path powers everything below. Pick what you want to
              see; you never leave this page.
            </p>

            {/* Step flow — production logic, plain English */}
            {data && (
              <ol className="mt-6 grid gap-2 sm:grid-cols-4">
                {[
                  {
                    n: "1",
                    t: "Start",
                    d: `${data.path.me[0]} → ${data.path.iam[0]} · ${data.path.method} · Day ${data.path.day}`,
                  },
                  {
                    n: "2",
                    t: "Style profile",
                    d: data.styleProfile.labels.slice(0, 3).join(", "),
                  },
                  {
                    n: "3",
                    t: "Match / design",
                    d: "Score catalog OR generate Path Edition print brief",
                  },
                  {
                    n: "4",
                    t: "Fulfill",
                    d: "Buy on IABTM shop · or POD partner prints & ships",
                  },
                ].map((s) => (
                  <li
                    key={s.n}
                    className="rounded-2xl bg-white/80 px-3 py-3 ring-1 ring-zinc-200/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                        {s.n}
                      </span>
                      <span className="text-xs font-semibold text-zinc-800">
                        {s.t}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                      {s.d}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            {/* Dropdown — stays on one page */}
            <div className="relative mt-6 max-w-md">
              <label className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                Showing
              </label>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="mt-1 flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <currentView.Icon className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {currentView.label}
                    </div>
                    <div className="text-xs text-zinc-500">{currentView.hint}</div>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-zinc-400 transition",
                    menuOpen && "rotate-180",
                  )}
                />
              </button>
              {menuOpen && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
                  {VIEWS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setView(v.id);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50",
                        view === v.id && "bg-zinc-50",
                      )}
                    >
                      <v.Icon className="mt-0.5 h-4 w-4 text-zinc-500" />
                      <div>
                        <div className="text-sm font-semibold">{v.label}</div>
                        <div className="text-xs text-zinc-500">{v.hint}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-14 text-center text-sm text-zinc-500">
            Building your style profile…
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            {error}{" "}
            <Link href="/paths" className="font-semibold underline">
              Open paths
            </Link>
          </div>
        )}

        {/* ========== CUSTOM PATH EDITION ========== */}
        {data && view === "custom" && (
          <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-teal-700/80">
                    Not in the IABTM shop yet · partner-makeable
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                    {frontLine || data.custom.frontLine} Path Edition
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-zinc-500">
                    We turn your path into a print brief. Customize color & copy
                    below — this is the mockup a Printful-style partner would
                    manufacture.
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-bold">
                    ${(price ?? 38).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        `Print brief ready:\n${garment} / ${color}\nFront: ${frontLine}\nBack: ${backLine}\n→ Send to Printful / apparel partner → ship.`,
                      )
                    }
                    className="mt-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Request partner print
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Visible garment */}
              <div className="bg-[#ece8e2] p-6 sm:p-8">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    Live garment preview
                  </div>
                  <div className="flex rounded-full bg-white/80 p-0.5 ring-1 ring-zinc-200">
                    {(["front", "back"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSide(s)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                          side === s
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-600",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <GarmentMockup
                  kind={garment}
                  color={color}
                  side={side}
                  frontLine={frontLine || data.custom.frontLine}
                  backLine={backLine || data.custom.backLine}
                  edition={data.custom.edition}
                  sleeveHint={data.custom.sleeveHint}
                  className="mx-auto max-w-[340px]"
                />
                <p className="mt-3 text-center text-[11px] text-zinc-500">
                  SVG garment + print overlay — same pattern POD checkouts use
                  before factory photos exist.
                </p>
              </div>

              {/* Customize */}
              <div className="space-y-5 p-5 sm:p-7">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Garment
                  </div>
                  <div className="mt-2 flex gap-2">
                    {(["tee", "hoodie"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setGarment(k)}
                        className={cn(
                          "rounded-full px-4 py-2 text-sm font-semibold capitalize",
                          garment === k
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-700",
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Color
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {GARMENT_COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        onClick={() => setColor(c.id)}
                        className={cn(
                          "h-9 w-9 rounded-full ring-2 ring-offset-2",
                          color === c.id ? "ring-zinc-900" : "ring-transparent",
                        )}
                        style={{ background: c.swatch }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Front print (from your I Am)
                  </label>
                  <input
                    value={frontLine}
                    onChange={(e) => setFrontLine(e.target.value.toUpperCase())}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-zinc-400"
                    maxLength={28}
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Back print (Me → I Am)
                  </label>
                  <input
                    value={backLine}
                    onChange={(e) => setBackLine(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-400"
                    maxLength={40}
                  />
                </div>

                <div className="rounded-2xl bg-[#f7f4ef] p-4 text-xs leading-relaxed text-zinc-600">
                  <strong className="text-zinc-800">How we generate this</strong>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Read path: Me, I Am, method, day.</li>
                    <li>Build style vector → pick tee vs hoodie, default color.</li>
                    <li>Front = I Am · Back = Me → I Am · sleeve = method.</li>
                    <li>You edit here → print brief → partner manufactures.</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========== CATALOG ========== */}
        {data && view === "catalog" && active && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              These SKUs already exist on{" "}
              <a
                href={data.storeUrl}
                className="font-semibold text-zinc-900 underline"
                target="_blank"
                rel="noreferrer"
              >
                iambetterthanme.com/shop
              </a>
              . We score each against your style vector (
              <span className="font-mono text-xs">
                final = 0.70×styleFit + 0.30×stageFit
              </span>
              ). Highest first.
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <article className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
                <div className="grid md:grid-cols-2">
                  <div className="relative min-h-[280px] bg-[#ece8e2]">
                    <Image
                      src={active.image}
                      alt={active.title}
                      fill
                      className="object-contain p-6"
                      sizes="40vw"
                      priority
                    />
                  </div>
                  <div className="flex flex-col justify-between p-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold">
                        {active.title}
                      </h2>
                      <p className="mt-2 text-sm text-zinc-500">{active.why}</p>
                      <div className="mt-4 space-y-1.5 rounded-2xl bg-[#f7f4ef] p-3 text-[11px]">
                        {active.explain.axisDeltas.map((d) => (
                          <div key={d.axis} className="flex gap-2 capitalize">
                            <span className="w-20 text-zinc-500">{d.axis}</span>
                            <span>
                              you {d.user.toFixed(2)} vs item{" "}
                              {d.product.toFixed(2)}
                            </span>
                            <span className="ml-auto text-zinc-400">
                              gap {d.gap.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
                      <div className="grid grid-cols-3 gap-3 text-center text-xs">
                        {(
                          [
                            ["Style", active.scores.styleFit],
                            ["Stage", active.scores.stageFit],
                            ["Final", active.scores.final],
                          ] as const
                        ).map(([l, v]) => (
                          <div key={l}>
                            <div className="text-zinc-400">{l}</div>
                            <div className="font-display text-lg font-bold tabular-nums">
                              {v.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="font-display text-2xl font-bold">
                          ${active.price.toFixed(2)}
                        </span>
                        <a
                          href={active.shopUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Buy on IABTM <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <aside className="space-y-2">
                {data.drop.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={cn(
                      "flex w-full gap-3 rounded-2xl border bg-white p-3 text-left",
                      active.id === item.id
                        ? "border-zinc-900"
                        : "border-zinc-200 hover:border-zinc-400",
                    )}
                  >
                    <div className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-xl bg-[#ece8e2]">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        className="object-contain p-1"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <div className="truncate text-sm font-semibold">
                          #{i + 1} {item.title}
                        </div>
                        <div className="text-sm font-semibold">
                          ${item.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-900"
                            style={{
                              width: `${Math.round(item.scores.final * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs tabular-nums">
                          {item.scores.final.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </aside>
            </div>
          </section>
        )}

        {/* ========== DIARY ========== */}
        {data && view === "diary" && (
          <section className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
            <div className="grid gap-0 lg:grid-cols-[1fr_1fr]">
              <div className="bg-[#f0ebe3] p-6 sm:p-8">
                <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  Physical hardcover preview · flip the pages
                </div>
                <DiaryPreview
                  coverName={data.diary.coverName}
                  coverArc={data.diary.coverArc}
                  dayMarker={data.diary.dayMarker}
                  method={data.diary.method}
                  prompts={data.diary.prompts}
                />
              </div>

              <div className="flex flex-col justify-between p-6 sm:p-8">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#8a6d2f]">
                    Ships to your home · not a PDF
                  </div>
                  <h2 className="mt-2 font-display text-3xl font-bold">
                    {data.diary.title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">{data.diary.why}</p>

                  <ul className="mt-5 space-y-2">
                    {data.diary.ships.map((s) => (
                      <li
                        key={s}
                        className="flex gap-2 text-sm text-zinc-700"
                      >
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 border-t border-zinc-100 pt-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-xs text-zinc-400">
                        {data.diary.pages} pages · {data.diary.binding}
                      </div>
                      <div className="font-display text-4xl font-bold">
                        ${data.diary.price.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Pre-order = print this diary. PDF → Lulu/Printful hardcover → ship to address.",
                        )
                      }
                      className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
                    >
                      Pre-order physical diary
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-400">
                    {data.diary.fulfillment}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
