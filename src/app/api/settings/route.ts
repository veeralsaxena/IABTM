import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickMethod } from "@/lib/data/catalog";
import { embedText } from "@/lib/ai/embeddings";
import { groqText } from "@/lib/ai/groq";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: paths }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url, learning_styles, vibe, motivation, daily_minutes")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("paths")
      .select(
        "id, me_labels, iam_labels, method, method_rationale, day_number, total_days, status, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const active = (paths ?? []).find((p) => p.status === "active") ?? null;

  return NextResponse.json({
    profile,
    paths: paths ?? [],
    activePath: active,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const section = body.section as "general" | "attributes" | "path";

  if (section === "general") {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: body.displayName ?? undefined,
        avatar_url: body.avatarUrl ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (section === "path") {
    const pathId = body.pathId as string;
    if (!pathId) {
      return NextResponse.json({ error: "pathId required" }, { status: 400 });
    }
    await supabase
      .from("paths")
      .update({ status: "paused" })
      .eq("user_id", user.id)
      .eq("status", "active");
    const { data: path, error } = await supabase
      .from("paths")
      .update({ status: "active" })
      .eq("id", pathId)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error || !path) {
      return NextResponse.json(
        { error: error?.message ?? "Could not activate path" },
        { status: 500 },
      );
    }
    // Invalidate today's briefing so new path gets fresh curation
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("daily_briefings")
      .delete()
      .eq("user_id", user.id)
      .eq("briefing_date", today);
    return NextResponse.json({ ok: true, path });
  }

  if (section === "attributes") {
    const me = (body.me as string[]) ?? [];
    const iam = (body.iam as string[]) ?? [];
    if (me.length < 1 || iam.length < 1) {
      return NextResponse.json(
        { error: "Need at least one Me and one I Am attribute" },
        { status: 400 },
      );
    }

    const { data: active } = await supabase
      .from("paths")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!active) {
      return NextResponse.json({ error: "No active path" }, { status: 404 });
    }

    const method = pickMethod(me, iam);
    const rationale = await groqText(
      "Explain in 2 short sentences why this method fits. No markdown. No brand names.",
      `Me: ${me.join(", ")}. I Am: ${iam.join(", ")}. Method: ${method.id}. ${method.blurb}`,
    );
    const embedding = await embedText(
      `Becoming from ${me.join(", ")} to ${iam.join(", ")} through ${method.id}.`,
    );

    const { data: path, error } = await supabase
      .from("paths")
      .update({
        me_labels: me,
        iam_labels: iam,
        method: method.id,
        method_rationale: rationale,
        identity_embedding: embedding,
      })
      .eq("id", active.id)
      .select("*")
      .single();

    if (error || !path) {
      return NextResponse.json(
        { error: error?.message ?? "Could not update attributes" },
        { status: 500 },
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("daily_briefings")
      .delete()
      .eq("user_id", user.id)
      .eq("path_id", path.id)
      .eq("briefing_date", today);

    return NextResponse.json({
      ok: true,
      path,
      method,
      recurate: true,
    });
  }

  return NextResponse.json({ error: "Unknown section" }, { status: 400 });
}
