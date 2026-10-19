import { journeyStage } from "@/lib/utils";
import type {
  ActivityItem,
  LicensePartner,
  LicensedPayload,
  PathRecord,
  SkillNode,
  TwoTracks,
  VisualizationBeat,
} from "@/types";

export type { LicensePartner, LicensedPayload, SkillNode, TwoTracks };

const FOUNDER =
  /\b(founder|entrepreneur|startup|operator|business owner|ceo)\b/i;
const CAREER_CRAFT =
  /\b(career|craft|profession|industry|fashion|music|film|design|creative|leader|executive)\b/i;
const JOURNALISM =
  /\b(reading|journalism|news|editorial|writer|article)\b/i;

export function inferSkillNode(
  path: Pick<PathRecord, "me_labels" | "iam_labels" | "day_number" | "total_days">,
): SkillNode {
  const stage = journeyStage(path.day_number, path.total_days);
  const blob = `${path.iam_labels.join(" ")} ${path.me_labels.join(" ")}`;
  if (stage === "late" && CAREER_CRAFT.test(blob)) return "craft";
  if (stage !== "early" && /\b(master|craft|expert|artist|leader)\b/i.test(blob)) {
    return "craft";
  }
  return "start";
}

function prefersJournalism(learningStyles: string[], vibe?: string | null) {
  return JOURNALISM.test(`${learningStyles.join(" ")} ${vibe ?? ""}`);
}

const CATALOG: Record<LicensePartner, Omit<LicensedPayload, "status" | "whyNow">> =
  {
    "Harvard Business Review": {
      id: "lic_hbr_fewer_decisions",
      partner: "Harvard Business Review",
      title: "Make fewer, better decisions",
      durationMinutes: 8,
      format: "editorial",
      skillNode: "start",
      whyThisPartner:
        "HBR is the right shelf for a decision-quality framework — short, research-backed, not a course.",
      href: "https://hbr.org/",
    },
    "The New York Times": {
      id: "lic_nyt_attention",
      partner: "The New York Times",
      title: "Attention is a practice, not a mood",
      durationMinutes: 8,
      format: "editorial",
      skillNode: "start",
      whyThisPartner:
        "Journalism vibe: NYT on attention, only when this person actually prefers reading the news — not a default dump.",
      href: "https://www.nytimes.com/",
    },
    Yellowbrick: {
      id: "lic_yb_career_craft",
      partner: "Yellowbrick",
      title: "Career-craft essentials module",
      durationMinutes: 12,
      format: "module",
      skillNode: "craft",
      whyThisPartner:
        "Yellowbrick when the Path is career-craft — sequence into their module, do not replace their LMS.",
      href: "https://www.yellowbrick.co/",
    },
    Entrepreneur: {
      id: "lic_ent_founder_ops",
      partner: "Entrepreneur",
      title: "Operator habits for the founder I Am",
      durationMinutes: 8,
      format: "editorial",
      skillNode: "start",
      whyThisPartner:
        "Entrepreneur when I Am is founder — practical operator copy, not a 40-minute lecture.",
      href: "https://www.entrepreneur.com/",
    },
    MasterClass: {
      id: "lic_mc_craft_later",
      partner: "MasterClass",
      title: "Craft lesson — held until the skill node is craft",
      durationMinutes: 40,
      format: "lesson",
      skillNode: "craft",
      whyThisPartner:
        "MasterClass is for mastery, not day-14 activation. Hold until the Path node is craft, not start.",
      href: "https://www.masterclass.com/",
    },
  };

/**
 * Pick today's licensed rehearsal piece. One partner, ~8 minutes, optional.
 * Others stay on a "held" shelf so licensing conversations can see the map.
 */
export function pickLicensedPayload(input: {
  path: Pick<
    PathRecord,
    "me_labels" | "iam_labels" | "method" | "day_number" | "total_days"
  >;
  learningStyles?: string[];
  vibe?: string | null;
}): { now: LicensedPayload; held: LicensedPayload[] } {
  const skillNode = inferSkillNode(input.path);
  const blob = `${input.path.me_labels.join(" ")} ${input.path.iam_labels.join(" ")} ${input.path.method}`;
  const journalism = prefersJournalism(input.learningStyles ?? [], input.vibe);
  const founder = FOUNDER.test(blob);
  const career = CAREER_CRAFT.test(blob);

  let partner: LicensePartner = "Harvard Business Review";
  if (skillNode === "craft") {
    partner = career ? "Yellowbrick" : "MasterClass";
  } else if (founder) {
    partner = "Entrepreneur";
  } else if (journalism) {
    partner = "The New York Times";
  } else if (career && journeyStage(input.path.day_number, input.path.total_days) !== "early") {
    partner = "Yellowbrick";
  }

  const whyNow =
    skillNode === "start"
      ? `Day ${input.path.day_number}: rehearse I Am in under 10 minutes. A 40-minute MasterClass episode is the wrong object.`
      : `Day ${input.path.day_number}: skill node is craft — longer partner lessons are in play.`;

  const now: LicensedPayload = {
    ...CATALOG[partner],
    status: "now",
    whyNow,
  };

  const held = (Object.keys(CATALOG) as LicensePartner[])
    .filter((p) => p !== partner)
    .map((p) => {
      const item = CATALOG[p];
      const later =
        p === "MasterClass"
          ? skillNode !== "craft"
          : item.skillNode === "craft" && skillNode === "start";
      return {
        ...item,
        status: later ? ("later" as const) : ("later" as const),
        whyNow: later
          ? "On the shelf for a later Path node — not today."
          : "Available via partnership, not selected for this identity today.",
      };
    });

  return { now, held };
}

export function identityLine(
  path: Pick<PathRecord, "iam_labels" | "method">,
  becoming?: string | null,
) {
  if (becoming?.trim()) return becoming.trim();
  const iam = path.iam_labels[0] ?? "the self I imagine";
  return `Today I practice being ${iam} by using ${path.method}.`;
}

export function visualizationForPath(
  path: Pick<PathRecord, "me_labels" | "iam_labels" | "method" | "day_number">,
): VisualizationBeat {
  const me = path.me_labels[0] ?? "who I am today";
  const iam = path.iam_labels[0] ?? "who I am becoming";
  return {
    title: "90-second I Am rehearsal",
    durationSeconds: 90,
    script: `Close your eyes. Notice ${me} without judgment. See tomorrow-morning you already acting as ${iam}. One ${path.method} block is already on the calendar. Feel the body starting it — not watching a video about it. Open your eyes and go do that block.`,
  };
}

export function compileTwoTracks(input: {
  path: PathRecord;
  activities: ActivityItem[];
  learningStyles?: string[];
  vibe?: string | null;
  becoming?: string | null;
}): TwoTracks {
  const stage = journeyStage(input.path.day_number, input.path.total_days);
  const skillNode = inferSkillNode(input.path);
  const licensed = pickLicensedPayload(input);
  const primary = input.activities[0] ?? null;

  return {
    skillNode,
    stage,
    subconscious: {
      identityLine: identityLine(input.path, input.becoming),
      visualization: visualizationForPath(input.path),
      licensed: licensed.now,
      held: licensed.held,
    },
    action: {
      primary,
      note: primary
        ? "Do this in your real life. The licensed piece is optional support — not a substitute."
        : "No timed practice yet — still do one tiny version of the method today.",
    },
  };
}
