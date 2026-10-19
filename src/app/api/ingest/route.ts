import { NextResponse } from "next/server";
import { ingestForIdentity, ingestUrl } from "@/lib/curator/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Save into the local catalog.
 * Identity search: { me, iam, method?, limit? }
 * One link, the way their admin panel works: { url, me, iam, method?, fileUrl? }
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
    if (typeof body.url === "string" && body.url.trim()) {
      const saved = await ingestUrl({
        url: body.url,
        me,
        iam,
        method: typeof body.method === "string" ? body.method : undefined,
        fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : undefined,
      });
      return NextResponse.json(saved);
    }

    const saved = await ingestForIdentity({
      me,
      iam,
      method: typeof body.method === "string" ? body.method : undefined,
      dayNumber: typeof body.dayNumber === "number" ? body.dayNumber : undefined,
      limit: typeof body.limit === "number" ? body.limit : 6,
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
