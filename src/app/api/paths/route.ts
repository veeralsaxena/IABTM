import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: paths, error } = await supabase
    .from("paths")
    .select(
      "id, me_labels, iam_labels, method, method_rationale, day_number, total_days, progress, status, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ paths: paths ?? [] });
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

  return NextResponse.json({ path });
}
