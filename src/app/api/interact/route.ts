import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Logs interactions. For not_for_me / not_today on web media (yt_…),
 * also upserts media_reviews so the hard blocklist can exclude them forever.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    mediaId,
    activityId,
    pathId,
    action,
    mediaTitle,
    mediaUrl,
    mediaType,
  } = body as {
    mediaId?: string;
    activityId?: string;
    pathId?: string;
    action?: string;
    mediaTitle?: string;
    mediaUrl?: string;
    mediaType?: string;
  };

  const allowed = [
    "viewed",
    "saved",
    "completed",
    "not_today",
    "not_for_me",
    "resonated",
  ];
  if (!action || !allowed.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const safeActivityId =
    typeof activityId === "string" && uuidRe.test(activityId)
      ? activityId
      : null;
  const safeMediaId =
    typeof mediaId === "string" && uuidRe.test(mediaId) ? mediaId : null;

  const { error } = await supabase.from("interactions").insert({
    user_id: user.id,
    path_id: pathId ?? null,
    media_id: safeMediaId,
    activity_id: safeActivityId,
    action,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hard block: never show this media again
  if (
    (action === "not_for_me" || action === "not_today") &&
    typeof mediaId === "string" &&
    mediaId.length > 0
  ) {
    const rating = action === "not_for_me" ? 1 : 2;
    const sentiment = action === "not_for_me" ? "disliked" : "mixed";
    await supabase.from("media_reviews").upsert(
      {
        user_id: user.id,
        path_id: pathId ?? null,
        media_ref: mediaId,
        media_title: typeof mediaTitle === "string" ? mediaTitle : null,
        media_type: typeof mediaType === "string" ? mediaType : null,
        media_url: typeof mediaUrl === "string" ? mediaUrl : null,
        rating,
        sentiment,
        review:
          action === "not_for_me"
            ? "Blocked — don’t show again"
            : "Not today — deprioritize",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_ref" },
    );
  }

  return NextResponse.json({ ok: true, blocked: action === "not_for_me" });
}
