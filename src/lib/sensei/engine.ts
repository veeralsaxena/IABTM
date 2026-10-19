import { journeyStage } from "@/lib/utils";
import { compileTwoTracks } from "@/lib/curator/licensed";
import { nextCheckpoint } from "@/lib/shop/checkpoints";
import type { ActivityItem, PathRecord, TwoTracks } from "@/types";

export type CombLens = "capability" | "opportunity" | "motivation";

export type SenseiEventKind = "viz" | "practice" | "offline" | "freeze" | "skip";

export type StreakContract = {
  kind: "weekly";
  targetDays: number;
  freezesPerWeek: number;
  label: string;
};

export type SenseiDay = {
  date: string;
  intervention:
    | "visualize"
    | "practice"
    | "licensed"
    | "essential"
    | "nudge"
    | "silence";
  diagnosis: {
    lens: CombLens;
    summary: string;
  };
  contract: StreakContract;
  week: {
    doneDates: string[];
    freezeDates: string[];
    hits: number;
    target: number;
    freezesUsed: number;
    freezesLeft: number;
    recovered: boolean;
  };
  twoTracks: TwoTracks;
  essential: {
    day: number;
    title: string;
    subtitle: string;
    unlocked: boolean;
    daysRemaining: number;
  } | null;
  companionLine: string;
  east: { easy: string; attractive: string; social: string; timely: string };
};

const PREFIX = "sensei:";

export function senseiLogLine(kind: SenseiEventKind, extra?: string) {
  return extra ? `${PREFIX}${kind} ${extra}` : `${PREFIX}${kind}`;
}

export function parseSenseiKind(body: string): SenseiEventKind | null {
  if (!body.startsWith(PREFIX)) return null;
  const kind = body.slice(PREFIX.length).split(/\s+/)[0];
  if (
    kind === "viz" ||
    kind === "practice" ||
    kind === "offline" ||
    kind === "freeze" ||
    kind === "skip"
  ) {
    return kind;
  }
  return null;
}

