import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickMethod } from "@/lib/data/catalog";
import { embedText } from "@/lib/ai/embeddings";
import { buildIdentityBlock } from "@/lib/curator/identity-block";
import { runCuratorPipeline } from "@/lib/curator/pipeline";
import { groqText } from "@/lib/ai/groq";
import type { PathRecord } from "@/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const me = (body.me as string[]) ?? [];
  const iam = (body.iam as string[]) ?? [];
  const learningStyles = (body.learningStyles as string[]) ?? [];
  const displayName = (body.displayName as string) || undefined;
  const avatarUrl = (body.avatarUrl as string) || undefined;
  const vibe = (body.vibe as string) || undefined;
  const motivation = (body.motivation as string) || undefined;
  const dailyMinutes = body.dailyMinutes as number | undefined;
  const answers = (body.answers as Record<string, string>) || {};

  if (me.length < 1 || iam.length < 1) {
    return NextResponse.json(
      { error: "Pick at least one Me and one I Am attribute." },
      { status: 400 },
    );
  }

  const method = pickMethod(me, iam);
  const rationale = await groqText(
    "You choose personal growth methods. Reply in 2 short sentences explaining why this method fits. No markdown. No brand names.",
    `Me: ${me.join(", ")}. I Am: ${iam.join(", ")}. Method: ${method.id}. Blurb: ${method.blurb}. Vibe: ${vibe ?? "n/a"}. Motivation: ${motivation ?? "n/a"}.`,
  );

  // Identity block → Gemini embedding → stored on path (pgvector-ready)
  const identityBlock = await buildIdentityBlock({
    path: {
      me_labels: me,
      iam_labels: iam,
      method: method.id,
      method_rationale: rationale,
    },
    vibe,
    motivation,
    answers,
  });

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(identityBlock.rawText);
  } catch (e) {
    console.error("identity embed failed", e);
  }

  await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl,
      learning_styles: learningStyles,
      vibe,
      motivation,
      daily_minutes: dailyMinutes ?? null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  await supabase
    .from("paths")
    .update({ status: "paused" })
    .eq("user_id", user.id)
    .eq("status", "active");

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    me_labels: me,
    iam_labels: iam,
    method: method.id,
    method_rationale: rationale,
    day_number: 1,
    total_days: 111,
    progress: 0,
    answers: {
      ...answers,
      identity_block: identityBlock,
    },
    status: "active",
  };
  if (embedding) insertPayload.identity_embedding = embedding;

  const { data: path, error } = await supabase
    .from("paths")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !path) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create path" },
      { status: 500 },
    );
  }

  let briefing = null;
  try {
    briefing = await runCuratorPipeline({
      userId: user.id,
      path: path as PathRecord,
      learningStyles,
    });

    await supabase.from("daily_briefings").upsert(
      {
        user_id: user.id,
        path_id: path.id,
        briefing_date: new Date().toISOString().slice(0, 10),
        reason: briefing.reason,
        why_now: briefing.whyNow,
        agent_trace: {
          _cachedBriefing: true,
          primary: briefing.primary,
          secondary: briefing.secondary,
          activity: briefing.activity,
          activities: briefing.activities,
          reason: briefing.reason,
          whyNow: briefing.whyNow,
          discovery: briefing.discovery,
          trace: briefing.trace,
          identityBlock,
        },
      },
      { onConflict: "user_id,path_id,briefing_date" },
    );
  } catch (e) {
    console.error("curation during onboard failed", e);
  }

  return NextResponse.json({ path, briefing, method, identityBlock });
}
