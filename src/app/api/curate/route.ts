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

  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    const { data: existing } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("user_id", user.id)
      .eq("path_id", path.id)
      .eq("briefing_date", today)
      .maybeSingle();

    const cached = existing?.agent_trace as
      | (CachedPayload & { _cachedBriefing?: boolean })
      | null;

    if (existing && cached?._cachedBriefing && cached.primary) {
      return NextResponse.json({
        cached: true,
        path,
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
    path: path as PathRecord,
    learningStyles: profile?.learning_styles ?? [],
    checkIn: latestCheckIn?.body,
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
      path_id: path.id,
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

  return NextResponse.json({ cached: false, path, briefing });
}
