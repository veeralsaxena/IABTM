# CURATE

Agentic media curator for [I Am Better Than Me](https://iambetterthanme.com/) — built for Hack Better Than Me.

Most feeds optimize for attention. This one picks what helps someone become who they said they want to be.

## What it does

1. You pick **Me** attributes and **I Am** attributes (same idea as IABTM onboarding).
2. We choose a growth **method** (e.g. Timeboxing).
3. Every day, an agent loop retrieves + scores media from a pgvector catalog and explains **why this, today**.

Not a chatbot wrapped around a list. Retrieval and ranking are separate from the LLM; the model mostly explains and reflects.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Open http://localhost:3000

You’ll need:

- Supabase project URL + anon/publishable key
- `GEMINI_API_KEY` (embeddings)
- `GROQ_API_KEY` (explanations / check-ins)

In Supabase → Authentication → Providers → Email, turn off **Confirm email** for local demos.

## Useful routes

| Path | What |
|------|------|
| `/` | Landing |
| `/login` | Sign up / sign in |
| `/onboarding` | Me → I Am → method |
| `/home` | Today’s briefing |
| `/media` | Full catalog |
| `/architecture` | How the system works (for judges) |

## Stack

Next.js · Supabase Auth + Postgres + pgvector · Gemini embeddings · Groq

## Notes

- Don’t commit `.env.local`.
- `npm run seed` re-embeds the demo catalog if you rebuild the DB (needs Gemini). Prefer leaving the seeded Supabase project as-is during the hackathon.
- Deploy later to any Node host; set the same env vars and add your domain to Supabase Auth redirect URLs.
