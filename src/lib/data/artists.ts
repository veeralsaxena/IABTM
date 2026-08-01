export type ArtistPersona = {
  id: string;
  name: string;
  role: string;
  blurb: string;
  why: string;
  tags: string[]; // interest / attribute matches
  focus: string[];
  image: string;
  links: { label: string; url: string }[];
};

/** Mentors / artists / entrepreneurs recommended from onboarding interests. */
export const ARTIST_CATALOG: ArtistPersona[] = [
  {
    id: "naval",
    name: "Naval Ravikant",
    role: "Entrepreneur · investor",
    blurb: "Clear thinking on leverage, judgment, and long-term games.",
    why: "If you care about entrepreneurship, Naval compresses founder mindset without hype.",
    tags: ["entrepreneur", "business", "startup", "founder", "mentors", "frameworks"],
    focus: ["Leverage", "Specific knowledge", "Calm ambition"],
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "How to Get Rich (without getting lucky)",
        url: "https://www.youtube.com/watch?v=1-TZqLkJhKg",
      },
    ],
  },
  {
    id: "sara-blakely",
    name: "Sara Blakely",
    role: "Founder · Spanx",
    blurb: "Bootstrapped grit, rejection resilience, and playful persistence.",
    why: "Great when you want action over perfection — she built by shipping imperfect first versions.",
    tags: [
      "entrepreneur",
      "business",
      "startup",
      "founder",
      "action-oriented",
      "courageous",
      "stories",
    ],
    focus: ["Resilience", "Shipping", "Self-belief"],
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "Sara Blakely on failure & invention",
        url: "https://www.youtube.com/watch?v=oNn_0mPsfsg",
      },
    ],
  },
  {
    id: "paul-graham",
    name: "Paul Graham",
    role: "Essayist · Y Combinator",
    blurb: "Essays that sharpen how founders think about products and people.",
    why: "If frameworks move you, PG essays are dense mentor-media for builders.",
    tags: ["entrepreneur", "startup", "founder", "frameworks", "reading", "curious"],
    focus: ["Product taste", "Do things that don’t scale", "Writing to think"],
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "Do Things That Don’t Scale",
        url: "https://www.youtube.com/watch?v=tIBkFLb7WSE",
      },
    ],
  },
  {
    id: "ali-abdaal",
    name: "Ali Abdaal",
    role: "Creator · productivity educator",
    blurb: "Practical systems for focus, deep work, and kind ambition.",
    why: "Fits paths from scattered / procrastinating toward disciplined action.",
    tags: [
      "productivity",
      "entrepreneur",
      "short videos",
      "visual",
      "focused",
      "disciplined",
      "timeboxing",
    ],
    focus: ["Systems", "Feel-good productivity", "Creator craft"],
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "How to stop procrastinating",
        url: "https://www.youtube.com/watch?v=Qvcx7Y4caZE",
      },
    ],
  },
  {
    id: "brene",
    name: "Brené Brown",
    role: "Researcher · storyteller",
    blurb: "Courage, vulnerability, and belonging without performative hustle.",
    why: "Strong match when I Am includes confident, connected, or self-accepting.",
    tags: [
      "stories",
      "mentors",
      "confident",
      "connected",
      "self-accepting",
      "courageous",
      "anxious",
    ],
    focus: ["Vulnerability", "Shame resilience", "Belonging"],
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "The power of vulnerability",
        url: "https://www.youtube.com/watch?v=iCvmsMzlF7o",
      },
    ],
  },
  {
    id: "james-clear",
    name: "James Clear",
    role: "Author · habits",
    blurb: "Atomic habits and identity-based change — tiny reps, big compound.",
    why: "Natural fit for Habit Stacking and becoming consistent.",
    tags: [
      "habits",
      "frameworks",
      "consistent",
      "disciplined",
      "intentional",
      "reading",
      "habit stacking",
    ],
    focus: ["Identity change", "1% better", "Environment design"],
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "Atomic Habits talk",
        url: "https://www.youtube.com/watch?v=PZ7lDrwYdZc",
      },
    ],
  },
  {
    id: "lex",
    name: "Lex Fridman",
    role: "Podcaster · long-form mentors",
    blurb: "Deep interviews with builders, scientists, and thinkers.",
    why: "If long talks or mentors move you, Lex is a discovery surface for people.",
    tags: ["mentors", "long talks", "podcast", "curious", "stories", "people"],
    focus: ["Deep interviews", "First principles", "Human craft"],
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "Conversations that stretch thinking",
        url: "https://www.youtube.com/watch?v=GkZZMIkwElY",
      },
    ],
  },
  {
    id: "yuki",
    name: "Yukio Mishima (visual essays)",
    role: "Art · discipline aesthetics",
    blurb: "Artists who fuse body, craft, and intensity — for creative paths.",
    why: "When Creative / Creatively Stuck shows up, art mentors expand identity beyond hustle.",
    tags: ["art", "creative", "creatively stuck", "visual", "music"],
    focus: ["Craft", "Intensity", "Aesthetic discipline"],
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=400&q=80",
    links: [
      {
        label: "Visual essay / documentary entry",
        url: "https://www.youtube.com/watch?v=5Q8pVd5oRxE",
      },
    ],
  },
];

