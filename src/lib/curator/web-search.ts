import { youtubeIdFromUrl, youtubeThumb } from "@/lib/media/youtube";
import type { JourneyStage, MediaItem, MediaType } from "@/types";
import { createHash } from "crypto";

export type DiscoveredCandidate = {
  title: string;
  description: string;
  url: string;
  creator: string;
  media_type: MediaType;
  duration_minutes: number;
  source: "youtube" | "web";
};

function stableId(url: string) {
  const yt = youtubeIdFromUrl(url);
  if (yt) return `yt_${yt}`;
  return `web_${createHash("sha1").update(url).digest("hex").slice(0, 16)}`;
}

function parseDuration(text?: string): number {
  if (!text) return 8;
  const parts = text.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return 8;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
  if (parts.length === 2) return parts[0] + Math.round(parts[1] / 60) || 1;
  return 8;
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Live YouTube search via YouTube's public web client (no API key). */
export async function searchYouTube(
  query: string,
  limit = 8,
): Promise<DiscoveredCandidate[]> {
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.00.00",
            hl: "en",
            gl: "US",
          },
        },
        query,
      }),
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) return [];
  const data = await res.json();
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];

  const out: DiscoveredCandidate[] = [];
  for (const section of sections) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const r = item.videoRenderer;
      if (!r?.videoId) continue;
      const title =
        r.title?.runs?.map((x: { text: string }) => x.text).join("") ||
        r.title?.simpleText ||
        "Untitled";
      const description =
        r.detailedMetadataSnippets?.[0]?.snippetText?.runs
          ?.map((x: { text: string }) => x.text)
          .join("") || title;
      out.push({
        title,
        description,
        url: `https://www.youtube.com/watch?v=${r.videoId}`,
        creator: r.ownerText?.runs?.[0]?.text || "YouTube",
        media_type: "film",
        duration_minutes: parseDuration(r.lengthText?.simpleText),
        source: "youtube",
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** DuckDuckGo HTML search for articles, mentors, art references. */
export async function searchWeb(
  query: string,
  limit = 6,
): Promise<DiscoveredCandidate[]> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) return [];
  const html = await res.text();
  const titles = [...html.matchAll(/class="result__a"[^>]*>([^<]+)/g)].map(
    (m) => decodeHtml(m[1]),
  );
  const links = [...html.matchAll(/uddg=([^&"]+)/g)].map((m) =>
    decodeURIComponent(m[1]),
  );
  const snippets = [
    ...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g),
  ].map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, "")).trim());

  const seen = new Set<string>();
  const out: DiscoveredCandidate[] = [];
  for (let i = 0; i < links.length && out.length < limit; i++) {
    const url = links[i];
    if (!url || seen.has(url) || url.includes("duckduckgo.com")) continue;
    seen.add(url);
    out.push({
      title: titles[i] || url,
      description: snippets[i] || titles[i] || "Web result",
      url,
      creator: (() => {
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return "web";
        }
      })(),
      media_type: "editorial",
      duration_minutes: 8,
      source: "web",
    });
  }
  return out;
}

const YOUTUBE_TYPES: MediaType[] = [
  "film",
  "music",
  "podcast",
  "animation",
];

function youtubeQueryForType(mediaType: MediaType, q: string) {
  switch (mediaType) {
    case "music":
      return `${q} focus music instrumental lofi study playlist`;
    case "podcast":
      return `${q} podcast interview full episode`;
    case "people":
      return `${q} interview talk keynote`;
    case "animation":
      return `${q} animated explainer psychology`;
    case "art":
      return `${q} art documentary visual essay`;
    case "print":
      return `${q} worksheet template PDF explained`;
    case "editorial":
      return `${q} explainer essay talk`;
    default:
      return q;
  }
}

