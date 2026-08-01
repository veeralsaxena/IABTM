# Vector
<img width="1178" height="788" alt="image" src="https://github.com/user-attachments/assets/feef3fb9-8b64-4a81-bd67-ca9659d8a970" />


Daily media for who you're becoming. Discovered live from the web, ranked for potential instead of attention.

Vector is an agentic media curator. You describe who you are now and who you want to become, pick a method for getting there, and each day the system finds film, podcasts, people, writing, music, and practice activities that fit that path. Ranking optimizes for identity fit and growth, not engagement.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key |
| `GEMINI_API_KEY` | Identity and media embeddings (768-d) |
| `GROQ_API_KEY` | Query planner and explainer (`openai/gpt-oss-120b`) |

Optional: `SUPABASE_SERVICE_ROLE_KEY` for CLI seeding (`npm run seed`).

For local demos, turn off Supabase email confirmation so signup is instant.

---

## What the product does

1. **Sign up** with Supabase Auth.
2. **Onboard**: profile photo and name, then Me / I Am attributes (plus optional questions and learning styles).
3. A **method** is assigned and saved as a path (you can run multiple paths).
4. **Today**: live web discovery, hybrid rerank, one primary pick with embed, alternatives, and practice activities.
5. **Discover**: on-demand search by media type (film, podcast, people, editorial, music, animation).
6. **Feedback** (resonated / not for me / completed) reshapes later runs.

The UI is a three-column shell: left nav, main briefing, right activity panel. Both sidebars collapse and are drag-resizable; widths and collapse state persist in `localStorage`.

---

## System architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Next.js    │────▶│  API routes      │────▶│  Curator pipeline       │
│  App Router │     │  /api/curate     │     │  identity → plan →      │
│  (UI shell) │     │  /api/discover   │     │  discover → rerank →    │
└──────┬──────┘     │  /api/onboard    │     │  explain → persist      │
       │            │  /api/interact   │     └───────────┬─────────────┘
       │            └────────┬─────────┘                 │
       │                     │                           │
       ▼                     ▼                           ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Supabase   │     │  Groq            │     │  Live discovery         │
