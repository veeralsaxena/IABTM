/**
 * Demand Radar — anonymized aggregate of path style profiles.
 * Tells IABTM what to restock / design next.
 *
 * Uses live active paths when SERVICE_ROLE is available;
 * otherwise blends live-readable paths with a fixed demo cohort
 * (deterministic seed personas — still useful for finals demo).
 */

import {
  buildUserStyleProfile,
  type PathShopInput,
} from "@/lib/shop/style-profile";
import { STYLE_AXES, type StyleAxis, type StyleVector } from "@/lib/shop/styles";
import { PRODUCT_OCCASIONS, type MerchOccasion } from "@/lib/shop/contextual";
import { IABTM_MERCH } from "@/lib/shop/catalog";
import { emptyVector } from "@/lib/shop/styles";

export type RadarPathRow = {
  me_labels: string[] | null;
  iam_labels: string[] | null;
  method: string;
  day_number: number;
  total_days: number;
};

/** Fixed demo cohort — deterministic stand-ins for typical IABTM users */
export const DEMO_COHORT: PathShopInput[] = [
  {
    name: "A",
    me: ["Procrastinating"],
    iam: ["Action-oriented"],
    method: "Timeboxing",
    day: 12,
    totalDays: 111,
  },
  {
    name: "B",
    me: ["Scattered"],
    iam: ["Focused"],
    method: "Habit stacking",
    day: 40,
    totalDays: 111,
  },
  {
    name: "C",
    me: ["Anxious"],
    iam: ["Calm"],
    method: "Stoic reflection",
    day: 8,
    totalDays: 111,
  },
  {
    name: "D",
    me: ["Stuck"],
    iam: ["Creative"],
    method: "Daily creation",
    day: 55,
    totalDays: 111,
  },
  {
    name: "E",
    me: ["Inactive"],
    iam: ["Energized"],
    method: "Body reset",
    day: 22,
    totalDays: 111,
  },
  {
    name: "F",
    me: ["Inconsistent"],
    iam: ["Disciplined"],
    method: "Timeboxing",
    day: 78,
    totalDays: 111,
  },
  {
    name: "G",
    me: ["Comparing"],
    iam: ["Confident"],
    method: "Accountability",
    day: 95,
    totalDays: 111,
  },
];

function rowToInput(row: RadarPathRow): PathShopInput {
  return {
    name: "anon",
    me: row.me_labels ?? [],
    iam: row.iam_labels ?? [],
    method: row.method,
    day: row.day_number,
    totalDays: row.total_days || 111,
  };
}

function topCounts(items: string[], n = 5) {
  const map = new Map<string, number>();
  for (const i of items) {
    const k = i.trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function meanVector(vectors: StyleVector[]): StyleVector {
  const out = emptyVector();
  if (!vectors.length) return out;
  for (const axis of STYLE_AXES) {
    out[axis] =
      Math.round(
        (vectors.reduce((s, v) => s + v[axis], 0) / vectors.length) * 100,
      ) / 100;
  }
  return out;
}

function recommendSilhouette(mean: StyleVector): {
  occasion: MerchOccasion;
  productId: string;
  title: string;
  why: string;
} {
  let occasion: MerchOccasion = "daily";
  let why = "Balanced demand — daily identity layer.";

  if (mean.body >= 0.65) {
    occasion = "movement";
    why = "High body axis across cohort → restock athletic / sleeveless.";
  } else if (mean.discipline >= 0.65) {
    occasion = "discipline";
    why = "High discipline → structured crews & daily focus wear.";
  } else if (mean.creativity >= 0.65 || mean.visibility >= 0.65) {
    occasion = "statement";
    why = "High visibility/creativity → statement & expressive prints.";
  } else if (mean.energy <= 0.4) {
    occasion = "calm";
    why = "Low energy cohort → calm script / soft entry tees.";
  }

  const match =
    IABTM_MERCH.find((p) => PRODUCT_OCCASIONS[p.id]?.includes(occasion)) ??
    IABTM_MERCH[0]!;

  return {
    occasion,
    productId: match.id,
    title: match.title,
    why,
  };
}

export type DemandRadar = {
  source: "live+demo" | "live" | "demo";
  sampleSize: number;
  livePaths: number;
  demoPaths: number;
  topIAm: Array<{ label: string; count: number }>;
  topMe: Array<{ label: string; count: number }>;
  topMethods: Array<{ label: string; count: number }>;
  stageMix: { early: number; middle: number; late: number };
  meanStyle: StyleVector;
  axisLeaders: Array<{ axis: StyleAxis; value: number }>;
  restock: {
    occasion: MerchOccasion;
    productId: string;
    title: string;
    why: string;
  };
  founderBlurb: string;
};

export function buildDemandRadar(
  liveRows: RadarPathRow[],
  opts?: { includeDemo?: boolean },
): DemandRadar {
  const includeDemo = opts?.includeDemo ?? liveRows.length < 8;
  const liveInputs = liveRows.map(rowToInput);
  const demoInputs = includeDemo ? DEMO_COHORT : [];
  const all = [...liveInputs, ...demoInputs];

  const profiles = all.map((input) => buildUserStyleProfile(input));
  const meanStyle = meanVector(profiles.map((p) => p.vector));
  const restock = recommendSilhouette(meanStyle);

  const stageMix = { early: 0, middle: 0, late: 0 };
  for (const p of profiles) stageMix[p.stage] += 1;

  const topIAm = topCounts(all.flatMap((i) => i.iam));
  const topMe = topCounts(all.flatMap((i) => i.me));
  const topMethods = topCounts(all.map((i) => i.method));

  const axisLeaders = STYLE_AXES.map((axis) => ({
    axis,
    value: meanStyle[axis],
  })).sort((a, b) => b.value - a.value);

  const source =
    liveInputs.length && demoInputs.length
      ? "live+demo"
      : liveInputs.length
        ? "live"
        : "demo";

  const founderBlurb = `This week’s cohort leans ${axisLeaders[0]?.axis ?? "daily"} (${(
    (axisLeaders[0]?.value ?? 0.5) * 100
  ).toFixed(0)}%). Top I Am: ${topIAm[0]?.label ?? "—"}. Restock signal: ${restock.title}.`;

  return {
    source,
    sampleSize: all.length,
    livePaths: liveInputs.length,
    demoPaths: demoInputs.length,
    topIAm,
    topMe,
    topMethods,
    stageMix,
    meanStyle,
    axisLeaders,
    restock,
    founderBlurb,
  };
}
