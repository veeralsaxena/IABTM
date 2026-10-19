import { NextResponse } from "next/server";
import { liveMedia } from "@/lib/curator/ingest";
import { curateRecommendations } from "@/lib/curator/recommend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Production entry. No session required.
 * Uses the ingested catalog when it has videos, and the starter shelf otherwise.
 * Body: { me: string[], iam: string[], method?, dayNumber?, learningStyles?, likedTitles?, dislikedTitles? }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const me = Array.isArray(body.me) ? body.me.map(String) : [];
  const iam = Array.isArray(body.iam) ? body.iam.map(String) : [];

  try {
    const ingested = liveMedia();
    const result = curateRecommendations({
      me,
      iam,
      method: typeof body.method === "string" ? body.method : undefined,
      dayNumber: typeof body.dayNumber === "number" ? body.dayNumber : undefined,
      learningStyles: Array.isArray(body.learningStyles)
        ? body.learningStyles.map(String)
        : undefined,
      likedTitles: Array.isArray(body.likedTitles)
        ? body.likedTitles.map(String)
        : undefined,
      dislikedTitles: Array.isArray(body.dislikedTitles)
        ? body.dislikedTitles.map(String)
        : undefined,
      extra: ingested,
    });
    return NextResponse.json({
      ...result,
      catalogSize: ingested.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Curator failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
