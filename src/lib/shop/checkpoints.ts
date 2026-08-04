/**
 * Checkpoint Drops — Day 11 / 37 / 74 / 111.
 * Progress on the 111-day path unlocks exclusive merch moments.
 * Retention lever + revenue lever for IABTM.
 */

import { IABTM_MERCH, type MerchProduct } from "@/lib/shop/catalog";

export type CheckpointId = "day-11" | "day-37" | "day-74" | "day-111";

export type CheckpointDrop = {
  id: CheckpointId;
  day: number;
  title: string;
  subtitle: string;
  /** Catalog SKU featured at this checkpoint (existing inventory) */
  featuredProductId: string;
  /** Bundle story for IABTM */
  bundle: string;
  priceHint: number;
  unlockCopy: string;
  lockedCopy: string;
};

export const CHECKPOINTS: CheckpointDrop[] = [
  {
    id: "day-11",
    day: 11,
    title: "Day 11 · First Proof",
    subtitle: "You showed up for 11 days — unlock the entry layer.",
    featuredProductId: "classic-script-tee",
    bundle: "Script tee + Path Diary pre-order discount story",
    priceHint: 24.99,
    unlockCopy: "Unlocked — early-path calm wear, yours to claim.",
    lockedCopy: "Unlocks on Day 11. Keep practicing.",
  },
  {
    id: "day-37",
    day: 37,
    title: "Day 37 · Mid-Path Mark",
    subtitle: "Identity is sticking — statement piece unlocks.",
    featuredProductId: "become-the-self-tee",
    bundle: "Become the Self heavyweight tee",
    priceHint: 32,
    unlockCopy: "Unlocked — mid-path statement merch.",
    lockedCopy: "Unlocks on Day 37.",
  },
  {
    id: "day-74",
    day: 74,
    title: "Day 74 · Discipline Layer",
    subtitle: "Structure over vibe — crew unlocks.",
    featuredProductId: "bw-crew",
    bundle: "BW Crew · structured daily discipline",
    priceHint: 49.99,
    unlockCopy: "Unlocked — discipline crew for late-middle path.",
    lockedCopy: "Unlocks on Day 74.",
  },
  {
    id: "day-111",
    day: 111,
    title: "Day 111 · Completion Drop",
    subtitle: "Full arc — completion hoodie + diary kit story.",
    featuredProductId: "sunfade-boxy-hoodie",
    bundle: "Sunfade hoodie + physical Path Diary (Becoming Kit)",
    priceHint: 99,
    unlockCopy: "Unlocked — completion Becoming Kit.",
    lockedCopy: "Unlocks when you finish Day 111.",
  },
];

export type CheckpointStatus = CheckpointDrop & {
  unlocked: boolean;
  daysRemaining: number;
  product: MerchProduct | null;
};

export function checkpointStatuses(dayNumber: number): CheckpointStatus[] {
  return CHECKPOINTS.map((c) => {
    const unlocked = dayNumber >= c.day;
    const product =
      IABTM_MERCH.find((p) => p.id === c.featuredProductId) ?? null;
    return {
      ...c,
      unlocked,
      daysRemaining: Math.max(0, c.day - dayNumber),
      product,
    };
  });
}

export function nextCheckpoint(dayNumber: number): CheckpointStatus | null {
  const all = checkpointStatuses(dayNumber);
  return all.find((c) => !c.unlocked) ?? all[all.length - 1] ?? null;
}
