import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildCustomPathEdition,
  buildPathDiary,
  scoreMerchForPath,
} from "@/lib/shop/personalize";
import type { PathRecord } from "@/types";

/**
 * Becoming Drop API
 * - User style profile from Me/I Am/method/stage
 * - Rank IABTM catalog via style-vector fit (content-based)
 * - Custom Path Edition mockup (POD — not in catalog yet)
 * - Physical Path Diary spec (POD hardcover)
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, { data: path }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("paths")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!path) {
    return NextResponse.json(
      { error: "No active path — create one to unlock your Becoming Drop." },
      { status: 404 },
    );
  }

  const p = path as PathRecord;
  const name = profile?.display_name || user.email?.split("@")[0] || "You";

  const input = {
    name,
    me: p.me_labels ?? [],
    iam: p.iam_labels ?? [],
    method: p.method,
    day: p.day_number,
    totalDays: p.total_days,
    methodRationale: p.method_rationale,
  };

  const { profile: styleProfile, ranked } = scoreMerchForPath(input);
  const custom = buildCustomPathEdition(input);
  const diary = buildPathDiary(input);
  const hero = ranked[0] ?? null;

  return NextResponse.json({
    ok: true,
    path: {
      id: p.id,
      me: input.me,
      iam: input.iam,
      method: input.method,
      day: input.day,
      totalDays: input.totalDays,
      name,
    },
    styleProfile,
    howItWorks: {
      industry:
        "Content-based filtering with an explicit style taxonomy (what Stitch Fix / catalog merchandising use for explainable recs). Embeddings help at huge scale for image/text search; neural graphs help with multi-hop relations. For identity→SKU with partner printing, structured style vectors + POD mockups are the practical holy grail.",
      inputs: [
        "Me / I Am attributes",
        "Method + journey day → stage",
        "Each product’s Style Profile (we labeled: energy, visibility, discipline, body, creativity)",
      ],
      process:
        "Build user style vector from attributes → compare to each product vector (styleFit = 1 − average axis gap) → blend with stageFit → rank. Separately generate a Custom Path Edition design brief + Path Diary print spec for POD partners.",
      outputs: [
        "Ranked existing IABTM SKUs with axis-level explanation",
        "Custom Path Edition mockup (new design, not in shop yet)",
        "Physical Path Diary ship list + interior prompts",
      ],
      formula: "final = 0.70×styleFit + 0.30×stageFit",
    },
    custom,
    diary,
    journal: diary,
    hero,
    drop: ranked.slice(0, 8),
    catalogSize: ranked.length,
    storeUrl: "https://iambetterthanme.com/shop",
  });
}
