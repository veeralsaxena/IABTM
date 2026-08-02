import { IABTM_MERCH, type MerchProduct } from "@/lib/shop/catalog";
import {
  STYLE_AXES,
  emptyVector,
  styleFit,
  type StyleAxis,
  type StyleVector,
} from "@/lib/shop/styles";
import { journeyStage } from "@/lib/utils";

export type PathShopInput = {
  name: string;
  me: string[];
  iam: string[];
  method: string;
  day: number;
  totalDays: number;
  methodRationale?: string | null;
};

export type UserStyleProfile = {
  vector: StyleVector;
  labels: string[];
  stage: "early" | "middle" | "late";
  rationale: string[];
};

export type ScoredMerch = MerchProduct & {
  scores: {
    styleFit: number;
    stageFit: number;
    final: number;
  };
  why: string;
  pathPrint: {
    frontLine: string;
    backLine: string;
    edition: string;
  };
  explain: {
    userLabels: string[];
    productLabels: string[];
    axisDeltas: Array<{ axis: StyleAxis; user: number; product: number; gap: number }>;
    stageRule: string;
    formula: string;
  };
};

/** Custom Path Edition — not in IABTM catalog; POD partners can fulfill. */
export type CustomPathEdition = {
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

export type PathDiary = {
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
  /** What physically ships */
  ships: string[];
  /** What's printed inside */
  prompts: Array<{ dayLabel: string; prompt: string }>;
  insides: string[];
  why: string;
  fulfillment: string;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/**
 * Build a USER style profile from path data.
 * This is content-based filtering — not embeddings, not a neural graph.
 * Giants (Stitch Fix, Nike, Shopify catalogs) use structured attributes +
 * similarity; embeddings help at scale for text/images. For explainable
 * merch, explicit style axes win for demos and partners.
 */
export function buildUserStyleProfile(input: PathShopInput): UserStyleProfile {
  const stage = journeyStage(input.day, input.totalDays);
  const v = emptyVector();
  const labels: string[] = [];
  const rationale: string[] = [];
  const blob = [...input.me, ...input.iam, input.method].join(" ").toLowerCase();

  // Me (current friction) nudges away from intensity early
  if (/procrast|scatter|overwhelm|anxious|burnt|doom|avoid|lazy/.test(blob)) {
    v.energy = 0.3;
    v.visibility = 0.35;
    labels.push("calm-entry");
    rationale.push("Me attributes suggest low-hype, low-pressure pieces.");
  }
  if (/focus|disciplin|consistent|account|action|intent/.test(blob)) {
    v.discipline = 0.75;
    labels.push("structured");
    rationale.push("I Am / method lean toward structured daily wear.");
  }
  if (/calm|mindful|present|ground|resilien|stoic/.test(blob)) {
    v.energy = Math.min(v.energy, 0.35);
    labels.push("calm");
    rationale.push("Calm / mindful path → softer energy on garments.");
  }
  if (/health|energ|fit|shape|athletic|body|movement/.test(blob)) {
    v.body = 0.85;
    v.energy = Math.max(v.energy, 0.65);
    labels.push("athletic");
    rationale.push("Body / energy goals boost athletic silhouettes.");
  }
  if (/creat|curious|imagin|stuck|perfect|compar|art/.test(blob)) {
    v.creativity = 0.85;
    v.visibility = Math.max(v.visibility, 0.65);
    labels.push("expressive");
    rationale.push("Creative becoming → more expressive / visible designs.");
  }
  if (/confiden|courage|connect|future|action-oriented/.test(blob)) {
    v.visibility = Math.max(v.visibility, 0.7);
    labels.push("visible");
    rationale.push("Confidence / courage → more visible identity prints.");
  }
  if (/timebox|habit|atomic|deep/.test(input.method.toLowerCase())) {
    v.discipline = Math.max(v.discipline, 0.7);
    labels.push("method-discipline");
    rationale.push(`${input.method} maps to disciplined, wearable-daily pieces.`);
  }
  if (/body|reset/.test(input.method.toLowerCase())) {
    v.body = Math.max(v.body, 0.8);
    labels.push("method-body");
  }

  if (stage === "early") {
    v.visibility = Math.min(v.visibility, 0.45);
    v.energy = Math.min(v.energy, 0.45);
    labels.push("early-stage");
    rationale.push("Early stage: prefer subtle over loud statement merch.");
  } else if (stage === "late") {
    v.visibility = Math.max(v.visibility, 0.65);
    labels.push("late-stage");
    rationale.push("Late stage: statement pieces as identity evidence.");
  }

  return {
    vector: v,
    labels: [...new Set(labels)],
    stage,
    rationale,
  };
}

function stageFitScore(
  stage: UserStyleProfile["stage"],
  product: MerchProduct,
): number {
  const vis = product.style.vector.visibility;
  if (stage === "early") return clamp01(1 - Math.abs(vis - 0.35));
  if (stage === "late") return clamp01(1 - Math.abs(vis - 0.75));
  return clamp01(1 - Math.abs(vis - 0.55));
}

export function scoreMerchForPath(input: PathShopInput): {
  profile: UserStyleProfile;
  ranked: ScoredMerch[];
} {
  const profile = buildUserStyleProfile(input);
  const iamPrimary = input.iam[0] ?? "Becoming";
  const mePrimary = input.me[0] ?? "Starting";

  const ranked = IABTM_MERCH.map((p) => {
    const sFit = styleFit(profile.vector, p.style.vector);
    const stFit = stageFitScore(profile.stage, p);
    // Industry hybrid: primarily style-vector match, stage as secondary gate
    const final = clamp01(0.7 * sFit + 0.3 * stFit);

    const axisDeltas = STYLE_AXES.map((axis) => ({
      axis,
      user: Number(profile.vector[axis].toFixed(2)),
      product: Number(p.style.vector[axis].toFixed(2)),
      gap: Number(Math.abs(profile.vector[axis] - p.style.vector[axis]).toFixed(2)),
    }));

    return {
      ...p,
      scores: {
        styleFit: Number(sFit.toFixed(3)),
        stageFit: Number(stFit.toFixed(3)),
        final: Number(final.toFixed(3)),
      },
      why: `Style match ${(sFit * 100).toFixed(0)}% to your profile (${profile.labels.slice(0, 3).join(", ")}). Stage=${profile.stage}.`,
      pathPrint: {
        frontLine: iamPrimary.toUpperCase(),
        backLine: `${mePrimary} → ${iamPrimary} · ${input.method}`,
        edition: `Path Edition · Day ${input.day}`,
      },
      explain: {
        userLabels: profile.labels,
        productLabels: p.style.labels,
        axisDeltas,
        stageRule:
          profile.stage === "early"
            ? "Early: reward lower-visibility / calmer pieces."
            : profile.stage === "late"
              ? "Late: reward higher-visibility statement pieces."
              : "Middle: balanced visibility.",
        formula: "final = 0.70×styleFit + 0.30×stageFit  (styleFit = 1 − mean|userAxis−productAxis|)",
      },
    } satisfies ScoredMerch;
  }).sort((a, b) => b.scores.final - a.scores.final);

  return { profile, ranked };
}

/**
 * Generate a custom Path Edition garment that is NOT in the IABTM catalog.
 * UI renders a live mockup; partners (Printful / apparel factory) can print it.
 */
export function buildCustomPathEdition(input: PathShopInput): CustomPathEdition {
  const profile = buildUserStyleProfile(input);
  const iam = input.iam[0] ?? "Becoming";
  const me = input.me[0] ?? "Starting";
  const athletic = profile.vector.body > 0.65;
  const calm = profile.vector.energy < 0.4;

  return {
    id: `custom-${input.day}-${iam.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${iam} Path Edition ${athletic ? "Hoodie" : "Tee"}`,
    garment: athletic ? "hoodie" : "tee",
    color: calm ? "bone" : athletic ? "forest" : "ink",
    price: athletic ? 64 : 38,
    frontLine: iam.toUpperCase(),
    backLine: `${me} → ${iam}`,
    sleeveHint: input.method,
    edition: `Day ${input.day} / ${input.totalDays}`,
    why: `Generated from your style profile (${profile.labels.join(", ")}). This SKU does not exist in the IABTM shop yet — it’s a POD Path Edition partners can manufacture.`,
    partnerNote:
      "Fulfillment path: export print file → Printful / custom apparel partner → ship. Mockup here is the design brief.",
  };
}

function promptsForMethod(method: string, iam: string, me: string) {
  const base = [
    `What is one controllable action I’ll finish in 15 minutes toward becoming ${iam}?`,
    `Where did I act like “${me}” today — and where did I act like “${iam}”?`,
    `What would my ${iam} self refuse to scroll past tonight?`,
    `Name one friction I can remove before tomorrow morning.`,
    `What evidence do I already have that I’m shifting toward ${iam}?`,
    `Who could witness one small win this week?`,
    `Write the sentence I want on next month’s Path Edition cover.`,
  ];
  if (/timebox|habit/i.test(method)) {
    base[0] = `Timebox: which single block will I protect today for ${iam}?`;
  }
  if (/stoic|mindful/i.test(method)) {
    base[0] = `What is in my control today on the path from ${me} to ${iam}?`;
  }
  if (/body|reset/i.test(method)) {
    base[0] = `Body-first: what 10-minute movement proves I’m becoming ${iam}?`;
  }
  return base;
}

/**
 * Physical personalized diary (POD), like FNP journals — but identity-native.
 * Pre-order CTA = demo intent to order a printed book that ships to their home.
 */
export function buildPathDiary(input: PathShopInput): PathDiary {
  const iam = input.iam[0] ?? "Becoming";
  const me = input.me[0] ?? "Starting";
  const prompts = promptsForMethod(input.method, iam, me).map((prompt, i) => ({
    dayLabel: `Day ${input.day + i}`,
    prompt,
  }));

  return {
    id: `diary-${input.day}-${iam.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${iam} Path Diary`,
    subtitle: `A physical guided diary printed for ${input.name}`,
    price: 42,
    coverName: input.name,
    coverArc: `${me} → ${iam}`,
    dayMarker: `Day ${input.day} of ${input.totalDays}`,
    method: input.method,
    pages: 96,
    binding: "Hardcover · lay-flat · cream paper",
    ships: [
      "Physical hardcover diary shipped to your address (POD)",
      `Cover printed with your name (“${input.name}”) and arc “${me} → ${iam}”`,
      `Day marker on the cover: Day ${input.day} of ${input.totalDays}`,
      `Method line: ${input.method}`,
      "Interior: dated prompt pages generated from your method + identity",
    ],
    prompts: prompts.slice(0, 7),
    insides: [
      "Cover emboss/print = your name + Me→I Am (not a blank notebook)",
      "Day marker = where you are on the 111-day path",
      "Method = which practice framework the prompts follow",
      "Guided prompts = questions printed INSIDE the diary pages",
      "Gift-ready = packaged to give yourself or someone else",
    ],
    why: "FNP personalizes a name on a diary. We personalize the transformation: cover arc + method prompts only your Vector path can generate.",
    fulfillment:
      "Demo CTA “Pre-order” = intent. Production: generate PDF → Bookwright/Lulu/Printful hardcover → ship. Not emailed PDF-only.",
  };
}

/** @deprecated alias */
export const buildPathJournal = buildPathDiary;
