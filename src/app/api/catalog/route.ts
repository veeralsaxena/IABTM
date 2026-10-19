import { NextResponse } from "next/server";
import { readCatalog } from "@/lib/curator/catalog-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = readCatalog();
  return NextResponse.json({
    count: items.length,
    items,
  });
}
