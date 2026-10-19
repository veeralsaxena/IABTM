import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json({ useBrowser: true });
  }

  const { text } = await request.json().catch(() => ({ text: "" }));
  const script = String(text ?? "").slice(0, 4000).trim();
  if (!script) {
    return NextResponse.json({ error: "Nothing to speak" }, { status: 400 });
  }

  const voice = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `ElevenLabs failed: ${err.slice(0, 240)}`, useBrowser: true },
      { status: 502 },
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
