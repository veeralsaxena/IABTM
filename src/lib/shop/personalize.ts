import { IABTM_MERCH, type MerchProduct } from "@/lib/shop/catalog";
import { STYLE_AXES, styleFit, type StyleAxis } from "@/lib/shop/styles";
import {
  buildUserStyleProfile,
  type PathShopInput,
  type UserStyleProfile,
} from "@/lib/shop/style-profile";

export type { PathShopInput, UserStyleProfile };
export { buildUserStyleProfile };

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
    axisDeltas: Array<{
      axis: StyleAxis;
      user: number;
      product: number;
      gap: number;
    }>;
    stageRule: string;
    formula: string;
  };
};

/** Custom Path Edition — aspirational print only (never Me / friction). */
export type QuoteOption = {
  id: string;
  frontLine: string;
  backLine: string;
  vibe: string;
};

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
  quoteOptions: QuoteOption[];
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
  ships: string[];
  prompts: Array<{ dayLabel: string; prompt: string }>;
  insides: string[];
  why: string;
  fulfillment: string;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
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

  const ranked = IABTM_MERCH.map((p) => {
    const sFit = styleFit(profile.vector, p.style.vector);
    const stFit = stageFitScore(profile.stage, p);
    const final = clamp01(0.7 * sFit + 0.3 * stFit);

    const axisDeltas = STYLE_AXES.map((axis) => ({
      axis,
      user: Number(profile.vector[axis].toFixed(2)),
      product: Number(p.style.vector[axis].toFixed(2)),
      gap: Number(
        Math.abs(profile.vector[axis] - p.style.vector[axis]).toFixed(2),
      ),
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
        backLine: "I AM BETTER THAN ME",
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
        formula:
          "final = 0.70×styleFit + 0.30×stageFit  (styleFit = 1 − mean|userAxis−productAxis|)",
      },
    } satisfies ScoredMerch;
  }).sort((a, b) => b.scores.final - a.scores.final);

  return { profile, ranked };
}

function buildQuoteOptions(iam: string, method: string): QuoteOption[] {
  const iamClean = iam.trim() || "Becoming";
  const methodLine = (() => {
    if (/timebox/i.test(method)) return "PROTECT THE BLOCK";
    if (/stoic|mindful/i.test(method)) return "WHAT I CAN CONTROL";
    if (/body|reset|habit/i.test(method)) return "SHOW UP IN MOTION";
    if (/accountab/i.test(method)) return "WITNESSED WINS";
    return "I AM BETTER THAN ME";
  })();

  return [
    {
      id: "iam-mark",
      frontLine: iamClean.toUpperCase(),
      backLine: "I AM BETTER THAN ME",
      vibe: "Identity mark — who you’re becoming",
    },
    {
      id: "method-charge",
      frontLine: iamClean.toUpperCase(),
      backLine: methodLine,
      vibe: "Method charge — practice energy on the back",
    },
    {
      id: "quiet-power",
      frontLine: "BECOME",
      backLine: iamClean.toUpperCase(),
      vibe: "Quiet power — short front, I Am on back",
    },
  ];
}

export function buildCustomPathEdition(input: PathShopInput): CustomPathEdition {
  const profile = buildUserStyleProfile(input);
  const iam = input.iam[0] ?? "Becoming";
  const athletic = profile.vector.body > 0.65;
  const calm = profile.vector.energy < 0.4;
  const quotes = buildQuoteOptions(iam, input.method);
  const pick = quotes[0]!;

  return {
    id: `custom-${input.day}-${iam.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${iam} Path Edition ${athletic ? "Hoodie" : "Tee"}`,
    garment: athletic ? "hoodie" : "tee",
    color: calm ? "bone" : athletic ? "forest" : "ink",
    price: athletic ? 64 : 38,
    frontLine: pick.frontLine,
    backLine: pick.backLine,
    sleeveHint: "",
    edition: `Day ${input.day} / ${input.totalDays}`,
    quoteOptions: quotes,
    why: `Aspirational only — we never print your Me friction on apparel. Style profile (${profile.labels.join(", ")}) picks garment + color; you choose a curated quote.`,
    partnerNote:
      "Fulfillment: selected quote + color → Printful / apparel partner → ship. Diary is where Me→I Am stays private.",
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
