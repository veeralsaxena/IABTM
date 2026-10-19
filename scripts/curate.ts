import { curateRecommendations } from "../src/lib/curator/recommend";

const cases = [
  {
    name: "procrastination → action",
    me: ["Procrastinating", "Avoidant"],
    iam: ["Action-oriented", "Disciplined"],
  },
  {
    name: "doom-scroll → present",
    me: ["Doom-scrolling", "Burnt Out"],
    iam: ["Present", "Energized"],
  },
  {
    name: "anxious → calm",
    me: ["Anxious", "Self-conscious"],
    iam: ["Calm", "Courageous"],
  },
];

for (const c of cases) {
  const out = curateRecommendations(c);
  console.log(`\n${c.name}`);
  console.log(`method: ${out.method}`);
  console.log(`practice: ${out.practice.title}`);
  console.log(
    `primary: ${out.primary.title} (${out.primary.media_type}, fit ${out.primary.scores.identityFit.toFixed(2)})`,
  );
  console.log(
    `also: ${out.secondary.map((s) => s.title).join(" | ")}`,
  );
}
