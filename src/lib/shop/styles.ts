/**
 * Style axes for merch matching.
 *
 * WHY THESE FIVE (not embeddings / not a neural graph):
 * Apparel needs *explainable* dimensions buyers & partners understand.
 * Same idea as Stitch Fix attribute vectors — frozen taxonomy, deterministic scores.
 *
 * DETERMINISM CONTRACT:
 * - Same Me/I Am/method/day → same StyleVector (always).
 * - Product vectors are hand-authored once in catalog.ts and never random.
 * - No LLM, no embeddings, no Math.random in this file.
 */

export type StyleAxis =
  | "energy" // 0 calm → 1 intense
  | "visibility" // 0 subtle → 1 statement
  | "discipline" // 0 soft → 1 structured
  | "body" // 0 reflective → 1 athletic
  | "creativity"; // 0 classic → 1 expressive

/** 0–1 scores on each axis (product OR user). */
export type StyleVector = Record<StyleAxis, number>;

export const STYLE_AXES: StyleAxis[] = [
  "energy",
  "visibility",
  "discipline",
  "body",
  "creativity",
];

export type ProductStyle = {
  labels: string[];
  vector: StyleVector;
  colorway: string;
  silhouette: string;
};

export function emptyVector(): StyleVector {
  return {
    energy: 0.5,
    visibility: 0.5,
    discipline: 0.5,
    body: 0.5,
    creativity: 0.5,
  };
}

export function roundVector(v: StyleVector): StyleVector {
  const out = emptyVector();
  for (const axis of STYLE_AXES) {
    out[axis] = Math.round(v[axis] * 100) / 100;
  }
  return out;
}

/** Cosine similarity on style vectors (0–1). */
export function styleSimilarity(a: StyleVector, b: StyleVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const axis of STYLE_AXES) {
    dot += a[axis] * b[axis];
    na += a[axis] * a[axis];
    nb += b[axis] * b[axis];
  }
  if (!na || !nb) return 0;
  const cos = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.max(0, Math.min(1, (cos + 1) / 2));
}

/** Average absolute distance inverted — explainable 0–1 fit. */
export function styleFit(a: StyleVector, b: StyleVector): number {
  let dist = 0;
  for (const axis of STYLE_AXES) {
    dist += Math.abs(a[axis] - b[axis]);
  }
  const avg = dist / STYLE_AXES.length;
  return Math.max(0, Math.min(1, 1 - avg));
}

/**
 * Are five axes necessary?
 * Minimum viable merch taxonomy is often 3 (energy / structure / expression).
 * We keep 5 because IABTM SKUs split cleanly on athletic (body) vs statement
 * (visibility) vs creative colorways — collapsing loses ranking quality on
 * a small catalog. Axes are fixed; only the *rules* that set them change.
 */
export const AXIS_WHY: Record<StyleAxis, string> = {
  energy: "Calm hoodie vs high-energy athletic wash",
  visibility: "Subtle script vs loud magazine print",
  discipline: "Soft daily tee vs structured crew",
  body: "Reflective lounge vs movement / sleeveless",
  creativity: "Classic black vs expressive colorways",
};