export function inferInterestTokens(input: {
  me?: string[];
  iam?: string[];
  method?: string | null;
  answers?: Record<string, string> | null;
  vibe?: string | null;
  motivation?: string | null;
  learningStyles?: string[];
}): string[] {
  const answers = input.answers ?? {};
  const raw = [
    ...(input.me ?? []),
    ...(input.iam ?? []),
    input.method ?? "",
    input.vibe ?? "",
    input.motivation ?? "",
    ...(input.learningStyles ?? []),
    ...Object.values(answers),
  ]
    .join(" ")
    .toLowerCase();

  const tokens = new Set<string>();
  const add = (t: string) => tokens.add(t);

  // Explicit onboarding interest (e.g. "Entrepreneurs")
  const interest = String(answers.interests ?? "").toLowerCase();
  if (interest.includes("entrepren")) {
    add("entrepreneur");
    add("startup");
    add("founder");
    add("business");
  }
  if (interest.includes("artist")) {
    add("art");
    add("creative");
  }
  if (interest.includes("athlete")) add("productivity");
  if (interest.includes("scientist")) {
    add("curious");
    add("frameworks");
  }
  if (interest.includes("writer")) {
    add("stories");
    add("reading");
  }
  if (interest.includes("coach")) {
    add("mentors");
    add("habits");
  }

  if (/entrepren|startup|founder|business|builder/.test(raw)) {
    add("entrepreneur");
    add("startup");
    add("founder");
    add("business");
  }
  if (/mentor/.test(raw)) add("mentors");
  if (/framework/.test(raw)) add("frameworks");
  if (/story|stories/.test(raw)) add("stories");
  if (/short video|short-form|visual/.test(raw)) {
    add("short videos");
    add("visual");
  }
  if (/long talk|podcast|auditory/.test(raw)) {
    add("long talks");
    add("podcast");
  }
  if (/music/.test(raw)) add("music");
  if (/habit/.test(raw)) add("habits");
  if (/art|creative/.test(raw)) {
    add("art");
    add("creative");
  }
  if (/timebox/.test(raw)) add("timeboxing");
  if (/procrastin|scatter|overwhelm/.test(raw)) add("productivity");

  for (const label of [...(input.me ?? []), ...(input.iam ?? [])]) {
    add(label.toLowerCase());
  }
  if (input.method) add(input.method.toLowerCase());

  // Default: if nothing matched strongly, still surface mentors/entrepreneurs lightly
  if (tokens.size < 2) {
    add("mentors");
    add("curious");
  }

  return [...tokens];
}

export function recommendArtists(
  tokens: string[],
  limit = 8,
): Array<ArtistPersona & { score: number; matched: string[] }> {
  const set = new Set(tokens.map((t) => t.toLowerCase()));
  return ARTIST_CATALOG.map((a) => {
    const matched = a.tags.filter((t) => set.has(t.toLowerCase()));
    const score = matched.length;
    return { ...a, score, matched };
  })
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
