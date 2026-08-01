/**
 * Re-embed + seed the demo catalog.
 *
 * Prefer the already-seeded Supabase project during the hackathon.
 * Only run this if you wiped the DB:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 *
 * Without a service role key, this writes scripts/seed.sql for manual apply.
 */
import { createClient } from "@supabase/supabase-js";
import { embedText, toVectorLiteral } from "../src/lib/ai/embeddings";
import { SEED_ACTIVITIES, SEED_MEDIA } from "../src/lib/data/seed-media";
import {
  ASPIRATIONAL_ATTRIBUTES,
  CURRENT_ATTRIBUTES,
} from "../src/lib/data/catalog";
import { writeFileSync } from "fs";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`Embedding ${SEED_MEDIA.length} media items…`);
  const mediaRows = [];
  for (const m of SEED_MEDIA) {
    const embedding = await embedText(
      `${m.title}. ${m.description}. From ${m.from_attrs.join(", ")} to ${m.to_attrs.join(", ")}. Method: ${m.methods.join(", ")}.`,
    );
    mediaRows.push({ ...m, embedding });
    console.log(`  ✓ ${m.title}`);
  }

  console.log(`Embedding ${SEED_ACTIVITIES.length} activities…`);
  const activityRows = [];
  for (const a of SEED_ACTIVITIES) {
    const embedding = await embedText(
      `${a.title}. ${a.description}. Methods: ${a.methods.join(", ")}`,
    );
    activityRows.push({ ...a, embedding });
    console.log(`  ✓ ${a.title}`);
  }

  if (!serviceKey) {
    const lines: string[] = [
      "truncate public.interactions, public.daily_briefings, public.media, public.activities restart identity cascade;",
    ];
    for (const m of mediaRows) {
      lines.push(
        `insert into public.media (title, description, media_type, url, thumbnail_url, creator, duration_minutes, tags, methods, from_attrs, to_attrs, journey_stage, learning_styles, potential_score, attention_trap_score, embedding) values (${sql(m.title)}, ${sql(m.description)}, ${sql(m.media_type)}, ${sql(m.url)}, ${sql(m.thumbnail_url)}, ${sql(m.creator)}, ${m.duration_minutes}, ${arr(m.tags)}, ${arr(m.methods)}, ${arr(m.from_attrs)}, ${arr(m.to_attrs)}, ${sql(m.journey_stage)}, ${arr(m.learning_styles)}, ${m.potential_score}, ${m.attention_trap_score}, '${toVectorLiteral(m.embedding)}'::extensions.vector);`,
      );
    }
    for (const a of activityRows) {
      lines.push(
        `insert into public.activities (title, description, category, methods, from_attrs, to_attrs, journey_stage, embedding) values (${sql(a.title)}, ${sql(a.description)}, ${sql(a.category)}, ${arr(a.methods)}, ${arr(a.from_attrs)}, ${arr(a.to_attrs)}, ${sql(a.journey_stage)}, '${toVectorLiteral(a.embedding)}'::extensions.vector);`,
      );
    }
    writeFileSync("scripts/seed.sql", lines.join("\n"));
    console.log("Wrote scripts/seed.sql (add SERVICE_ROLE_KEY to insert directly).");
    return;
  }

  const supabase = createClient(url, serviceKey);
  await supabase.from("media").delete().neq("title", "");
  await supabase.from("activities").delete().neq("title", "");
  const { error: mediaErr } = await supabase.from("media").insert(
    mediaRows.map((m) => ({ ...m, embedding: m.embedding })),
  );
  if (mediaErr) throw mediaErr;
  const { error: actErr } = await supabase.from("activities").insert(
    activityRows.map((a) => ({ ...a, embedding: a.embedding })),
  );
  if (actErr) throw actErr;
  await supabase.from("attributes").upsert(
    [
      ...CURRENT_ATTRIBUTES.map((label) => ({ label, kind: "current" })),
      ...ASPIRATIONAL_ATTRIBUTES.map((label) => ({
        label,
        kind: "aspirational",
      })),
    ],
    { onConflict: "label" },
  );
  console.log("Seed complete.");
}

function sql(s: string) {
  return `'${s.replace(/'/g, "''")}'`;
}
function arr(a: string[]) {
  return `ARRAY[${a.map(sql).join(",")}]::text[]`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
