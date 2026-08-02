/**
 * Catalog seeded from live IABTM shop images.
 * Style profiles are OURS (content taxonomy) — not from Shopify.
 * This is how retailers do content-based fashion recs: curated attributes.
 */

import type { ProductStyle } from "@/lib/shop/styles";

export type MerchKind = "hoodie" | "tee" | "crew" | "top" | "custom";

export type MerchProduct = {
  id: string;
  title: string;
  price: number;
  currency: "USD";
  description: string;
  image: string;
  kind: MerchKind;
  style: ProductStyle;
  shopUrl: string;
  source: "iabtm_shop" | "path_edition_custom";
};

function S(
  labels: string[],
  vector: ProductStyle["vector"],
  colorway: string,
  silhouette: string,
): ProductStyle {
  return { labels, vector, colorway, silhouette };
}

export const IABTM_MERCH: MerchProduct[] = [
  {
    id: "sunfade-boxy-hoodie",
    title: "IABTM Sunfade Boxy Hoodie",
    price: 59.99,
    currency: "USD",
    description: "Loose hoodie with founder script — daily identity layer.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/cbee7c06498340c8b3d9e5e823130c1a.png?v=1772965330",
    kind: "hoodie",
    style: S(
      ["calm", "script", "daily", "soft-structure"],
      { energy: 0.35, visibility: 0.45, discipline: 0.55, body: 0.35, creativity: 0.4 },
      "black",
      "boxy-hoodie",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "magazine-tee",
    title: "Magazine Tee",
    price: 34.99,
    currency: "USD",
    description: "Bold magazine typography — expressive, visible.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/0071b6e6447a43bdb676d35f55f4f36b.png?v=1772965314",
    kind: "tee",
    style: S(
      ["expressive", "statement", "art", "visible"],
      { energy: 0.55, visibility: 0.85, discipline: 0.4, body: 0.3, creativity: 0.9 },
      "white",
      "classic-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "black-magazine-tee",
    title: "Black Magazine Tee",
    price: 40,
    currency: "USD",
    description: "Minimal black tee — subtle everyday mark.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/4fc5b0f951424059b22d47e84397c7d3.png?v=1745537900",
    kind: "tee",
    style: S(
      ["subtle", "minimal", "daily"],
      { energy: 0.3, visibility: 0.25, discipline: 0.5, body: 0.3, creativity: 0.35 },
      "black",
      "classic-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "sleeveless-snow-hoodie",
    title: "IABTM Sleeveless Snow Washed Hoodie",
    price: 49.99,
    currency: "USD",
    description: "Athletic cropped hoodie — movement / body-first.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/c9ee03c2b33147aa87bb7bf4bc82ae0f.png?v=1772934352",
    kind: "hoodie",
    style: S(
      ["athletic", "movement", "energy"],
      { energy: 0.8, visibility: 0.4, discipline: 0.65, body: 0.9, creativity: 0.35 },
      "washed-black",
      "sleeveless-hoodie",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "wmns-cropped-sweat",
    title: "WMNS Cropped Snow Washed Sweatshirt",
    price: 51.94,
    currency: "USD",
    description: "Streetwear crop — creative / expressive.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/ec5ace38ef18488e851d9625d13cc09e_c14dca76-152c-4d70-a2fe-bcfcc01f067f.png?v=1772965180",
    kind: "crew",
    style: S(
      ["creative", "street", "expressive"],
      { energy: 0.55, visibility: 0.7, discipline: 0.4, body: 0.45, creativity: 0.8 },
      "cream",
      "cropped-crew",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "become-the-self-tee",
    title: 'Heavyweight "Become the Self" Tee',
    price: 32,
    currency: "USD",
    description: "Statement become language — identity-forward.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/a36074ce6cf54d958e03907cb2cc2888_2ebe9d6f-1bb9-464d-a123-d0bfa9af7dfa.png?v=1751899552",
    kind: "tee",
    style: S(
      ["become", "statement", "identity"],
      { energy: 0.5, visibility: 0.75, discipline: 0.6, body: 0.35, creativity: 0.55 },
      "black",
      "heavy-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "future-boxy-tee",
    title: "The Future | Oversize Boxy IABTM Tee",
    price: 58,
    currency: "USD",
    description: "Future-facing oversized tee — courage / visibility.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/90c5dbc9dee64fa5a3b16eff0abd1c25.png?v=1751899985",
    kind: "tee",
    style: S(
      ["future", "statement", "courage"],
      { energy: 0.6, visibility: 0.8, discipline: 0.55, body: 0.4, creativity: 0.65 },
      "cream",
      "boxy-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "classic-script-tee",
    title: "IABTM Classic Script Tee",
    price: 24.99,
    currency: "USD",
    description: "Calm script tee — early-path friendly.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/5d95aec8c7734461a6c35cefd86b1910.png?v=1753905606",
    kind: "tee",
    style: S(
      ["calm", "script", "subtle", "early"],
      { energy: 0.25, visibility: 0.35, discipline: 0.5, body: 0.3, creativity: 0.35 },
      "black",
      "classic-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "script-tee",
    title: "IABTM Script Tee",
    price: 23.99,
    currency: "USD",
    description: "Soft script entry piece.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/23cae4a081cc46679f2ceae811b9c265.png?v=1772940709",
    kind: "tee",
    style: S(
      ["calm", "script", "early"],
      { energy: 0.28, visibility: 0.38, discipline: 0.48, body: 0.3, creativity: 0.32 },
      "white",
      "classic-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "iabtm-magazine-tee",
    title: "IABTM Magazine Tee",
    price: 34.99,
    currency: "USD",
    description: "Become the self you imagine — identity statement.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/d9a3324bb2594e98985f15919f293fae.png?v=1755564740",
    kind: "tee",
    style: S(
      ["become", "imagine", "statement"],
      { energy: 0.5, visibility: 0.7, discipline: 0.55, body: 0.35, creativity: 0.6 },
      "white",
      "classic-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "pink-acid-tee",
    title: "Pink Acid Wash Tee",
    price: 34.99,
    currency: "USD",
    description: "Expressive colorway — creative energy.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/4cbe81a609204978998784503783bf89.png?v=1755949550",
    kind: "tee",
    style: S(
      ["expressive", "creative", "energy"],
      { energy: 0.7, visibility: 0.75, discipline: 0.35, body: 0.4, creativity: 0.85 },
      "pink-wash",
      "classic-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "bw-crew",
    title: "BW Crew",
    price: 49.99,
    currency: "USD",
    description: "Heavyweight crew — structured daily discipline.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/185531f8835c4910ba7fbbe73e0e16c4_956d3749-6a8f-4899-8fb0-974e15b9bea8.png?v=1772965266",
    kind: "crew",
    style: S(
      ["discipline", "daily", "structured"],
      { energy: 0.4, visibility: 0.35, discipline: 0.8, body: 0.4, creativity: 0.3 },
      "black-white",
      "crewneck",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "becoming-sorona-tee",
    title: "Becoming the Self I Imagine - Essential Sorona Tee",
    price: 30,
    currency: "USD",
    description: "Becoming language — identity + soft structure.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/f5647869fe5b4c7988f5f7e55cf200cb.png?v=1766873810",
    kind: "tee",
    style: S(
      ["become", "imagine", "identity"],
      { energy: 0.45, visibility: 0.65, discipline: 0.6, body: 0.35, creativity: 0.5 },
      "black",
      "sorona-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
  {
    id: "essential-sorona-boxy",
    title: "Essential Sorona Boxy T-Shirt",
    price: 30,
    currency: "USD",
    description: "Boxy becoming tee — calm identity wear.",
    image:
      "https://cdn.shopify.com/s/files/1/0748/2307/4038/files/f18f13a92c5441fbb3f2139fb9592b4c.png?v=1772965254",
    kind: "tee",
    style: S(
      ["become", "calm", "daily"],
      { energy: 0.35, visibility: 0.5, discipline: 0.55, body: 0.35, creativity: 0.45 },
      "cream",
      "boxy-tee",
    ),
    shopUrl: "https://iambetterthanme.com/shop",
    source: "iabtm_shop",
  },
];
