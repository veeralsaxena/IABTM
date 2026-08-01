import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverCategory } from "@/lib/curator/pipeline";
import type { MediaType, PathRecord } from "@/types";

const TYPES: MediaType[] = [
  "film",
  "music",
  "art",
  "animation",
  "editorial",
  "print",
  "people",
  "podcast",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const mediaType = (body.mediaType as MediaType) || "film";
  if (!TYPES.includes(mediaType)) {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("learning_styles")
    .eq("id", user.id)
    .maybeSingle();

  const items = await discoverCategory({
    userId: user.id,
    path: path as PathRecord,
    mediaType,
    learningStyles: profile?.learning_styles ?? [],
  });

  return NextResponse.json({
    mediaType,
    path: {
      id: path.id,
      method: path.method,
      me_labels: path.me_labels,
      iam_labels: path.iam_labels,
    },
    items,
  });
}
