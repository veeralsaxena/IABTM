export const CURRENT_ATTRIBUTES = [
  "Procrastinating",
  "Lazy",
  "Burnt Out",
  "Anxious",
  "Disconnected",
  "Perfectionist",
  "Overwhelmed",
  "Inconsistent",
  "Creatively Stuck",
  "Out Of Shape",
  "Self-conscious",
  "Scattered",
  "People-pleasing",
  "Impulsive",
  "Isolated",
  "Exhausted",
  "Indecisive",
  "Doom-scrolling",
  "Avoidant",
  "Comparison-driven",
] as const;

export const ASPIRATIONAL_ATTRIBUTES = [
  "Action-oriented",
  "Mindful",
  "Disciplined",
  "Confident",
  "Connected",
  "Creative",
  "Healthy",
  "Present",
  "Resilient",
  "Focused",
  "Self-accepting",
  "Courageous",
  "Consistent",
  "Calm",
  "Accountable",
  "Energized",
  "Grounded",
  "Generous",
  "Curious",
  "Intentional",
] as const;

export const LEARNING_STYLES = [
  "Visual",
  "Auditory",
  "Reading",
  "Kinesthetic",
  "Stories",
  "Short-form",
] as const;

export const METHODS = [
  {
    id: "Timeboxing",
    from: ["Procrastinating", "Scattered", "Overwhelmed", "Indecisive"],
    to: ["Action-oriented", "Focused", "Disciplined", "Consistent"],
    blurb:
      "Protect attention in fixed blocks so starting becomes automatic.",
  },
  {
    id: "Habit Stacking",
    from: ["Inconsistent", "Lazy", "Avoidant"],
    to: ["Consistent", "Disciplined", "Intentional"],
    blurb: "Attach tiny new behaviors to rituals you already keep.",
  },
  {
    id: "Mindful Exposure",
    from: ["Anxious", "Self-conscious", "Avoidant", "People-pleasing"],
    to: ["Courageous", "Confident", "Self-accepting", "Calm"],
    blurb: "Meet discomfort in small doses with awareness, not force.",
  },
  {
    id: "Digital Boundaries",
    from: ["Doom-scrolling", "Burnt Out", "Disconnected", "Exhausted"],
    to: ["Present", "Energized", "Intentional", "Grounded"],
    blurb: "Cut attention leaks so energy returns to what matters.",
  },
  {
    id: "Creative Constraints",
    from: ["Creatively Stuck", "Perfectionist", "Comparison-driven"],
    to: ["Creative", "Curious", "Action-oriented", "Self-accepting"],
    blurb: "Use limits to unblock making instead of waiting for perfect.",
  },
  {
    id: "Body-First Reset",
    from: ["Out Of Shape", "Exhausted", "Anxious", "Burnt Out"],
    to: ["Healthy", "Energized", "Grounded", "Resilient"],
    blurb: "Stabilize mood and identity through movement and recovery.",
  },
  {
    id: "Social Accountability",
    from: ["Isolated", "Disconnected", "Inconsistent", "People-pleasing"],
    to: ["Connected", "Accountable", "Generous", "Confident"],
    blurb: "Grow with witnesses who reinforce the self you are becoming.",
  },
] as const;

export function pickMethod(me: string[], iam: string[]) {
  let best = METHODS[0];
  let bestScore = -1;

  for (const method of METHODS) {
    const fromHits = me.filter((m) =>
      method.from.some((f) => f.toLowerCase() === m.toLowerCase()),
    ).length;
    const toHits = iam.filter((a) =>
      method.to.some((t) => t.toLowerCase() === a.toLowerCase()),
    ).length;
    const score = fromHits * 2 + toHits * 2;
    if (score > bestScore) {
      bestScore = score;
      best = method;
    }
  }

  return best;
}
