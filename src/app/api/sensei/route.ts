import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqText } from "@/lib/ai/groq";
import {
  buildSenseiDay,
  defaultCompanionLine,
  senseiLogLine,
  type SenseiEventKind,
} from "@/lib/sensei/engine";
import type { PathRecord } from "@/types";

const KINDS: SenseiEventKind[] = [
  "viz",
  "practice",
  "offline",
  "freeze",
  "skip",
];

function becomingFromPath(path: PathRecord): string | null {
  const raw = path as PathRecord & {
    identity_block?: { whoIAmBecoming?: string };
    answers?: { identity_block?: { whoIAmBecoming?: string } };
  };
  return (
    raw.identity_block?.whoIAmBecoming ??
    raw.answers?.identity_block?.whoIAmBecoming ??
    null
  );
}

async function activePath(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("paths")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PathRecord | null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = await activePath(user.id);
  if (!path) {
    return NextResponse.json({ error: "No active path" }, { status: 404 });
  }

  const [{ data: profile }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, learning_styles, vibe")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("check_ins")
      .select("body, created_at")
      .eq("user_id", user.id)
      .eq("path_id", path.id)
      .like("body", "sensei:%")
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  let companionLine = defaultCompanionLine(path);
  try {
    companionLine = await groqText(
      "You are the IABTM Sensei. One or two sentences. Warm, culturally humble, no hustle, no comparison. Tell them to rehearse then act in real life. No markdown.",
      JSON.stringify({
        name: profile?.display_name,
        me: path.me_labels,
        iam: path.iam_labels,
        method: path.method,
        day: path.day_number,
        vibe: profile?.vibe ?? null,
      }),
    );
  } catch {
    // keep default
  }

  const day = buildSenseiDay({
    path,
    logs: (logs ?? []) as { body: string; created_at: string }[],
    learningStyles: (profile?.learning_styles as string[]) ?? [],
    vibe: (profile?.vibe as string) ?? null,
    becoming: becomingFromPath(path),
    companionLine,
  });

  return NextResponse.json({
    name: profile?.display_name ?? null,
    path,
    day,
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY),
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
  const kind = body.kind as SenseiEventKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown Sensei event" }, { status: 400 });
  }

  const path = await activePath(user.id);
  if (!path) {
    return NextResponse.json({ error: "No active path" }, { status: 404 });
  }

  if (kind === "freeze") {
    const { data: logs } = await supabase
      .from("check_ins")
      .select("body, created_at")
      .eq("user_id", user.id)
      .eq("path_id", path.id)
      .like("body", "sensei:%")
      .order("created_at", { ascending: false })
      .limit(80);
    const preview = buildSenseiDay({
      path,
      logs: (logs ?? []) as { body: string; created_at: string }[],
      companionLine: "",
    });
    if (preview.week.freezesLeft <= 0) {
      return NextResponse.json(
        { error: "No freezes left this week. Recovery is a practice, not a purchase." },
        { status: 400 },
      );
    }
  }

  const extra =
    typeof body.note === "string" ? body.note.slice(0, 180) : undefined;
  const { error } = await supabase.from("check_ins").insert({
    user_id: user.id,
    path_id: path.id,
    body: senseiLogLine(kind, extra),
    sentiment: kind === "skip" ? 0 : 0.55,
    growth_signal:
      kind === "skip" ? "neutral" : kind === "freeze" ? "struggle" : "momentum",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, kind });
}