export function isoDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(day: string) {
  const d = new Date(`${day}T12:00:00.000Z`);
  const wd = d.getUTCDay(); // 0 Sun
  const offset = wd === 0 ? 6 : wd - 1;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function streakContract(path: PathRecord): StreakContract {
  const stage = journeyStage(path.day_number, path.total_days);
  if (stage === "early") {
    return {
      kind: "weekly",
      targetDays: 3,
      freezesPerWeek: 1,
      label: "3 of 7 days — tiny proof, not perfection",
    };
  }
  if (stage === "middle") {
    return {
      kind: "weekly",
      targetDays: 5,
      freezesPerWeek: 1,
      label: "5 of 7 days — identity is sticking",
    };
  }
  return {
    kind: "weekly",
    targetDays: 5,
    freezesPerWeek: 1,
    label: "5 of 7 — lock the lifestyle, freeze allowed",
  };
}

export function diagnose(path: PathRecord): SenseiDay["diagnosis"] {
  const blob = `${path.me_labels.join(" ")} ${path.iam_labels.join(" ")}`.toLowerCase();
  if (/\b(procrastinat|overwhelm|scattered|stuck|busy)\b/.test(blob)) {
    return {
      lens: "opportunity",
      summary:
        "You already know the method. Today the gap is environment and a protected block — not another lecture.",
    };
  }
  if (/\b(anxious|doubt|impost|unworthy|fear)\b/.test(blob)) {
    return {
      lens: "motivation",
      summary:
        "Capability is not the issue. Rehearse I Am, then one kind action. Shame is off the table.",
    };
  }
  if (/\b(beginner|lost|confused|don't know|dont know)\b/.test(blob)) {
    return {
      lens: "capability",
      summary:
        "Skill is the gap. Short rehearsal + the smallest version of the method. No 40-minute class.",
    };
  }
  return {
    lens: "motivation",
    summary: `Close Me → I Am today with ${path.method}: rehearse, then one real move.`,
  };
}

export function fallbackPractice(path: PathRecord): ActivityItem {
  const iam = path.iam_labels[0] ?? "the self I imagine";
  return {
    id: "sensei_tiny",
    title: `One ${path.method} block (10 minutes)`,
    description: `Phone in another room. Do the smallest version of becoming ${iam}. If you already did it offline, log it — that counts.`,
    category: "indoor",
  };
}

export function pickIntervention(
  diagnosis: SenseiDay["diagnosis"],
  weekHits: number,
  target: number,
  vizDoneToday: boolean,
  practiceDoneToday: boolean,
): SenseiDay["intervention"] {
  if (practiceDoneToday) return "silence";
  if (weekHits >= target && !practiceDoneToday) return "practice";
  if (diagnosis.lens === "opportunity") return "practice";
  if (diagnosis.lens === "capability" && !vizDoneToday) return "visualize";
  if (!vizDoneToday) return "visualize";
  return "practice";
}

type LogRow = { body: string; created_at: string };

export function weekStats(
  logs: LogRow[],
  today: string,
  contract: StreakContract,
) {
  const weekStart = startOfWeekMonday(today);
  const inWeek = logs.filter((l) => l.created_at.slice(0, 10) >= weekStart);
  const practiceDates = new Set<string>();
  const freezeDates = new Set<string>();
  for (const row of inWeek) {
    const kind = parseSenseiKind(row.body);
    const day = row.created_at.slice(0, 10);
    if (kind === "practice" || kind === "offline") practiceDates.add(day);
    if (kind === "freeze") freezeDates.add(day);
  }
  const hits = new Set([...practiceDates, ...freezeDates]).size;
  return {
    doneDates: [...practiceDates].sort(),
    freezeDates: [...freezeDates].sort(),
    hits,
    target: contract.targetDays,
    freezesUsed: freezeDates.size,
    freezesLeft: Math.max(0, contract.freezesPerWeek - freezeDates.size),
    recovered: hits >= contract.targetDays,
  };
}

export function buildSenseiDay(input: {
  path: PathRecord;
  logs: LogRow[];
  learningStyles?: string[];
  vibe?: string | null;
  becoming?: string | null;
  companionLine: string;
}): SenseiDay {
  const today = isoDay();
  const contract = streakContract(input.path);
  const week = weekStats(input.logs, today, contract);
  const todayLogs = input.logs.filter((l) => l.created_at.slice(0, 10) === today);
  const vizDoneToday = todayLogs.some((l) => parseSenseiKind(l.body) === "viz");
  const practiceDoneToday = todayLogs.some((k) => {
    const kind = parseSenseiKind(k.body);
    return kind === "practice" || kind === "offline";
  });
  const diagnosis = diagnose(input.path);
  const practice = fallbackPractice(input.path);
  const twoTracks = compileTwoTracks({
    path: input.path,
    activities: [practice],
    learningStyles: input.learningStyles,
    vibe: input.vibe,
    becoming: input.becoming,
  });
  const cp = nextCheckpoint(input.path.day_number);
  const essential = cp
    ? {
        day: cp.day,
        title: cp.title,
        subtitle: cp.subtitle,
        unlocked: cp.unlocked,
        daysRemaining: cp.daysRemaining,
      }
    : null;

  return {
    date: today,
    intervention: pickIntervention(
      diagnosis,
      week.hits,
      week.target,
      vizDoneToday,
      practiceDoneToday,
    ),
    diagnosis,
    contract,
    week,
    twoTracks,
    essential,
    companionLine: input.companionLine,
    east: {
      easy: "One practice. Under 10 minutes. Offline counts.",
      attractive: "Your I Am in your words — not a generic meditation.",
      social: "Share process in 3605 if you want. No ranks.",
      timely: "Rehearse first only if identity needs it. Then go do the thing.",
    },
  };
}

export function defaultCompanionLine(path: PathRecord) {
  const iam = path.iam_labels[0] ?? "who you imagine";
  return `Day ${path.day_number}: I see you becoming ${iam}. Rehearse it, then one ${path.method} move in the real world. I'm not keeping you in the app.`;
}