│  Auth, DB,  │     │  query planner  │     │  YouTube search         │
│  Storage,   │     │  + explainer     │     │  + DuckDuckGo           │
│  pgvector   │     └──────────────────┘     └─────────────────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Gemini     │
│  embeddings │
└─────────────┘
```

### Layers

| Layer | Role |
|---|---|
| **Presentation** | Next.js 16 App Router, React 19, Tailwind. `DashboardShell` owns nav, header notifications, and the activity panel. |
| **API** | Route handlers under `src/app/api/*` for curate, discover, onboard, check-in, interact, paths, settings. |
| **Curator** | `src/lib/curator/*` - identity query, Groq planning, web discovery, hybrid rerank, briefing explain. |
| **AI** | Gemini for embeddings; Groq for structured JSON (search queries, activities, why-now copy). |
| **Data** | Supabase Auth, Postgres (paths, interactions, check-ins, activities, embeddings), Storage for avatars. |

---

## Curation pipeline (system design)

The daily briefing is not an LLM picking a YouTube link. Discovery and ranking are separate steps; the model plans and explains, while a deterministic reranker chooses the winner.

```
Me / I Am / method / stage / check-in / behavior signals
        │
        ▼
┌───────────────────┐
│ 1. Identity block │  Concatenate "who I am / who I'm becoming / how I get there"
│                   │  Embed with Gemini (768-d). Store on the path for pgvector.
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 2. Query planner  │  Groq writes per-type search queries and outdoor /
│    (Groq)         │  indoor / social activity ideas.
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 3. Web discovery  │  Live YouTube (+ DuckDuckGo when reachable).
│                   │  Candidates become MediaItems; Discover tabs are
│                   │  session-cached.
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 4. Hybrid rerank  │  Cosine(identity, media embedding) when available,
│    (custom)       │  plus lexical method/attribute fit, duration,
│                   │  novelty, anti-clickbait. Diversify media types.
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ 5. Explain + act │  Groq writes why-now. User marks activities done
│                   │  and resonates / rejects; that feeds the next run.
└───────────────────┘
```

### Why hybrid, not lexical-only or pgvector-only

Lexical overlap alone misses synonyms ("procrastinating" vs "putting things off"). Pure vector search alone assumes a pre-indexed catalog; live web results are not in Postgres until we embed them. The production pattern here is: keep the identity vector in Supabase pgvector, discover from the web, embed the shortlist, score with cosine plus rules. The LLM never picks the winner.

### Agent memory (adaptation)

- Completed activities and resonance / rejection signals reshape the next identity query.
- Attribute changes rebuild the method and invalidate today's cached briefing.
- Seen media IDs reduce repeats (novelty signal in the reranker).

---

## Data model (high level)

Defined in `schema.sql` and used through Supabase:

- **profiles** - display name, onboarding flag, avatar via Storage
- **paths** - active journey: Me / I Am labels, method, day number, identity embedding
- **interactions** - viewed, completed, resonated, not_for_me, saved
- **check_ins** - free-text and activity completions
- **activities** - practice bank merged with planner-generated ideas
- **curated_media / embeddings** - pgvector-ready identity and content vectors (768-d, HNSW)

Auth is email/password via Supabase; session cookies go through `@supabase/ssr`.

---

## Key routes and modules

| Path / module | Responsibility |
|---|---|
| `/home` | Today's briefing (primary embed + alternatives) |
| `/media` | Discover by type |
| `/paths` | Switch or create journeys |
| `/onboarding` | Identity intake and method assignment |
| `/architecture` | In-app system design page |
| `src/lib/curator/pipeline.ts` | End-to-end daily curate orchestration |
| `src/lib/curator/query-planner.ts` | Groq search + activity planning |
| `src/lib/curator/web-search.ts` | YouTube / web discovery |
| `src/lib/curator/rerank.ts` | Hybrid scoring and type diversification |
| `src/lib/ai/embeddings.ts` | Gemini embeddings |
| `src/lib/ai/groq.ts` | Groq JSON helpers |

---

## Stack

- **App**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion
- **Backend**: Next.js Route Handlers
- **Auth / DB / Storage**: Supabase (Auth, Postgres, pgvector, Storage)
- **AI**: Gemini embeddings, Groq (`openai/gpt-oss-120b`)
- **Discovery**: YouTube search, DuckDuckGo, native YouTube / Spotify embeds
- **Ranking**: Custom hybrid reranker (vector + lexical + rules)

---

## UI notes

| Decision | Detail |
|---|---|
| Left nav | Default 240px, collapses to a 64px icon rail; drag the edge to resize (persisted) |
| Right panel | Default 280px, can hide entirely; drag the edge to resize (persisted) |
| Top notifications | Sticky header, top-right, so path signals stay out of the briefing |
| Main column | Fluid `flex-1` with `max-w-5xl` so wide screens don't stretch line length |
| Playback | Official YouTube / Spotify iframes; ranking stays identity → web → rerank |

Collapse and width state live in `localStorage` (`curate_left_collapsed`, `curate_right_collapsed`, `curate_left_width`, `curate_right_width`).

---

## Project layout

```
src/
  app/           # pages + API routes
  components/    # DashboardShell, MediaPlayer, notifications
  lib/
    curator/     # pipeline, planner, discovery, rerank, identity
    ai/          # Gemini + Groq clients
    supabase/    # browser / server / proxy clients
    media/       # YouTube / audio helpers
  types/         # shared TypeScript types
schema.sql       # Postgres + pgvector schema
scripts/         # seed utilities
```

---

## Demo flow for judges

1. Create an account and complete onboarding with a clear Me → I Am contrast.
2. Open **Today** and wait for discovery + rerank (or hit Recurate).
3. Watch the primary embed; skim why-now and alternatives.
4. Mark an activity done or tap resonated / not for me.
5. Open **Discover** and flip media types (results are session-cached).
6. Check **How it works** (`/architecture`) for the same pipeline story in-product.
7. Drag the left and right panel edges to show the resizable shell.
