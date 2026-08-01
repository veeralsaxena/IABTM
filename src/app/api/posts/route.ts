import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileLite = {
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, body, media_url, media_kind, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((posts ?? []).map((p) => p.user_id as string))];
  const profileMap = new Map<string, ProfileLite>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id as string, {
        display_name: (p.display_name as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  const items = (posts ?? []).map((p) => {
    const profile = profileMap.get(p.user_id as string);
    return {
      id: p.id as string,
      body: p.body as string,
      media_url: (p.media_url as string | null) ?? null,
      media_kind: (p.media_kind as string | null) ?? null,
      created_at: p.created_at as string,
      user_id: p.user_id as string,
      author_name: profile?.display_name ?? null,
      author_avatar: profile?.avatar_url ?? null,
      is_mine: p.user_id === user.id,
    };
  });

  return NextResponse.json({ posts: items });
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
  const text = String(body.body ?? "").trim();
  const mediaUrl =
    typeof body.mediaUrl === "string" && body.mediaUrl ? body.mediaUrl : null;
  const mediaKind =
    body.mediaKind === "photo" || body.mediaKind === "video"
      ? body.mediaKind
      : null;

  if (!text && !mediaUrl) {
    return NextResponse.json(
      { error: "Write something or add a photo/video." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      body:
        text ||
        (mediaKind === "video" ? "Shared a video" : "Shared a photo"),
      media_url: mediaUrl,
      media_kind: mediaUrl ? mediaKind ?? "photo" : null,
    })
    .select("id, body, media_url, media_kind, created_at, user_id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to post" },
      { status: 500 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    post: {
      ...data,
      author_name: profile?.display_name,
      author_avatar: profile?.avatar_url,
      is_mine: true,
    },
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
