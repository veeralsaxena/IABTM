import { embedText, toVectorLiteral } from "@/lib/ai/embeddings";
import { journeyStage } from "@/lib/utils";
import type { PathRecord } from "@/types";

export async function buildIdentityQuery(input: {
  path: PathRecord;
  checkIn?: string | null;
  learningStyles?: string[];
  /** Recently completed activity titles — agentic signal */
  completedActivities?: string[];
  /** Soft preference signals from feedback */
  resonatedTopics?: string[];
  rejectedTopics?: string[];
}): Promise<{
  query: string;
  embedding: number[];
  vectorLiteral: string;
  stage: ReturnType<typeof journeyStage>;
}> {
  const stage = journeyStage(input.path.day_number, input.path.total_days);

  const stageGuidance =
    stage === "early"
      ? "Need gentle activation, clarity, and low-friction first wins."
      : stage === "middle"
        ? "Need reinforcement, deeper frameworks, and identity evidence."
        : "Need integration, mastery signals, and becoming-language.";

  const query = [
    `Current self: ${input.path.me_labels.join(", ")}.`,
    `Imagined self: ${input.path.iam_labels.join(", ")}.`,
    `Method: ${input.path.method}.`,
    `Journey day ${input.path.day_number} of ${input.path.total_days} (${stage}).`,
    stageGuidance,
    input.learningStyles?.length
      ? `Preferred learning styles: ${input.learningStyles.join(", ")}.`
      : "",
    input.checkIn ? `Latest check-in: ${input.checkIn}` : "",
    input.completedActivities?.length
      ? `Recently practiced activities: ${input.completedActivities.join("; ")}. Prefer media that deepens or builds on these practices.`
      : "",
    input.resonatedTopics?.length
      ? `User resonated with: ${input.resonatedTopics.join(", ")}. Bias toward similar tone and depth.`
      : "",
    input.rejectedTopics?.length
      ? `User rejected: ${input.rejectedTopics.join(", ")}. Avoid similar clickbait or mismatched tone.`
      : "",
    "Optimize for human potential and identity growth, not attention or dopamine.",
  ]
    .filter(Boolean)
    .join(" ");

  const embedding = await embedText(query);
  return {
    query,
    embedding,
    vectorLiteral: toVectorLiteral(embedding),
    stage,
  };
}
