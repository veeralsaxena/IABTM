import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  inferInterestTokens,
  recommendArtists,
} from "@/lib/data/artists";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: path }, { data: feedback }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("learning_styles, vibe, motivation")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("paths")
        .select("id, me_labels, iam_labels, method, answers")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("artist_feedback")
        .select("artist_id, rating, sentiment, note")
        .eq("user_id", user.id),
    ]);

  const answers = (path?.answers as Record<string, string> | null) ?? {};
  const tokens = inferInterestTokens({
    me: path?.me_labels ?? [],
    iam: path?.iam_labels ?? [],
    method: path?.method,
    answers,
    vibe: profile?.vibe ?? answers.vibe,
    motivation: profile?.motivation ?? answers.motivation,
    learningStyles: profile?.learning_styles ?? [],
  });

  const fbMap = new Map(
    (feedback ?? []).map((f) => [
      f.artist_id as string,
      {
        rating: f.rating as number,
        sentiment: f.sentiment as string,
        note: (f.note as string | null) ?? null,
      },
    ]),
  );

  // Drop hard-disliked artists from recommendations; keep liked near top
  let artists = recommendArtists(tokens, 12)
    .filter((a) => {
      const fb = fbMap.get(a.id);
      if (!fb) return true;
      if (fb.sentiment === "disliked" || fb.rating <= 2) return false;
      return true;
    })
    .map((a) => {
      const fb = fbMap.get(a.id);
      return {
        ...a,
        userFeedback: fb ?? null,
        score: a.score + (fb && (fb.sentiment === "liked" || fb.rating >= 4) ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return NextResponse.json({
    tokens,
    theme:
      tokens.includes("entrepreneur") || tokens.includes("founder")
        ? "Entrepreneurs & builders for your path"
        : tokens.includes("art") || tokens.includes("creative")
          ? "Artists & creative mentors"
          : "People to follow on your path",
    path: path
      ? {
          id: path.id,
          me: path.me_labels,
          iam: path.iam_labels,
          method: path.method,
        }
      : null,
    artists,
    hiddenDisliked: (feedback ?? []).filter(
      (f) => f.sentiment === "disliked" || (f.rating as number) <= 2,
    ).length,
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
  const artistId = String(body.artistId ?? "").trim();
  const artistName = typeof body.artistName === "string" ? body.artistName : null;
  const rating = Number(body.rating);
  const sentiment = body.sentiment as string;
  const note = typeof body.note === "string" ? body.note.trim() : null;
  const pathId = typeof body.pathId === "string" ? body.pathId : null;

  if (!artistId) {
    return NextResponse.json({ error: "Missing artist" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating 1–5 required" }, { status: 400 });
  }
  if (!["liked", "disliked", "mixed"].includes(sentiment)) {
    return NextResponse.json({ error: "Invalid sentiment" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("artist_feedback")
    .upsert(
      {
        user_id: user.id,
        path_id: pathId,
        artist_id: artistId,
        artist_name: artistName,
        rating,
        sentiment,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,artist_id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save" },
      { status: 500 },
    );
  }

  // Feed agent memory via check-in so next identity query sees it
  await supabase.from("check_ins").insert({
    user_id: user.id,
    path_id: pathId,
    body: `Artist feedback (${sentiment}, ${rating}/5): ${artistName ?? artistId}${note ? ` — ${note}` : ""}`,
    growth_signal:
      sentiment === "liked"
        ? "mentor_fit"
        : sentiment === "disliked"
          ? "mentor_mismatch"
          : "mixed",
  });

  return NextResponse.json({ feedback: data });
}