function webQueryForType(mediaType: MediaType, q: string) {
  switch (mediaType) {
    case "people":
      return `${q} mentor biography interview`;
    case "art":
      return `${q} contemporary art poster exhibition`;
    case "print":
      return `${q} printable habit worksheet`;
    case "editorial":
      return `${q} longform guide article`;
    case "music":
      return `site:open.spotify.com/playlist ${q} focus instrumental`;
    default:
      return q;
  }
}

/** Prefer Spotify playlist/track links for free embeddable music. */
async function searchSpotifyMusic(query: string, limit = 5) {
  const web = await searchWeb(
    `site:open.spotify.com ${query} playlist OR track`,
    limit + 4,
  );
  return web
    .filter((c) => /open\.spotify\.com\/(playlist|track|album)\//i.test(c.url))
    .slice(0, limit)
    .map((c) => ({
      ...c,
      media_type: "music" as MediaType,
      source: "web" as const,
    }));
}

export async function discoverForType(input: {
  mediaType: MediaType;
  queries: string[];
}): Promise<DiscoveredCandidate[]> {
  const results: DiscoveredCandidate[] = [];
  const queries = input.queries.filter(Boolean).slice(0, 2);
  const fallback =
    queries.length > 0
      ? queries
      : [`personal growth ${input.mediaType} habits`];

  for (const q of fallback) {
    if (input.mediaType === "music") {
      const spotify = await searchSpotifyMusic(q, 5);
      results.push(...spotify);
      const yt = await searchYouTube(youtubeQueryForType("music", q), 6);
      results.push(
        ...yt.map((c) => ({
          ...c,
          media_type: "music" as MediaType,
        })),
      );
      continue;
    }

    const wantYoutube =
      YOUTUBE_TYPES.includes(input.mediaType) ||
      input.mediaType === "people" ||
      input.mediaType === "art" ||
      input.mediaType === "print" ||
      input.mediaType === "editorial";

    if (wantYoutube) {
      const yt = await searchYouTube(youtubeQueryForType(input.mediaType, q), 8);
      results.push(
        ...yt.map((c) => ({
          ...c,
          media_type: input.mediaType,
        })),
      );
    }

    if (
      ["editorial", "print", "art", "people"].includes(input.mediaType) ||
      results.length < 4
    ) {
      const web = await searchWeb(webQueryForType(input.mediaType, q), 6);
      results.push(
        ...web.map((c) => ({
          ...c,
          media_type: input.mediaType,
        })),
      );
    }
  }

  if (results.length < 3) {
    const broad = await searchYouTube(
      input.mediaType === "music"
        ? "lofi focus instrumental study music"
        : `${input.mediaType} personal development practical`,
      8,
    );
    results.push(
      ...broad.map((c) => ({
        ...c,
        media_type: input.mediaType,
      })),
    );
  }

  const dedup = new Map<string, DiscoveredCandidate>();
  for (const item of results) {
    const key = youtubeIdFromUrl(item.url) || item.url;
    if (!dedup.has(key)) dedup.set(key, item);
  }
  return [...dedup.values()];
}

export function toMediaItem(
  candidate: DiscoveredCandidate,
  ctx: {
    me: string[];
    iam: string[];
    method: string;
    stage: JourneyStage;
    learningStyles: string[];
  },
): MediaItem {
  const id = stableId(candidate.url);
  const thumb =
    youtubeThumb(candidate.url) ||
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(candidate.creator)}&sz=128`;

  return {
    id,
    title: candidate.title,
    description: candidate.description,
    media_type: candidate.media_type,
    url: candidate.url,
    thumbnail_url: thumb,
    creator: candidate.creator,
    duration_minutes: candidate.duration_minutes,
    tags: [candidate.source, ctx.method, ...ctx.me.slice(0, 2)],
    methods: [ctx.method, "any"],
    from_attrs: ctx.me,
    to_attrs: ctx.iam,
    journey_stage: ctx.stage,
    learning_styles: ctx.learningStyles.length
      ? ctx.learningStyles
      : ["Visual"],
    potential_score: 0.75,
    attention_trap_score: 0.2,
  };
}
