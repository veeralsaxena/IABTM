import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverCategory } from "@/lib/curator/pipeline";
import { discoverForType, toMediaItem } from "@/lib/curator/web-search";
import { rerankCandidates } from "@/lib/curator/rerank";
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

  try {
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
  } catch (e) {
    // Last-resort: raw discovery without planner/embeddings
    console.error("discoverCategory failed, falling back", e);
    const found = await discoverForType({
      mediaType,
      queries: [
        `${path.method} ${path.me_labels?.[0] ?? ""}`,
        `${mediaType} focus growth`,
      ],
    });
    const candidates = found.map((c) =>
      toMediaItem(c, {
        me: path.me_labels ?? [],
        iam: path.iam_labels ?? [],
        method: path.method,
        stage: "early",
        learningStyles: profile?.learning_styles ?? [],
      }),
    );
    const items = rerankCandidates({
      candidates,
      me: path.me_labels ?? [],
      iam: path.iam_labels ?? [],
      method: path.method,
      stage: "early",
      learningStyles: profile?.learning_styles ?? [],
      seenIds: new Set(),
      identityQuery: `${path.me_labels?.join(" ")} ${path.iam_labels?.join(" ")} ${path.method}`,
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
      degraded: true,
    });
  }
}
