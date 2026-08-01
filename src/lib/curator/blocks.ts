import { youtubeIdFromUrl } from "@/lib/media/youtube";
import type { MediaItem } from "@/types";

/**
 * Hard blocklist — identity-query text alone cannot guarantee exclusion.
 * We never re-surface media whose stable ref is blocked for this user.
 *
 * Stable refs: yt_<youtubeId> | web_<sha1>
 */
export function collectBlockKeys(refs: string[], urls: Array<string | null | undefined> = []) {
  const keys = new Set<string>();
  for (const ref of refs) {
    if (!ref) continue;
    keys.add(ref);
    if (ref.startsWith("yt_")) keys.add(ref.slice(3));
  }
  for (const url of urls) {
    const yt = youtubeIdFromUrl(url);
    if (yt) {
      keys.add(yt);
      keys.add(`yt_${yt}`);
    }
  }
  return keys;
}

export function isMediaBlocked(
  item: Pick<MediaItem, "id" | "url">,
  blockKeys: Set<string>,
): boolean {
  if (!blockKeys.size) return false;
  if (blockKeys.has(item.id)) return true;
  const yt = youtubeIdFromUrl(item.url);
  if (yt && (blockKeys.has(yt) || blockKeys.has(`yt_${yt}`))) return true;
  return false;
}

export function filterBlockedMedia<T extends Pick<MediaItem, "id" | "url">>(
  items: T[],
  blockKeys: Set<string>,
): T[] {
  if (!blockKeys.size) return items;
  return items.filter((item) => !isMediaBlocked(item, blockKeys));
}

/** Cheap lexical pre-score before spending embedding quota on a shortlist. */
export function lexicalPreScore(
  item: Pick<MediaItem, "title" | "description" | "creator">,
  me: string[],
  iam: string[],
  method: string,
): number {
  const blob = `${item.title} ${item.description} ${item.creator ?? ""}`.toLowerCase();
  let score = 0;
  for (const label of [...me, ...iam, method]) {
    const parts = label.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (parts.some((p) => blob.includes(p))) score += 1;
  }
  return score;
}

export function pickEmbedShortlist(
  candidates: MediaItem[],
  me: string[],
  iam: string[],
  method: string,
  limit = 12,
): MediaItem[] {
  return [...candidates]
    .map((c) => ({
      c,
      s: lexicalPreScore(c, me, iam, method),
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.c);
}
