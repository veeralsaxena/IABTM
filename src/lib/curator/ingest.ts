import { pickMethod } from "@/lib/data/catalog";
import {
  readCatalog,
  upsertCatalog,
  type CatalogRecord,
} from "@/lib/curator/catalog-store";
import { rerankCandidates } from "@/lib/curator/rerank";
import {
  searchArticles,
  searchYouTube,
  toMediaItem,
} from "@/lib/curator/web-search";
import { inAppPlayback, youtubeIdFromUrl } from "@/lib/media/youtube";
import { journeyStage } from "@/lib/utils";
import type { MediaItem, ScoredMedia } from "@/types";

const HYPE =
  /\b(shocking|you won't believe|gone wrong|insane|hack your brain|make you rich|overnight|secret trick|hack)\b|🔥|😱/i;

export type IdentityInput = {
  me: string[];
  iam: string[];
  method?: string;
  dayNumber?: number;
  limit?: number;
};

function cleanLabels(values: string[]) {
  return values.map((s) => s.trim()).filter(Boolean);
}

function resolveMethod(me: string[], iam: string[], method?: string) {
  const picked = pickMethod(me, iam);
  return method?.trim() || picked.id;
}

function queriesFor(me: string[], iam: string[], method: string) {
  const from = me[0] ?? "stuck";
  const to = iam[0] ?? "consistent";
  return {
    videos: [
      `${method} explained lecture`,
      `${method} ${from} to ${to} practical talk`,
    ],
    articles: [method, `${from} habits`],
  };
}

function worthKeeping(item: {
  title: string;
  duration_minutes: number;
  source: string;
}) {
  if (item.source !== "youtube") return true;
  if (item.duration_minutes < 5 || item.duration_minutes > 40) return false;
  if (HYPE.test(item.title)) return false;
  return true;
}

function asRecord(
  item: MediaItem,
  fileUrl?: string | null,
): CatalogRecord {
  return {
    ...item,
    ingestedAt: new Date().toISOString(),
    playback: inAppPlayback(item.url, fileUrl),
  };
}

export async function searchForIdentity(input: IdentityInput) {
  const me = cleanLabels(input.me);
  const iam = cleanLabels(input.iam);
  if (!me.length || !iam.length) {
    throw new Error("Search needs current self and imagined self.");
  }
  const method = resolveMethod(me, iam, input.method);
  const stage = journeyStage(input.dayNumber ?? 1);
  const queries = queriesFor(me, iam, method);
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 12);

  const [videosA, videosB, articlesA, articlesB] = await Promise.all([
    searchYouTube(queries.videos[0], 8),
    searchYouTube(queries.videos[1], 8),
    searchArticles(queries.articles[0], 3),
    searchArticles(queries.articles[1], 3),
  ]);

  const seen = new Set<string>();
  const discovered = [...videosA, ...videosB, ...articlesA, ...articlesB].filter((item) => {
    const key = youtubeIdFromUrl(item.url) || item.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return worthKeeping(item);
  });

  const media = discovered.map((item) =>
    toMediaItem(item, {
      me,
      iam,
      method,
      stage,
      learningStyles: item.source === "youtube" ? ["Visual"] : ["Reading"],
    }),
  );

  const ranked = rerankCandidates({
    candidates: media,
    me,
    iam,
    method,
    stage,
    learningStyles: [],
    seenIds: new Set(),
    identityQuery: `${me.join(", ")} → ${iam.join(", ")} via ${method}`,
  });

  const videos = ranked.filter((item) => item.id.startsWith("yt_"));
  const writing = ranked.filter((item) => item.id.startsWith("web_"));
  const videoSlots = Math.max(1, limit - Math.min(2, writing.length));
  const candidates = [
    ...videos.slice(0, videoSlots),
    ...writing.slice(0, 2),
  ].slice(0, limit);

  return {
    me,
    iam,
    method,
    queries,
    searched: videosA.length + videosB.length + articlesA.length + articlesB.length,
    kept: ranked.length,
    candidates,
  };
}

export async function ingestForIdentity(input: IdentityInput) {
  const found = await searchForIdentity(input);
  const records = found.candidates.map((item) => asRecord(item));
  const catalog = upsertCatalog(records);
  return { ...found, saved: records.length, catalogSize: catalog.length };
}

export async function ingestUrl(input: {
  url: string;
  me: string[];
  iam: string[];
  method?: string;
  fileUrl?: string;
}) {
  const me = cleanLabels(input.me);
  const iam = cleanLabels(input.iam);
  if (!me.length || !iam.length) {
    throw new Error("Ingest needs current self and imagined self.");
  }
  const url = input.url.trim();
  const method = resolveMethod(me, iam, input.method);
  const stage = journeyStage(1);
  const videoId = youtubeIdFromUrl(url);

  let title = url;
  let creator = "Catalog";
  let description = `Saved for ${me.join(", ")} → ${iam.join(", ")}.`;
  let thumbnail: string | null = null;

  if (videoId) {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!oembed.ok) {
      throw new Error("That YouTube link could not be read.");
    }
    const meta = (await oembed.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    title = meta.title || title;
    creator = meta.author_name || "YouTube";
    description = meta.title || description;
    thumbnail = meta.thumbnail_url || null;
  }

  const item: MediaItem = {
    id: videoId ? `yt_${videoId}` : `web_${Buffer.from(url).toString("base64url").slice(0, 16)}`,
    title,
    description,
    media_type: videoId ? "film" : "editorial",
    url,
    thumbnail_url: thumbnail,
    creator,
    duration_minutes: videoId ? 12 : 8,
    tags: ["ingested", method, ...me.slice(0, 2)],
    methods: [method],
    from_attrs: me,
    to_attrs: iam,
    journey_stage: stage,
    learning_styles: videoId ? ["Visual"] : ["Reading"],
    potential_score: 0.8,
    attention_trap_score: 0.15,
  };

  const record = asRecord(item, input.fileUrl);
  const catalog = upsertCatalog([record]);
  return { saved: record, catalogSize: catalog.length };
}

export function listIngested(): CatalogRecord[] {
  return readCatalog();
}

export function withPlayback<T extends { url: string | null }>(item: T) {
  return { ...item, playback: inAppPlayback(item.url) };
}

export function liveMedia(): MediaItem[] {
  return readCatalog();
}

export type RankedCandidate = ScoredMedia;
