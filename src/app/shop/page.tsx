"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  ChevronDown,
  ExternalLink,
  Lock,
  Radar,
  Shirt,
  Sparkles,
  Unlock,
} from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  GarmentMockup,
  GARMENT_COLOR_OPTIONS,
  type GarmentColor,
  type GarmentKind,
} from "@/components/shop/GarmentMockup";
import { DiaryPreview } from "@/components/shop/DiaryPreview";
import { HoverExplain } from "@/components/HoverExplain";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  PRODUCT_OCCASIONS,
  type MerchOccasion,
} from "@/lib/shop/contextual";

const AXIS_HOVER: Record<string, string> = {
  energy:
    "0 = calm apparel, 1 = intense. Set by keyword rules on Me/I Am/method (e.g. procrast → set 0.30), then early-stage clamp may lower it further. Product value is hand-labeled in catalog.ts.",
  visibility:
    "0 = subtle script, 1 = loud statement. Rules can set/min/max; early stage clamps ≤0.45 so Day-1 users don’t get magazine tees first.",
  discipline:
    "0 = soft daily, 1 = structured. Timeboxing / focus / action words raise this (set or min). BW Crew scores high here.",
  body:
    "0 = reflective lounge, 1 = athletic/movement. Health, fit, body-reset method bump this. Sleeveless hoodie scores high.",
  creativity:
    "0 = classic, 1 = expressive color/art. Creative / art / imagine words raise this. Pink acid / magazine prints score high.",
};

