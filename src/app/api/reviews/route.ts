import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mediaRef = searchParams.get("mediaRef");

  let query = supabase
    .from("media_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (mediaRef) {
    query = query.eq("media_ref", mediaRef).limit(1);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    reviews: data ?? [],
    review: mediaRef ? (data?.[0] ?? null) : undefined,
  });
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
  const mediaRef = String(body.mediaRef ?? "").trim();
  const rating = Number(body.rating);
  const sentiment = body.sentiment as string;
  const review = String(body.review ?? "").trim();
  const pathId = typeof body.pathId === "string" ? body.pathId : null;

  if (!mediaRef) {
    return NextResponse.json({ error: "Missing media" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be 1–5 stars" },
      { status: 400 },
    );
  }
  if (!["liked", "disliked", "mixed"].includes(sentiment)) {
    return NextResponse.json({ error: "Pick liked / disliked / mixed" }, { status: 400 });
  }

  // Stars alone are enough — written review is optional human-in-the-loop detail
  const reviewText =
    review.length >= 1
      ? review
      : sentiment === "disliked" || rating <= 2
        ? `Rated ${rating}/5 — didn’t land`
        : sentiment === "liked" || rating >= 4
          ? `Rated ${rating}/5 — resonated`
          : `Rated ${rating}/5 — mixed`;

  const row = {
    user_id: user.id,
    path_id: pathId,
    media_ref: mediaRef,
    media_title: typeof body.mediaTitle === "string" ? body.mediaTitle : null,
    media_type: typeof body.mediaType === "string" ? body.mediaType : null,
    media_url: typeof body.mediaUrl === "string" ? body.mediaUrl : null,
    rating,
    sentiment,
    review: reviewText,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("media_reviews")
    .upsert(row, { onConflict: "user_id,media_ref" })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save review" },
      { status: 500 },
    );
  }

  // Feed the agentic loop: reviews become check-in signals + interact actions
  const action = sentiment === "liked" ? "resonated" : sentiment === "disliked" ? "not_for_me" : "viewed";
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  await supabase.from("interactions").insert({
    user_id: user.id,
    path_id: pathId,
    media_id: uuidRe.test(mediaRef) ? mediaRef : null,
    action,
  });

  await supabase.from("check_ins").insert({
    user_id: user.id,
    path_id: pathId,
    body: `Media review (${sentiment}, ${rating}/5): ${row.media_title ?? mediaRef} — ${review}`,
    growth_signal: sentiment === "liked" ? "resonance" : sentiment === "disliked" ? "mismatch" : "mixed",
  });

  return NextResponse.json({ review: data });
}
