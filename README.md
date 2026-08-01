# CURATE

Daily media for who you're becoming — ranked for potential, not attention.

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
- `GEMINI_API_KEY` — embeddings
- `GROQ_API_KEY` — language agents (`openai/gpt-oss-120b`)

Turn off Supabase email confirmation for local demos.

## Flow

1. Sign up
2. Profile photo + name
3. Me / I Am attributes (+ optional questions, skippable)
4. Method assigned
5. Home: path bar, embedded video briefing, status panel, activities
6. Curated Media: filters + inline YouTube player

## Stack

Next.js · Supabase Auth/DB/Storage · pgvector · Gemini embeddings · Groq

Ranking is deterministic (identity / stage / novelty / anti-attention). The LLM explains — it doesn't invent the catalog.