const MERCH_SCORE_HOVER = {
  Style:
    "styleFit = 1 − mean(|yourAxis − productAxis|) across the 5 axes. Closer vectors → higher score. No embeddings.",
  Stage:
    "stageFit = how well this product’s visibility matches your journey stage (early prefers quieter; late prefers louder).",
  Final:
    "final = 0.70×styleFit + 0.30×stageFit. This is what sorts the ranked catalog.",
} as const;

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
  quoteOptions: Array<{
    id: string;
    frontLine: string;
    backLine: string;
    vibe: string;
  }>;
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
    deterministic?: boolean;
    fingerprint?: string;
  };
  styleSystem?: {
    deterministic: boolean;
    axes: Array<{ axis: string; why: string; yourScore: number }>;
    formula: string;
    note: string;
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
  checkpoints?: Array<{
    id: string;
    day: number;
    title: string;
    subtitle: string;
    unlocked: boolean;
    daysRemaining: number;
    priceHint: number;
    unlockCopy: string;
    lockedCopy: string;
    bundle: string;
    product: {
      id: string;
      title: string;
      image: string;
      price: number;
      shopUrl: string;
    } | null;
  }>;
  nextCheckpoint?: {
    id: string;
    day: number;
    title: string;
    daysRemaining: number;
    unlocked: boolean;
  } | null;
  radar?: {
    source: string;
    sampleSize: number;
    livePaths: number;
    demoPaths: number;
    topIAm: Array<{ label: string; count: number }>;
    topMethods: Array<{ label: string; count: number }>;
    stageMix: { early: number; middle: number; late: number };
    meanStyle: StyleVector;
    restock: {
      occasion: string;
      productId: string;
      title: string;
      why: string;
    };
    founderBlurb: string;
  };
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
    id: "catalog",
    label: "Ranked IABTM shop",
    hint: "Existing pieces — why this fits your path",
    Icon: Shirt,
  },
  {
    id: "custom",
    label: "Aspirational Path Edition",
    hint: "I Am quotes only · never Me friction on apparel",
    Icon: Sparkles,
  },
  {
    id: "diary",
    label: "Physical Path Diary",
    hint: "Private hardcover · Me→I Am stays here",
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
  const [view, setView] = useState<ViewId>("catalog");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [occasionFilter, setOccasionFilter] = useState<MerchOccasion | null>(
    null,
  );

  // Live customization — garment + curated quote (not free Me→I Am text)
  const [garment, setGarment] = useState<GarmentKind>("tee");
  const [color, setColor] = useState<GarmentColor>("bone");
  const [quoteId, setQuoteId] = useState("iam-mark");
  const [side, setSide] = useState<"front" | "back">("front");
  const [showRadar, setShowRadar] = useState(true);
  const [showAxes, setShowAxes] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

      const params = new URLSearchParams(window.location.search);
      const focusId = params.get("focus");
      const occasion = params.get("occasion") as MerchOccasion | null;
      const validOccasion =
        occasion &&
        [
          "movement",
          "outdoor",
          "calm",
          "discipline",
          "statement",
          "daily",
          "creative",
        ].includes(occasion)
          ? occasion
          : null;

      let drop: DropItem[] = json.drop ?? [];
      if (validOccasion) {
        drop = [...drop].sort((a, b) => {
          const ao = PRODUCT_OCCASIONS[a.id]?.includes(validOccasion) ? 1 : 0;
          const bo = PRODUCT_OCCASIONS[b.id]?.includes(validOccasion) ? 1 : 0;
          return bo - ao;
        });
        setOccasionFilter(validOccasion);
        setView("catalog");
      }

      setData({ ...json, drop });
      const focused = focusId
        ? drop.find((d) => d.id === focusId) ??
          json.drop?.find((d: DropItem) => d.id === focusId)
        : null;
      setSelected(focused ?? drop[0] ?? json.hero);
      if (focused || validOccasion) setView("catalog");
      setGarment(json.custom.garment);
      setColor(json.custom.color);
      setQuoteId(json.custom.quoteOptions?.[0]?.id ?? "iam-mark");
    })();
  }, []);

  const active = selected ?? data?.hero ?? null;
  const currentView = VIEWS.find((v) => v.id === view)!;
  const selectedQuote =
    data?.custom.quoteOptions.find((q) => q.id === quoteId) ??
    data?.custom.quoteOptions[0] ??
    null;
  const frontLine = selectedQuote?.frontLine ?? data?.custom.frontLine ?? "";
  const backLine = selectedQuote?.backLine ?? data?.custom.backLine ?? "";
  const price =
    view === "custom"
      ? data?.custom.price
      : view === "diary"
        ? data?.diary.price
        : active?.price;

  return (
    <DashboardShell name={name} avatarUrl={avatarUrl} title="Becoming Drop">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Hero — no overflow-hidden (was clipping the dropdown) */}
        <section className="rounded-[28px] border border-zinc-200 bg-[#f7f4ef]">
          <div className="p-6 sm:p-8">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Becoming Drop · one path, three buyable outputs
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Merch from your identity — not a generic shop.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">
              We sell real IABTM pieces ranked to your path — and surface them
              next to your activities (walk → movement gear). Path Edition prints
              only aspirational I Am energy — never “I used to procrastinate.”
            </p>

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
          </div>
        </section>

        {/* View picker sits ABOVE content with its own stacking context */}
        <div ref={menuRef} className="relative z-50 max-w-md">
          <label className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
            Showing
          </label>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
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
                "h-4 w-4 shrink-0 text-zinc-400 transition",
                menuOpen && "rotate-180",
              )}
            />
          </button>
          {menuOpen && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
            >
              {VIEWS.map((v) => (
                <li key={v.id} role="option" aria-selected={view === v.id}>
                  <button
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
                </li>
              ))}
            </ul>
          )}
        </div>

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

        {/* Checkpoint Drops */}
        {data?.checkpoints && (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                  Retention × revenue
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Checkpoint Drops
                </h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-500">
                  Day 11 / 37 / 74 / 111 unlock exclusive IABTM pieces. Progress
                  on the path becomes a purchase moment.
                </p>
              </div>
              {data.nextCheckpoint && !data.nextCheckpoint.unlocked && (
                <div className="rounded-2xl bg-[#f7f4ef] px-4 py-2 text-sm">
                  Next: <strong>{data.nextCheckpoint.title}</strong>
                  <span className="text-zinc-500">
                    {" "}
                    · {data.nextCheckpoint.daysRemaining}d left
                  </span>
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.checkpoints.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-2xl border p-3",
                    c.unlocked
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 bg-white opacity-80",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      Day {c.day}
                    </div>
                    {c.unlocked ? (
                      <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-zinc-400" />
                    )}
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug">
                    {c.title}
                  </div>
                  {c.product && (
                    <div className="relative mt-3 aspect-square overflow-hidden rounded-xl bg-[#ece8e2]">
                      <Image
                        src={c.product.image}
                        alt={c.product.title}
                        fill
                        className={cn(
                          "object-contain p-2",
                          !c.unlocked && "opacity-40 grayscale",
                        )}
                        sizes="200px"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                    {c.unlocked ? c.unlockCopy : c.lockedCopy}
                  </p>
                  {c.unlocked && c.product ? (
                    <button
                      type="button"
                      onClick={() => {
                        const item = data.drop.find(
                          (d) => d.id === c.product?.id,
                        );
                        if (item) {
                          setSelected(item);
                          setView("catalog");
                        }
                      }}
                      className="mt-2 w-full rounded-full bg-zinc-900 py-1.5 text-xs font-semibold text-white"
                    >
                      Claim · ${c.priceHint.toFixed(0)}
                    </button>
                  ) : (
                    <div className="mt-2 text-center text-[10px] text-zinc-400">
                      {c.daysRemaining} days to unlock
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Demand Radar — IABTM founders */}
        {data?.radar && (
          <section className="rounded-[28px] border border-zinc-200 bg-[#171717] p-5 text-white sm:p-6">
            <button
              type="button"
              onClick={() => setShowRadar((s) => !s)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-zinc-400" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    For IABTM · merch intelligence
                  </div>
                  <div className="font-display text-xl font-bold">
                    Demand Radar
                  </div>
                </div>
              </div>
              <span className="text-xs text-zinc-500">
                {showRadar ? "Hide" : "Show"}
              </span>
            </button>
            {showRadar && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-zinc-300">{data.radar.founderBlurb}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Sample
                    </div>
                    <div className="mt-1 text-lg font-semibold">
                      {data.radar.sampleSize} paths
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {data.radar.livePaths} live · {data.radar.demoPaths} demo ·{" "}
                      {data.radar.source}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Top I Am
                    </div>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {data.radar.topIAm.slice(0, 3).map((t) => (
                        <li key={t.label}>
                          {t.label}{" "}
                          <span className="text-zinc-500">×{t.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <div className="text-[10px] uppercase text-zinc-500">
                      Restock signal
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {data.radar.restock.title}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {data.radar.restock.why}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  <span>
                    Stage mix: early {data.radar.stageMix.early} · mid{" "}
                    {data.radar.stageMix.middle} · late{" "}
                    {data.radar.stageMix.late}
                  </span>
                  <span>·</span>
                  <span>
                    Methods:{" "}
                    {data.radar.topMethods
                      .slice(0, 3)
                      .map((m) => m.label)
                      .join(", ")}
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Deterministic axes explain */}
        {data?.styleSystem && (
          <section className="rounded-[28px] border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setShowAxes((s) => !s)}
              className="flex w-full items-center justify-between px-5 py-4 text-left sm:px-6"
            >
              <div>
                <div className="text-sm font-semibold">
                  Style axes · deterministic
                </div>
                <div className="text-xs text-zinc-500">
                  Same path → same vector · no LLM in scoring
                </div>
              </div>
              <span className="text-xs text-zinc-400">
                {showAxes ? "Hide" : "Show"}
              </span>
            </button>
            {showAxes && (
              <div className="space-y-3 border-t border-zinc-100 px-5 py-4 sm:px-6">
                <p className="text-sm text-zinc-600">{data.styleSystem.note}</p>
                <div className="grid gap-2 sm:grid-cols-5">
                  {data.styleSystem.axes.map((a) => (
                    <HoverExplain
                      key={a.axis}
                      label={a.axis}
                      explain={
                        AXIS_HOVER[a.axis] ??
                        `${a.why} Your score ${a.yourScore.toFixed(2)} came from the deterministic rule table + stage clamp — not an LLM.`
                      }
                      className="block"
                      side="bottom"
                    >
                      <div className="cursor-help rounded-xl bg-[#f7f4ef] px-3 py-2 ring-1 ring-transparent hover:ring-zinc-300">
                        <div className="text-[10px] uppercase text-zinc-400 underline decoration-dotted">
                          {a.axis}
                        </div>
                        <div className="font-display text-lg font-bold tabular-nums">
                          {a.yourScore.toFixed(2)}
                        </div>
                        <div className="mt-1 text-[10px] leading-snug text-zinc-500">
                          {a.why}
                        </div>
                      </div>
                    </HoverExplain>
                  ))}
                </div>
                {data.styleProfile.fingerprint && (
                  <p className="truncate font-mono text-[10px] text-zinc-400">
                    fingerprint: {data.styleProfile.fingerprint}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* ========== ASPIRATIONAL PATH EDITION ========== */}
        {data && view === "custom" && (
          <section className="relative z-0 overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-teal-700/80">
                    Aspirational only · Me friction stays in the diary
                  </div>
                  <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
                    {frontLine} Path Edition
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-zinc-500">
                    {data.custom.why}
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
                        `Print brief:\n${garment} / ${color}\nFront: ${frontLine}\nBack: ${backLine}\n→ Partner prints & ships.`,
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
                  frontLine={frontLine}
                  backLine={backLine}
                  edition={data.custom.edition}
                  className="mx-auto"
                />
              </div>

              <div className="space-y-5 p-5 sm:p-7">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Curated quote (pick one — not free-text)
                  </div>
                  <div className="mt-2 space-y-2">
                    {data.custom.quoteOptions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setQuoteId(q.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                          quoteId === q.id
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:border-zinc-400",
                        )}
                      >
                        <div className="text-sm font-semibold">{q.frontLine}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          Back: {q.backLine}
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-400">
                          {q.vibe}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

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
                          "h-9 w-9 rounded-full border border-zinc-200 ring-2 ring-offset-2",
                          color === c.id ? "ring-zinc-900" : "ring-transparent",
                          c.id === "white" && "border-zinc-300",
                        )}
                        style={{ background: c.swatch }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f7f4ef] p-4 text-xs leading-relaxed text-zinc-600">
                  <strong className="text-zinc-800">Product rule</strong>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Apparel shows I Am / method energy only.</li>
                    <li>Me → I Am arc lives in the private Path Diary.</li>
                    <li>Primary revenue: ranked IABTM catalog + activity merch.</li>
                    <li>Path Edition = optional POD for partners.</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========== CATALOG ========== */}
        {data && view === "catalog" && active && (
          <section className="space-y-4">
            {occasionFilter && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-600">
                <span>
                  From your activity · showing{" "}
                  <strong className="font-semibold text-zinc-900">
                    {occasionFilter}
                  </strong>{" "}
                  pieces first
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOccasionFilter(null);
                    window.history.replaceState({}, "", "/shop");
                  }}
                  className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
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
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">
                          Axis comparison · hover for how each axis is set
                        </div>
                        {active.explain.axisDeltas.map((d) => (
                          <HoverExplain
                            key={d.axis}
                            label={d.axis}
                            explain={`${AXIS_HOVER[d.axis] ?? d.axis} Gap = |you − item| = ${d.gap.toFixed(2)}. Average gap across 5 axes feeds styleFit.`}
                            className="block w-full"
                            side="top"
                          >
                            <div className="flex cursor-help gap-2 capitalize rounded-lg px-1 py-0.5 hover:bg-white/70">
                              <span className="w-20 text-zinc-500 underline decoration-dotted">
                                {d.axis}
                              </span>
                              <span>
                                you {d.user.toFixed(2)} vs item{" "}
                                {d.product.toFixed(2)}
                              </span>
                              <span className="ml-auto text-zinc-400">
                                gap {d.gap.toFixed(2)}
                              </span>
                            </div>
                          </HoverExplain>
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
                          <HoverExplain
                            key={l}
                            label={l}
                            explain={MERCH_SCORE_HOVER[l]}
                            className="justify-center"
                            side="top"
                          >
                            <div className="cursor-help">
                              <div className="text-zinc-400 underline decoration-dotted">
                                {l}
                              </div>
                              <div className="font-display text-lg font-bold tabular-nums">
                                {v.toFixed(2)}
                              </div>
                            </div>
                          </HoverExplain>
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
