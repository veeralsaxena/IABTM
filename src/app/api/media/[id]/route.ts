import { NextResponse } from "next/server";
import { findCatalogItem } from "@/lib/curator/catalog-store";
import { catalogMedia } from "@/lib/curator/recommend";
import { inAppPlayback } from "@/lib/media/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ingested = findCatalogItem(id);
  if (ingested) return NextResponse.json(ingested);

  const starter = catalogMedia().find((item) => item.id === id);
  if (starter) {
    return NextResponse.json({
      ...starter,
      playback: inAppPlayback(starter.url),
    });
  }

  return NextResponse.json({ error: "Not in the catalog." }, { status: 404 });
}
