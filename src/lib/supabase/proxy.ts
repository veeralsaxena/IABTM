import { NextResponse, type NextRequest } from "next/server";

// Auth is off. Local runs do not need a Supabase session.
export function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}
