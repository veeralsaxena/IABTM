/**
 * Activity → merch context matching.
 * When briefing says "walk outside", surface movement/outdoor pieces
 * in the activity sidebar — commerce next to intent, not a separate shop maze.
 */

import { IABTM_MERCH, type MerchProduct } from "@/lib/shop/catalog";

export type MerchOccasion =
  | "movement"
  | "outdoor"
  | "calm"
  | "discipline"
  | "statement"
  | "daily"
  | "creative";

/** Occasions we attach to each SKU (content taxonomy). */
export const PRODUCT_OCCASIONS: Record<string, MerchOccasion[]> = {
  "sunfade-boxy-hoodie": ["daily", "calm", "outdoor"],
  "magazine-tee": ["statement", "creative"],
  "black-magazine-tee": ["daily", "calm"],
  "sleeveless-snow-hoodie": ["movement", "outdoor"],
  "wmns-cropped-sweat": ["creative", "statement"],
  "become-the-self-tee": ["statement", "daily"],
  "future-boxy-tee": ["statement"],
  "classic-script-tee": ["calm", "daily"],
  "script-tee": ["calm", "daily"],
  "iabtm-magazine-tee": ["statement", "daily"],
  "pink-acid-tee": ["creative", "statement"],
  "bw-crew": ["discipline", "daily"],
  "becoming-sorona-tee": ["statement", "daily"],
  "essential-sorona-boxy": ["calm", "daily"],
};

export type ActivityMerchMatch = {
  occasions: MerchOccasion[];
  reason: string;
  items: Array<MerchProduct & { matchWhy: string }>;
};

function detectOccasions(text: string): { occasions: MerchOccasion[]; reason: string } {
  const t = text.toLowerCase();

  if (/walk|run|jog|outside|outdoor|hike|move|movement|gym|workout|body|stretch|park|steps/.test(t)) {
    return {
      occasions: ["movement", "outdoor"],
      reason: "This practice is movement / outdoor — gear that feels athletic.",
    };
  }
  if (/meditat|breath|calm|journal|reflect|mindful|still|quiet|write/.test(t)) {
    return {
      occasions: ["calm", "daily"],
      reason: "Quiet practice — softer, low-hype daily wear.",
    };
  }
  if (/timebox|habit|disciplin|schedule|focus|block|routine|deep work/.test(t)) {
    return {
      occasions: ["discipline", "daily"],
      reason: "Structured practice — pieces that signal discipline.",
    };
  }
  if (/creat|art|express|share|post|visible|speak|present/.test(t)) {
    return {
      occasions: ["statement", "creative"],
      reason: "Expressive practice — statement pieces that show up.",
    };
  }

  return {
    occasions: ["daily"],
    reason: "Everyday path wear — scored for daily identity layer.",
  };
}

/**
 * Rank catalog for an activity. Prefer occasion overlap, then body/energy
 * for movement, calm energy for calm practices.
 */
export function merchForActivity(activity: {
  title: string;
  description?: string | null;
  category?: string | null;
}): ActivityMerchMatch {
  const blob = [activity.title, activity.description ?? "", activity.category ?? ""].join(" ");
  const { occasions, reason } = detectOccasions(blob);

  const scored = IABTM_MERCH.map((p) => {
    const tags = PRODUCT_OCCASIONS[p.id] ?? ["daily"];
    const overlap = tags.filter((o) => occasions.includes(o)).length;
    let boost = overlap * 0.35;
    if (occasions.includes("movement")) {
      boost += p.style.vector.body * 0.4 + p.style.vector.energy * 0.2;
    }
    if (occasions.includes("calm")) {
      boost += (1 - p.style.vector.energy) * 0.35 + (1 - p.style.vector.visibility) * 0.2;
    }
    if (occasions.includes("discipline")) {
      boost += p.style.vector.discipline * 0.45;
    }
    if (occasions.includes("statement") || occasions.includes("creative")) {
      boost += p.style.vector.visibility * 0.3 + p.style.vector.creativity * 0.25;
    }
    return {
      ...p,
      _score: boost,
      matchWhy:
        overlap > 0
          ? `Fits ${tags.filter((o) => occasions.includes(o)).join(" + ")}`
          : "Fallback daily piece",
    };
  })
    .sort((a, b) => b._score - a._score)
    .slice(0, 2)
    .map(({ _score: _, ...rest }) => rest);

  return { occasions, reason, items: scored };
}
