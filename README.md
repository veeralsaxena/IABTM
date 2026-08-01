# CURATE

Daily media for who you're becoming — discovered live from the web, ranked for potential (not attention).

## Run

```bash
npm install
cp .env.example .env.local   # fill keys
npm run dev
```

Open http://localhost:3000

## Env

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or anon key)
- `GEMINI_API_KEY` — identity embeddings
- `GROQ_API_KEY` — query planner + explainer (`openai/gpt-oss-120b`)

Turn off Supabase email confirmation for local demos.

## Flow

1. Sign up
2. Profile photo + name (skipped when adding another path)
3. Me / I Am attributes (+ optional questions)
4. Method assigned → path saved
5. **Today**: web discovery → rerank → embedded video + multi activities
6. **Discover**: live search per media type (film, podcast, people…)
7. **Your paths**: switch or create multiple journeys

## How curation works

1. Build an identity query from Me / I Am / method / stage / check-in
2. Groq plans search queries + outdoor/indoor activities
3. Discover candidates via **YouTube search** + **DuckDuckGo**
4. **Self-built reranker** scores identity fit, duration, novelty, anti-clickbait
5. Diversify formats · Groq writes “why now”
6. Feedback (resonated / not for me / completed) shapes later runs

## Stack

Next.js · Supabase Auth/DB/Storage · Gemini embeddings · Groq · live web/YouTube discovery · custom potential reranker · native YouTube embeds

## UI decisions (for judges)

| Decision | Spec | Why |
|---|---|---|
| Collapsible left nav | 240px → 64px rail | SaaS standard; more room for the primary pick on laptops |
| Collapsible right panel | 280px → hide | Activities are secondary; video/reading is primary |
| Top notification bell | Sticky header, top-right | F-pattern status without cluttering the briefing |
| Main column `max-w-5xl` | Fluid center | Prevents ultra-wide line lengths; keeps hierarchy calm |
| Music via Spotify/YouTube embeds | Official iframes | Free in-app playback; ranking stays identity→web→rerank |

Collapse state persists in `localStorage`.
