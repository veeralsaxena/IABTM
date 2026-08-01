export type MediaType =
  | "film"
  | "music"
  | "art"
  | "animation"
  | "editorial"
  | "print"
  | "people"
  | "podcast";

export type JourneyStage = "early" | "middle" | "late" | "any";

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  media_type: MediaType;
  url: string | null;
  thumbnail_url: string | null;
  creator: string | null;
  duration_minutes: number | null;
  tags: string[];
  methods: string[];
  from_attrs: string[];
  to_attrs: string[];
  journey_stage: JourneyStage;
  learning_styles: string[];
  potential_score: number;
  attention_trap_score: number;
  similarity?: number;
}

export interface ScoredMedia extends MediaItem {
  scores: {
    identityFit: number;
    stageFit: number;
    potential: number;
    novelty: number;
    antiAttention: number;
    final: number;
  };
  why?: string;
}

export interface PathRecord {
  id: string;
  user_id: string;
  me_labels: string[];
  iam_labels: string[];
  method: string;
  method_rationale: string | null;
  day_number: number;
  total_days: number;
  progress: number;
  status: string;
}

export interface AgentTrace {
  identityQuery: string;
  stage: JourneyStage;
  retrieved: number;
  ranked: Array<{ id: string; title: string; final: number }>;
  method: string;
  model: string;
  latencyMs: number;
  discoverySource?: string;
  daysAway?: number;
  avoidedFromReviews?: number;
  likedFromReviews?: number;
}

export type ActivityItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
};

export interface DailyBriefingResult {
  primary: ScoredMedia;
  secondary: ScoredMedia[];
  activity: ActivityItem | null;
  activities: ActivityItem[];
  reason: string;
  whyNow: string;
  discovery?: {
    source: string;
    queries: Record<string, string[]>;
    candidatesFound: number;
  };
  trace: AgentTrace;
}
