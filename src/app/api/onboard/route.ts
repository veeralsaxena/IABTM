import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pickMethod } from "@/lib/data/catalog";
import { embedText } from "@/lib/ai/embeddings";
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

  const identityText = `Becoming from ${me.join(", ")} to ${iam.join(", ")} through ${method.id}. ${method.blurb}. Vibe ${vibe ?? ""}. Prefers ${motivation ?? ""}.`;
  const embedding = await embedText(identityText);

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

  const { data: path, error } = await supabase
    .from("paths")
    .insert({
      user_id: user.id,
      me_labels: me,
      iam_labels: iam,
      method: method.id,
      method_rationale: rationale,
      day_number: 1,
      total_days: 111,
      progress: 0,
      identity_embedding: embedding,
      answers,
      status: "active",
    })
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
        primary_media_id: briefing.primary.id,
        secondary_media_ids: briefing.secondary.map((s) => s.id),
        activity_id: briefing.activity?.id ?? null,
        reason: briefing.reason,
        why_now: briefing.whyNow,
        agent_trace: briefing.trace,
      },
      { onConflict: "user_id,path_id,briefing_date" },
    );
  } catch (e) {
    console.error("curation during onboard failed", e);
  }

  return NextResponse.json({ path, briefing, method });
}
