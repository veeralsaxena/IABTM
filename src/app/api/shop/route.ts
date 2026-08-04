import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildCustomPathEdition,
  buildPathDiary,
  scoreMerchForPath,
} from "@/lib/shop/personalize";
import { checkpointStatuses, nextCheckpoint } from "@/lib/shop/checkpoints";
import {
  buildDemandRadar,
  type RadarPathRow,
} from "@/lib/shop/demand-radar";
import { AXIS_WHY, STYLE_AXES } from "@/lib/shop/styles";
import { STYLE_RULES } from "@/lib/shop/style-profile";
import type { PathRecord } from "@/types";

async function fetchLivePathsForRadar(): Promise<RadarPathRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const admin = createSupabaseJs(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from("paths")
      .select("me_labels, iam_labels, method, day_number, total_days")
      .eq("status", "active")
      .limit(200);
    return (data as RadarPathRow[]) ?? [];
  }

  // Fallback: whatever the signed-in user can read (usually just their path)
  const supabase = await createClient();
  const { data } = await supabase
    .from("paths")
    .select("me_labels, iam_labels, method, day_number, total_days")
    .eq("status", "active")
    .limit(50);
  return (data as RadarPathRow[]) ?? [];
}

/**
 * Becoming Drop API
 * - Deterministic style profile (5 axes, rule table)
 * - Ranked IABTM catalog
 * - Aspirational Path Edition + Path Diary
 * - Checkpoint Drops (11/37/74/111)
 * - Demand Radar for IABTM founders
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
  const checkpoints = checkpointStatuses(input.day);
  const next = nextCheckpoint(input.day);

  const liveRows = await fetchLivePathsForRadar();
  const radar = buildDemandRadar(liveRows);

  // Ensure checkpoint SKUs appear in the drop list even if not top-8 style fit
  const drop = ranked.slice(0, 8);
  const seen = new Set(drop.map((d) => d.id));
  for (const c of checkpoints) {
    const item = ranked.find((r) => r.id === c.featuredProductId);
    if (item && !seen.has(item.id)) {
      drop.push(item);
      seen.add(item.id);
    }
  }

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
    styleSystem: {
      deterministic: true,
      axes: STYLE_AXES.map((axis) => ({
        axis,
        why: AXIS_WHY[axis],
        yourScore: styleProfile.vector[axis],
      })),
      rules: STYLE_RULES.map((r) => ({
        id: r.id,
        label: r.label,
        why: r.why,
      })),
      formula: "final = 0.70×styleFit + 0.30×stageFit",
      note: "Same Me/I Am/method/day → same vector (fingerprint). Product vectors are frozen in catalog.",
    },
    howItWorks: {
      industry:
        "Deterministic content-based filtering with a fixed 5-axis taxonomy. No LLM in scoring. Embeddings are for media/RAG; merch uses explainable attributes.",
      inputs: [
        "Me / I Am attributes",
        "Method + journey day → stage",
        "Each product’s frozen Style Profile",
      ],
      process:
        "Rule table sets axes → round to 2 decimals → compare to product vectors → rank. Checkpoints unlock by day. Radar aggregates cohort styles for restock.",
      outputs: [
        "Ranked IABTM catalog",
        "Aspirational Path Edition",
        "Physical Path Diary",
        "Checkpoint Drops (11/37/74/111)",
        "Demand Radar for IABTM",
      ],
      formula: "final = 0.70×styleFit + 0.30×stageFit",
    },
    custom,
    diary,
    journal: diary,
    checkpoints,
    nextCheckpoint: next,
    radar,
    hero,
    drop,
    catalogSize: ranked.length,
    storeUrl: "https://iambetterthanme.com/shop",
  });
}
