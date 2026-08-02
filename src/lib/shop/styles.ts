/**
 * Industry-standard content-based merch matching:
 * every product has an explicit Style Profile (we assign it — IABTM shop
 * does not ship these tags). User path → User Style Profile → Jaccard match.
 */

export type StyleAxis =
  | "energy" // calm ↔ intense
  | "visibility" // subtle ↔ statement
  | "discipline" // soft ↔ structured
  | "body" // reflective ↔ athletic
  | "creativity"; // classic ↔ expressive

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
  /** Human labels for UI / judges */
  labels: string[];
  /** Numeric profile used for matching */
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
  return Math.max(0, Math.min(1, (cos + 1) / 2)); // map roughly; vectors are 0-1 so cos is 0-1
}

/** Average absolute distance inverted — more intuitive for 0–1 axes. */
export function styleFit(a: StyleVector, b: StyleVector): number {
  let dist = 0;
  for (const axis of STYLE_AXES) {
    dist += Math.abs(a[axis] - b[axis]);
  }
  const avg = dist / STYLE_AXES.length;
  return Math.max(0, Math.min(1, 1 - avg));
}
