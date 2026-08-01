import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groqJson } from "@/lib/ai/groq";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, pathId } = await request.json();
  if (!body || typeof body !== "string") {
    return NextResponse.json({ error: "Check-in text required" }, { status: 400 });
  }

  const isActivityLog = body.startsWith("Completed activity:");

  const analysis = isActivityLog
    ? {
        sentiment: 0.6,
        growth_signal: "momentum",
        reflection: "Logged. Tomorrow’s curation will lean into what you practiced.",
      }
    : await groqJson<{
        sentiment: number;
        growth_signal: string;
        reflection: string;
      }>(
        `Analyze a personal growth check-in. Return JSON:
{ "sentiment": number from -1 to 1, "growth_signal": "momentum"|"struggle"|"neutral"|"breakthrough", "reflection": one warm sentence mirroring their words }.`,
        body,
      );

  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      user_id: user.id,
      path_id: pathId ?? null,
      body,
      sentiment: analysis.sentiment,
      growth_signal: analysis.growth_signal,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ checkIn: data, reflection: analysis.reflection });
}
