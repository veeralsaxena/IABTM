import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCuratorPipeline } from "@/lib/curator/pipeline";
import type { DailyBriefingResult, PathRecord } from "@/types";

type CachedPayload = {
  primary: DailyBriefingResult["primary"];
  secondary: DailyBriefingResult["secondary"];
  activity: DailyBriefingResult["activity"];
  activities: DailyBriefingResult["activities"];
  reason: string;
  whyNow: string;
  discovery?: DailyBriefingResult["discovery"];
  trace: DailyBriefingResult["trace"];
};

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const force = Boolean(body.force);

  const { data: path } = await supabase
    .from("paths")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!path) {
    return NextResponse.json({ error: "No active path" }, { status: 404 });
  }

  // --- Inactivity / returner handling ---
  // Find last human signal across check-ins, interactions, reviews
  const [{ data: lastCheck }, { data: lastInteract }, { data: lastReview }] =
    await Promise.all([
      supabase
        .from("check_ins")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("interactions")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("media_reviews")
        .select("updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const lastDates = [
    lastCheck?.created_at,
    lastInteract?.created_at,
    lastReview?.updated_at,
    path.updated_at,
  ]
    .filter(Boolean)
    .map((d) => new Date(d as string));

  const lastActivity =
    lastDates.length > 0
      ? new Date(Math.max(...lastDates.map((d) => d.getTime())))
      : new Date(path.created_at as string);

  const daysAway = daysBetween(new Date(), lastActivity);

  // Advance path day by calendar gap (capped) so stage can shift after absence
  let activePath = path as PathRecord;
  if (daysAway >= 1) {
    const advanced = Math.min(
      path.total_days as number,
      (path.day_number as number) + Math.min(daysAway, 7),
    );
    if (advanced !== path.day_number) {
      const progress = advanced / Math.max(1, path.total_days as number);
      await supabase
        .from("paths")
        .update({
          day_number: advanced,
          progress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", path.id);
      activePath = {
        ...(path as PathRecord),
        day_number: advanced,
        progress,
      };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  // After 2+ days away, never serve yesterday's cached "vibe" — force re-curate
  const mustRefresh = daysAway >= 2;

  if (!force && !mustRefresh) {
    const { data: existing } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("user_id", user.id)
      .eq("path_id", activePath.id)
      .eq("briefing_date", today)
      .maybeSingle();

    const cached = existing?.agent_trace as
      | (CachedPayload & { _cachedBriefing?: boolean })
      | null;

    if (existing && cached?._cachedBriefing && cached.primary) {
      return NextResponse.json({
        cached: true,
        daysAway,
        returner: daysAway >= 2,
        path: activePath,
        briefing: {
          primary: cached.primary,
          secondary: cached.secondary ?? [],
          activity: cached.activity ?? null,
          activities: cached.activities ?? (cached.activity ? [cached.activity] : []),
          reason: existing.reason ?? cached.reason,
          whyNow: existing.why_now ?? cached.whyNow,
          discovery: cached.discovery,
          trace: cached.trace,
        },
      });
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("learning_styles")
    .eq("id", user.id)
    .maybeSingle();

  const { data: latestCheckIn } = await supabase
    .from("check_ins")
    .select("body")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const briefing = await runCuratorPipeline({
    userId: user.id,
    path: activePath,
    learningStyles: profile?.learning_styles ?? [],
    checkIn: latestCheckIn?.body,
    daysAway,
  });

  const cachePayload: CachedPayload & { _cachedBriefing: true } = {
    _cachedBriefing: true,
    primary: briefing.primary,
    secondary: briefing.secondary,
    activity: briefing.activity,
    activities: briefing.activities,
    reason: briefing.reason,
    whyNow: briefing.whyNow,
    discovery: briefing.discovery,
    trace: briefing.trace,
  };

  await supabase.from("daily_briefings").upsert(
    {
      user_id: user.id,
      path_id: activePath.id,
      briefing_date: today,
      primary_media_id: null,
      secondary_media_ids: [],
      activity_id: null,
      reason: briefing.reason,
      why_now: briefing.whyNow,
      agent_trace: cachePayload,
    },
    { onConflict: "user_id,path_id,briefing_date" },
  );

  return NextResponse.json({
    cached: false,
    daysAway,
    returner: daysAway >= 2,
    path: activePath,
    briefing,
  });
}
