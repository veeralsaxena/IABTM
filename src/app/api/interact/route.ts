import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mediaId, activityId, pathId, action } = await request.json();
  const allowed = [
    "viewed",
    "saved",
    "completed",
    "not_today",
    "not_for_me",
    "resonated",
  ];
  if (!allowed.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const safeActivityId =
    typeof activityId === "string" && uuidRe.test(activityId)
      ? activityId
      : null;
  // Web-discovered media uses synthetic ids (yt_...), so skip media FK when not UUID.
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

  return NextResponse.json({ ok: true });
}
