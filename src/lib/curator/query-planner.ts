import { groqJson } from "@/lib/ai/groq";
import type { MediaType, PathRecord } from "@/types";

const MEDIA_TYPES: MediaType[] = [
  "film",
  "music",
  "art",
  "animation",
  "editorial",
  "print",
  "people",
  "podcast",
];

export type PlannedQueries = {
  queriesByType: Partial<Record<MediaType, string[]>>;
  activities: Array<{
    title: string;
    description: string;
    category: "outdoor" | "indoor" | "social" | "reflection" | "movement";
  }>;
};

export async function planDiscoveryQueries(input: {
  path: PathRecord;
  stage: string;
  learningStyles?: string[];
  checkIn?: string | null;
}): Promise<PlannedQueries> {
  try {
    const planned = await groqJson<PlannedQueries>(
      `You are a discovery planner for a growth curator.
Return JSON:
{
  "queriesByType": {
    "film": ["search query", "search query"],
    "music": ["..."],
    "art": ["..."],
    "animation": ["..."],
    "editorial": ["..."],
    "print": ["..."],
    "people": ["mentor or thinker name + topic"],
    "podcast": ["..."]
  },
  "activities": [
    { "title": "...", "description": "...", "category": "outdoor|indoor|social|reflection|movement" }
  ]
}
Rules:
- Queries must find REAL public web/YouTube content that helps move Me → I Am via the method.
- Prefer educational / practical / mentor content. Avoid clickbait and hustle porn.
- Include 2 queries per media type.
- Include 4-6 concrete activities (at least 2 outdoor or movement).
- No brand names of competing apps.`,
      JSON.stringify({
        me: input.path.me_labels,
        iam: input.path.iam_labels,
        method: input.path.method,
        stage: input.stage,
        day: input.path.day_number,
        learningStyles: input.learningStyles ?? [],
        checkIn: input.checkIn ?? null,
        mediaTypes: MEDIA_TYPES,
      }),
    );

    return normalizePlan(planned, input.path);
  } catch {
    return fallbackPlan(input.path, input.stage);
  }
}

function normalizePlan(planned: PlannedQueries, path: PathRecord): PlannedQueries {
  const queriesByType: PlannedQueries["queriesByType"] = {};
  for (const type of MEDIA_TYPES) {
    const qs = planned.queriesByType?.[type];
    queriesByType[type] =
      qs?.filter(Boolean).slice(0, 2) ??
      fallbackQueries(path, type);
  }
  const activities =
    planned.activities?.filter((a) => a.title && a.description).slice(0, 6) ??
    [];
  return {
    queriesByType,
    activities: activities.length
      ? activities
      : fallbackPlan(path, "any").activities,
  };
}

function fallbackQueries(path: PathRecord, type: MediaType): string[] {
  const me = path.me_labels[0] ?? "stuck";
  const iam = path.iam_labels[0] ?? "growth";
  const method = path.method;
  const base = `${method} ${me} to ${iam}`;
  switch (type) {
    case "film":
      return [`${base} explained video`, `${method} practical tutorial`];
    case "music":
      return [`focus deep work instrumental`, `calm productivity ambient music`];
    case "podcast":
      return [`${method} podcast interview`, `${iam} habits podcast`];
    case "people":
      return [`${method} expert interview`, `mentor talk ${iam}`];
    case "editorial":
      return [`${method} how to guide`, `${me} recovery framework article`];
    case "print":
      return [`${method} one page worksheet`, `${iam} habit checklist printable`];
    case "art":
      return [`${iam} motivational art poster`, `attention economy art`];
    case "animation":
      return [`${method} animated explainer`, `${me} psychology animation`];
    default:
      return [base];
  }
}

function fallbackPlan(path: PathRecord, stage: string): PlannedQueries {
  const queriesByType: PlannedQueries["queriesByType"] = {};
  for (const type of MEDIA_TYPES) {
    queriesByType[type] = fallbackQueries(path, type);
  }
  return {
    queriesByType,
    activities: [
      {
        title: "Ten-minute outdoor walk",
        description:
          "Leave your phone in your pocket. Notice three physical details on the route.",
        category: "outdoor",
      },
      {
        title: "One protected timebox",
        description: `Block ${path.method === "Timeboxing" ? "25" : "15"} minutes for the avoided task — timer on, notifications off.`,
        category: "indoor",
      },
      {
        title: "Body reset",
        description:
          "Do two minutes of stretching or stairs before your next decision.",
        category: "movement",
      },
      {
        title: "Identity sentence",
        description: `Write: "Today I practice being ${path.iam_labels[0] ?? "intentional"} by…"`,
        category: "reflection",
      },
      {
        title: "Tell one person",
        description:
          "Share your path method with someone who will ask you about it tomorrow.",
        category: "social",
      },
      {
        title: stage === "early" ? "Tiny first win" : "Evidence log",
        description:
          stage === "early"
            ? "Finish the smallest version of the thing you are avoiding."
            : "Write three pieces of evidence you are becoming your I Am.",
        category: "reflection",
      },
    ],
  };
}
