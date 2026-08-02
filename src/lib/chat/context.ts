import { createClient } from "@/lib/supabase/server";
import type { PathRecord } from "@/types";

export type CompanionContext = {
  name: string;
  learningStyles: string[];
  path: {
    id: string;
    me: string[];
    iam: string[];
    method: string;
    methodRationale: string | null;
    day: number;
    totalDays: number;
    progress: number;
    identityBlock: {
      whoIAmNow?: string;
      whoIAmBecoming?: string;
      howIGetThere?: string;
    } | null;
  } | null;
  todayBriefing: {
    primaryTitle: string | null;
    reason: string | null;
    whyNow: string | null;
    scores: Record<string, number> | null;
    secondaryTitles: string[];
  } | null;
  likedTitles: string[];
  dislikedTitles: string[];
  dislikedReasons: string[];
  preferredArtists: string[];
  avoidedArtists: string[];
  recentCheckIns: string[];
  chatPreferences: string[];
  completedActivities: string[];
};

/**
 * Load everything the companion needs to sound like it knows this person.
 */
export async function loadCompanionContext(
  userId: string,
): Promise<CompanionContext> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: profile },
    { data: path },
    { data: briefing },
    { data: reviews },
    { data: artists },
    { data: checkIns },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, learning_styles")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("paths")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_briefings")
      .select("reason, why_now, agent_trace, briefing_date")
      .eq("user_id", userId)
      .eq("briefing_date", today)
      .maybeSingle(),
    supabase
      .from("media_reviews")
      .select("media_title, media_ref, rating, sentiment, review")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("artist_feedback")
      .select("artist_name, rating, sentiment, note")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("check_ins")
      .select("body, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const p = path as PathRecord | null;
  const answers = (path as { answers?: Record<string, unknown> } | null)
    ?.answers;
  const identityBlock =
    (answers?.identity_block as CompanionContext["path"] extends null
      ? null
      : NonNullable<CompanionContext["path"]>["identityBlock"]) ?? null;

  const liked = (reviews ?? []).filter(
    (r) => r.sentiment === "liked" || (r.rating ?? 0) >= 4,
  );
  const disliked = (reviews ?? []).filter(
    (r) =>
      r.sentiment === "disliked" ||
      (r.rating ?? 0) <= 2 ||
      String(r.review ?? "")
        .toLowerCase()
        .includes("don’t show again") ||
      String(r.review ?? "")
        .toLowerCase()
        .includes("don't show again"),
  );

  const preferredArtists = (artists ?? [])
    .filter((a) => a.sentiment === "liked" || (a.rating ?? 0) >= 4)
    .map((a) => a.artist_name as string)
    .filter(Boolean)
    .slice(0, 6);

  const avoidedArtists = (artists ?? [])
    .filter((a) => a.sentiment === "disliked" || (a.rating ?? 0) <= 2)
    .map((a) => a.artist_name as string)
    .filter(Boolean)
    .slice(0, 6);

  const bodies = (checkIns ?? []).map((c) => c.body as string).filter(Boolean);
  const chatPreferences = bodies
    .filter((b) => /^chat preference:/i.test(b))
    .map((b) => b.replace(/^chat preference:\s*/i, "").trim())
    .slice(0, 8);
  const completedActivities = bodies
    .filter((b) => b.startsWith("Completed activity:"))
    .map((b) => b.replace("Completed activity:", "").trim())
    .slice(0, 6);
  const recentCheckIns = bodies
    .filter(
      (b) =>
        !b.startsWith("Completed activity:") &&
        !b.startsWith("Skipped activity:") &&
        !/^chat preference:/i.test(b),
    )
    .slice(0, 5);

  const trace = briefing?.agent_trace as
    | {
        primary?: { title?: string; scores?: Record<string, number> };
        secondary?: Array<{ title?: string }>;
        reason?: string;
        whyNow?: string;
      }
    | null;

  return {
    name: profile?.display_name ?? "friend",
    learningStyles: (profile?.learning_styles as string[]) ?? [],
    path: p
      ? {
          id: p.id,
          me: p.me_labels ?? [],
          iam: p.iam_labels ?? [],
          method: p.method,
          methodRationale: p.method_rationale,
          day: p.day_number,
          totalDays: p.total_days,
          progress: p.progress,
          identityBlock,
        }
      : null,
    todayBriefing: briefing
      ? {
          primaryTitle: trace?.primary?.title ?? null,
          reason: (briefing.reason as string) ?? trace?.reason ?? null,
          whyNow: (briefing.why_now as string) ?? trace?.whyNow ?? null,
          scores: trace?.primary?.scores ?? null,
          secondaryTitles: (trace?.secondary ?? [])
            .map((s) => s.title)
            .filter(Boolean) as string[],
        }
      : null,
    likedTitles: liked
      .map((r) => (r.media_title as string) || (r.media_ref as string))
      .filter(Boolean)
      .slice(0, 8),
    dislikedTitles: disliked
      .map((r) => (r.media_title as string) || (r.media_ref as string))
      .filter(Boolean)
      .slice(0, 8),
    dislikedReasons: disliked
      .map((r) => (r.review as string)?.trim())
      .filter(Boolean)
      .slice(0, 5) as string[],
    preferredArtists,
    avoidedArtists,
    recentCheckIns,
    chatPreferences,
    completedActivities,
  };
}

