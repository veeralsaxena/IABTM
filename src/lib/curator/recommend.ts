import { METHODS, pickMethod } from "@/lib/data/catalog";
import { SEED_ACTIVITIES, SEED_MEDIA } from "@/lib/data/seed-media";
import { diversifyTypes, rerankCandidates } from "@/lib/curator/rerank";
import { inAppPlayback, type InAppPlayback } from "@/lib/media/youtube";
import { journeyStage } from "@/lib/utils";
import type { ActivityItem, JourneyStage, MediaItem, ScoredMedia } from "@/types";

export type CuratorRequest = {
  /** Who they are today. */
  me: string[];
  /** Who they want to become. */
  iam: string[];
  method?: string;
  dayNumber?: number;
  totalDays?: number;
  learningStyles?: string[];
  likedTitles?: string[];
  dislikedTitles?: string[];
  seenIds?: string[];
  /** Extra candidates (live web). Catalog is always included. */
  extra?: MediaItem[];
};

export type CuratorResult = {
  me: string[];
  iam: string[];
  method: string;
  methodBlurb: string;
  stage: JourneyStage;
  primary: ScoredMedia & { playback: InAppPlayback; whyServed: string };
  secondary: Array<ScoredMedia & { playback: InAppPlayback; whyServed: string }>;
  practice: ActivityItem;
  reason: string;
  whyNow: string;
  serving: {
    catalogChecked: number;
    matched: number;
    rule: string;
  };
};

function isSaved(item: { id: string }) {
  return item.id.startsWith("yt_") || item.id.startsWith("web_");
}

/** Who this saved video is for. Null means it should not be served to this person. */
function whyServed(item: MediaItem, me: string[], iam: string[], method: string) {
  if (!isSaved(item)) return "Starter shelf until a saved video fits this person.";
  const meHit = item.from_attrs.filter((label) =>
    me.some((value) => value.toLowerCase() === label.toLowerCase()),
  );
  const iamHit = item.to_attrs.filter((label) =>
    iam.some((value) => value.toLowerCase() === label.toLowerCase()),
  );
  const methodHit = item.methods.some(
    (value) => value.toLowerCase() === method.toLowerCase(),
  );
  if (!methodHit && !meHit.length && !iamHit.length) return null;
  const reasons = [
    methodHit ? `same method ${method}` : "",
    meHit.length ? `current self overlaps ${meHit.join(", ")}` : "",
    iamHit.length ? `imagined self overlaps ${iamHit.join(", ")}` : "",
  ].filter(Boolean);
  return reasons.join("; ");
}

function slug(title: string) {
  return `cat_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`;
}

/** Owned shelf. This is what still ranks when the live web returns nothing. */
export function catalogMedia(): MediaItem[] {
  return SEED_MEDIA.map((m) => ({
    id: slug(m.title),
    title: m.title,
    description: m.description,
    media_type: m.media_type,
    url: m.url,
    thumbnail_url: m.thumbnail_url,
    creator: m.creator,
    duration_minutes: m.duration_minutes,
    tags: m.tags,
    methods: m.methods,
    from_attrs: m.from_attrs,
    to_attrs: m.to_attrs,
    journey_stage: m.journey_stage,
    learning_styles: m.learning_styles,
    potential_score: m.potential_score,
    attention_trap_score: m.attention_trap_score,
  }));
}

function pickPractice(
  method: string,
  me: string[],
  iam: string[],
): ActivityItem {
  const ranked = [...SEED_ACTIVITIES]
    .map((a) => {
      const methodHit = a.methods.some(
        (m) => m.toLowerCase() === method.toLowerCase() || m === "any",
      )
        ? 2
        : 0;
      const fromHit = me.filter((l) =>
        a.from_attrs.some((f) => f.toLowerCase() === l.toLowerCase()),
      ).length;
      const toHit = iam.filter((l) =>
        a.to_attrs.some((t) => t.toLowerCase() === l.toLowerCase()),
      ).length;
      return { a, score: methodHit + fromHit + toHit };
    })
    .sort((x, y) => y.score - x.score);

  const top = ranked[0]?.a ?? SEED_ACTIVITIES[0];
  return {
    id: slug(top.title),
    title: top.title,
    description: top.description,
    category: top.category,
  };
}

/**
 * Agentic curator entry the production app can call.
 * No database. No live scrape required.
 * Me + I Am → method → ranked videos/essays + one practice.
 */
export function curateRecommendations(input: CuratorRequest): CuratorResult {
  const me = input.me.map((s) => s.trim()).filter(Boolean);
  const iam = input.iam.map((s) => s.trim()).filter(Boolean);
  if (!me.length || !iam.length) {
    throw new Error("Curator needs at least one current-self and one imagined-self label.");
  }

  const picked = pickMethod(me, iam);
  const methodId = input.method?.trim() || picked.id;
  const known = METHODS.find(
    (m) => m.id.toLowerCase() === methodId.toLowerCase(),
  );
  const method = known?.id ?? methodId;
  const methodBlurb =
    known?.blurb ??
    `Practice ${method} to move from ${me[0]} toward ${iam[0]}.`;

  const day = input.dayNumber ?? 1;
  const total = input.totalDays ?? 111;
  const stage = journeyStage(day, total);
  const learningStyles = input.learningStyles ?? [];

  const pool = [...catalogMedia(), ...(input.extra ?? [])];
  const ranked = rerankCandidates({
    candidates: pool,
    me,
    iam,
    method,
    stage,
    learningStyles,
    seenIds: new Set(input.seenIds ?? []),
    identityQuery: `Current self: ${me.join(", ")}. Imagined self: ${iam.join(", ")}. Method: ${method}.`,
    dislikedTitles: input.dislikedTitles,
    likedTitles: input.likedTitles,
  });

  const saved = ranked.filter((item) => whyServed(item, me, iam, method) && isSaved(item));
  const starter = ranked.filter((item) => !isSaved(item));
  const savedVideos = saved.filter((item) => item.id.startsWith("yt_"));
  const savedWriting = saved.filter((item) => item.id.startsWith("web_"));
  const diverse = savedVideos.length
    ? [
        ...savedVideos.slice(0, 1),
        ...savedWriting.slice(0, 1),
        ...savedVideos.slice(1, 5),
      ]
    : diversifyTypes(starter, 6);
  const primary = diverse[0];
  if (!primary) {
    throw new Error("Catalog produced no recommendations.");
  }

  const practice = pickPractice(method, me, iam);

  const present = <T extends ScoredMedia>(item: T) => ({
    ...item,
    playback: inAppPlayback(item.url),
    whyServed: whyServed(item, me, iam, method) ?? "Saved for a different path.",
  });

  return {
    me,
    iam,
    method,
    methodBlurb,
    stage,
    primary: present(primary),
    secondary: diverse.slice(1, 5).map(present),
    practice,
    serving: {
      catalogChecked: (input.extra ?? []).length,
      matched: saved.length,
      rule: "Every saved video stays in the catalog. It is served again only when this person's method matches, or a current-self or imagined-self label overlaps the audience stored on that video.",
    },
    reason: `${method} fits ${me.join(", ")} → ${iam.join(", ")}. ${methodBlurb}`,
    whyNow: `${primary.title} matches this path (identity ${primary.scores.identityFit.toFixed(2)}). Do the practice after, or instead of, watching.`,
  };
}
