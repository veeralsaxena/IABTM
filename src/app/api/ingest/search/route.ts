import { NextResponse } from "next/server";
import { searchForIdentity } from "@/lib/curator/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live search. Does not write the catalog. */
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
    const found = await searchForIdentity({
      me,
      iam,
      method: typeof body.method === "string" ? body.method : undefined,
      dayNumber: typeof body.dayNumber === "number" ? body.dayNumber : undefined,
      limit: typeof body.limit === "number" ? body.limit : 6,
    });
    return NextResponse.json(found);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