export function formatCompanionSystemPrompt(ctx: CompanionContext): string {
  const path = ctx.path;
  const brief = ctx.todayBriefing;

  return `You are Vector Companion — a sharp, warm personal growth curator chat for the Vector app.
You know THIS user deeply from live product memory. Speak like a trusted coach who also understands the curation system.
Never invent ratings or videos they didn't get. If something is missing, say so and offer a useful next step.

USER
- Name: ${ctx.name}
- Learning styles: ${ctx.learningStyles.join(", ") || "unknown"}

ACTIVE PATH
${
  path
    ? `- Me (now): ${path.me.join(", ")}
- I Am (becoming): ${path.iam.join(", ")}
- Method: ${path.method}
- Method rationale: ${path.methodRationale ?? "n/a"}
- Day ${path.day} / ${path.totalDays} (progress ${Math.round((path.progress ?? 0) * 100)}%)
- Identity block: ${
        path.identityBlock
          ? `Now: ${path.identityBlock.whoIAmNow ?? ""} | Becoming: ${path.identityBlock.whoIAmBecoming ?? ""} | How: ${path.identityBlock.howIGetThere ?? ""}`
          : "not stored yet"
      }`
    : "- No active path yet — guide them to onboarding / new path."
}

TODAY'S CURATED BRIEFING
${
  brief
    ? `- Primary: ${brief.primaryTitle ?? "unknown"}
- Why now: ${brief.whyNow ?? brief.reason ?? "n/a"}
- Scores: ${brief.scores ? JSON.stringify(brief.scores) : "n/a"}
- Also considered: ${brief.secondaryTitles.join("; ") || "n/a"}`
    : "- No briefing cached for today yet."
}

MEMORY / FEEDBACK
- Liked media: ${ctx.likedTitles.join("; ") || "none yet"}
- Disliked / blocked media: ${ctx.dislikedTitles.join("; ") || "none yet"}
- Dislike reasons: ${ctx.dislikedReasons.join("; ") || "none"}
- Preferred artists: ${ctx.preferredArtists.join(", ") || "none"}
- Avoided artists: ${ctx.avoidedArtists.join(", ") || "none"}
- Chat preferences already saved: ${ctx.chatPreferences.join("; ") || "none"}
- Recent check-ins: ${ctx.recentCheckIns.join(" | ") || "none"}
- Completed activities: ${ctx.completedActivities.join("; ") || "none"}

WHAT YOU CAN DO
1. Explain why today's pick fits their Me → Method → I Am path (use scores if present).
2. Coach on their method with concrete next actions (2–4 minutes).
3. Suggest activities, artists, or how to use Discover / Artists / Don't show again.
4. Capture preferences: when they clearly state a lasting preference (tone, topic, creator, length), end your reply with ONE line exactly:
   [[REMEMBER: short preference note]]
   Only when they want it remembered or clearly state a durable dislike/like. Otherwise omit the tag.
5. Help the silent-feedback problem: invite one-tap Don't show again, or offer to remember a preference via [[REMEMBER:]].
6. Explain Vector honestly: orchestrated pipeline + Critic agent loop; ranking is math; hard blocklist by video id.
7. Stay concise (usually under 180 words). No markdown tables. Light markdown ok (short lists).
8. Never claim to be a swarm of autonomous agents. Never recommend hustle/clickbait.
9. If they ask to change Me/I Am attributes, point them to Settings — you cannot rewrite path attributes yourself.`;
}
