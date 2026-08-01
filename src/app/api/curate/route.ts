import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runCuratorPipeline } from "@/lib/curator/pipeline";
import type { PathRecord } from "@/types";

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

    if (existing) {
      const ids = [
        existing.primary_media_id,
        ...(existing.secondary_media_ids ?? []),
      ].filter(Boolean) as string[];

      const { data: media } = await supabase
        .from("media")
        .select("*")
        .in("id", ids);

      const { data: activity } = existing.activity_id
        ? await supabase
            .from("activities")
            .select("*")
            .eq("id", existing.activity_id)
            .maybeSingle()
        : { data: null };

      const primary = media?.find((m) => m.id === existing.primary_media_id);
      const secondary =
        media?.filter((m) => m.id !== existing.primary_media_id) ?? [];

      return NextResponse.json({
        cached: true,
        path,
        briefing: {
          primary,
          secondary,
          activity,
          reason: existing.reason,
          whyNow: existing.why_now,
          trace: existing.agent_trace,
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

  await supabase.from("daily_briefings").upsert(
    {
      user_id: user.id,
      path_id: path.id,
      briefing_date: today,
      primary_media_id: briefing.primary.id,
      secondary_media_ids: briefing.secondary.map((s) => s.id),
      activity_id: briefing.activity?.id ?? null,
      reason: briefing.reason,
      why_now: briefing.whyNow,
      agent_trace: briefing.trace,
    },
    { onConflict: "user_id,path_id,briefing_date" },
  );

  return NextResponse.json({ cached: false, path, briefing });
}
