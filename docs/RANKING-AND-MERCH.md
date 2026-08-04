# Vector · Ranking & Merch Matching

How personalization actually works in this project — media reranker scores, style axes for apparel, and what is (and isn’t) industry-standard.

---

## 1. Style axes for merch — the “procrastination” confusion

### What “friction” was (badly named)

The rule was **not** saying *procrastination = friction* as synonyms.

It meant:

> If the user’s **Me** label looks like a **struggle** word (procrastinating, anxious, overwhelmed…), recommend **calmer** clothes — not loud hype tees.

We renamed the rule id to `me-struggle-calm` so that reads clearly.

### How a rule actually fires

1. Build one lowercase string (the **blob**):

   ```
   "procrastinating action-oriented timeboxing"
   ```

2. Walk a **fixed list of rules** in order. Each rule has:
   - a **regex** (keyword detector)
   - an action: **`set`**, **`min`**, or **`max`** on one or more axes

3. If the regex matches the blob → apply the action.

### What `set` / `min` / `max` mean

| Action | Meaning | Example |
|--------|---------|---------|
| `set` | Overwrite that axis to a number | `set energy = 0.3` |
| `min` | Raise the axis if it’s below (floor) | `min visibility = 0.7` |
| `max` | Lower the axis if it’s above (ceiling) | `max energy = 0.35` |

The number **0.3** is not computed from AI. It is a **hand-chosen constant** in the rule table: “struggle Me → soft energy.” Same for every user who hits that rule. Deterministic.

### Worked example

**Path:** Me = Procrastinating · I Am = Action-oriented · Method = Timeboxing · Day = 1

| Step | What happens | energy | visibility | discipline | body | creativity |
|------|----------------|--------|------------|------------|------|------------|
| Start | Neutral | 0.50 | 0.50 | 0.50 | 0.50 | 0.50 |
| Rule `me-struggle-calm` | blob has `procrast` → **set** energy=0.3, visibility=0.35 | **0.30** | **0.35** | 0.50 | 0.50 | 0.50 |
| Rule `structure` | blob has `action` → **set** discipline=0.75 | 0.30 | 0.35 | **0.75** | 0.50 | 0.50 |
| Rule `visible` | blob has `action-oriented` → **min** visibility=0.7 | 0.30 | **0.70** | 0.75 | 0.50 | 0.50 |
| Rule `method-discipline` | method has `timebox` → **min** discipline=0.7 | 0.30 | 0.70 | 0.75 | 0.50 | 0.50 |
| **Stage clamp (early)** | Day 1 → cap loud merch: visibility≤0.45, energy≤0.45 | **0.30** | **0.45** | 0.75 | 0.50 | 0.50 |

**Stage clamp** = after rules, journey stage forces a ceiling/floor so early-path users don’t get statement pieces first.

### How we know “this tee is calm / that tee is statement”

**We labeled them.** Shopify does not send style axes. In `src/lib/shop/catalog.ts` every SKU has a frozen vector, e.g.:

```ts
// classic-script-tee — calm entry
{ energy: 0.25, visibility: 0.35, discipline: 0.5, body: 0.3, creativity: 0.35 }

// magazine-tee — loud statement
{ energy: 0.55, visibility: 0.85, discipline: 0.4, body: 0.3, creativity: 0.9 }
```

Matching:

```
styleFit = 1 − mean(|userAxis − productAxis|)   // over 5 axes
final    = 0.70 × styleFit + 0.30 × stageFit
```

Closest vector wins.

### Is 5-axis matching the holy grail?

**No single holy grail.** For a small explainable catalog, **structured attributes (what we do)** is the industry default (Stitch Fix–style content filtering).

| Approach | When it wins | When it loses |
|----------|--------------|---------------|
| **Attribute vectors (us)** | Small catalog, need explainability, partners/POD | Misses subtle taste without purchase data |
| **Embeddings (image/text)** | Huge catalogs, visual similarity | Hard to explain; overkill for ~15 SKUs |
| **Collaborative filtering** | Lots of purchase history | Cold start — we don’t have it yet |
| **Neural graphs** | Multi-hop “bought X also Y” at scale | Over-engineered here |

**Practical holy grail for IABTM:** attribute vectors **now** + purchase/click feedback **later** to nudge product vectors. Embeddings stay for **media**, not merch.

---

## 2. Media hybrid reranker (Home score lens)

After live web discovery, every candidate gets scores. The Home **Identity vector** panel shows the primary pick’s breakdown.

### Scores you see on Home

| UI label | Code field | What it means | How it’s calculated |
|----------|------------|---------------|---------------------|
| **Identity fit** | `identityFit` | Does this media match Me → I Am (and method)? | If Gemini embeddings exist: `0.75 × vectorFit + 0.25 × lexicalOverlap`. Else: lexical only (word overlap of title/description with Me / I Am / method). |
| **Stage fit** | `stageFit` *(stored as durationFit)* | Is length right for journey / returner? | Early or returning after ≥2 days: prefer ≤12 min. Middle/late: prefer 5–25 min. Long videos penalized for returners. |
| **Potential** | `potential` | Growth-oriented blend (not raw clicks) | `0.5×identityFit + 0.2×semanticProxy + 0.15×durationFit + 0.15×feedbackFit` |
| **Novelty** | `novelty` | Haven’t seen / blocked this before? | `1` if new, `0.15` if already seen or hard-blocked |
| **Anti-clickbait** | `antiAttention` | Penalize hype titles | `0.9` if clean, `0.25` if clickbait regex hits (“shocking”, “overnight”, …) |
| **Final rank** | `final` | What sorts the list | Weighted sum of all signals (weights shift slightly if vectors are present) |

### Final formula (when embeddings are available)

```
final =
  0.30 × identityFit +
  0.16 × semanticProxy +
  0.12 × methodFit +
  0.10 × durationFit +
  0.08 × styleFit (learning styles) +
  0.08 × novelty +
  0.08 × antiAttention +
  0.08 × feedbackFit
```

Without embeddings, identity/semantic weights drop a bit and lexical carries more.

### Supporting signals (not always shown as bars)

| Signal | Role |
|--------|------|
| **vectorFit** | Cosine(identity embedding, media embedding) mapped to 0–1 |
| **lexicalIdentity** | Token overlap with Me / I Am / method |
| **semanticProxy** | Blend of vector + overlap with the full identity query text |
| **methodFit** | Method words appear in title/description? |
| **feedbackFit** | Boost if similar to liked titles; punish if similar to disliked |
| **Type diversification** | After sort, prefer variety of media types in the shortlist |

### Pipeline position

```
Identity query (+ soft feedback)
        ↓
Groq plans search queries
        ↓
Live web discovery (YouTube / web / …)
        ↓
Critic agent (optional 1 retry)
        ↓
Embed shortlist ↔ identity  →  vectorFit
        ↓
Hybrid reranker  →  scores above
        ↓
Diversify types  →  primary + secondary on Home
```

Activities on the right rail are **separate** (planner + DB tags) — they do **not** use this embedding reranker.

---

## 3. Merch matching (Becoming Drop)

```
Path → rule table → user StyleVector (5 axes)
Each SKU → frozen StyleVector in catalog.ts
styleFit + stageFit → ranked IABTM shop
```

Plus:

- **Activity link** → occasion filter (`discipline`, `movement`, …)
- **Path Edition** → aspirational I Am quotes only (never Me struggle on a tee)
- **Path Diary** → private Me → I Am hardcover
- **Checkpoint Drops** → unlock SKUs at day 11 / 37 / 74 / 111
- **Demand Radar** → aggregate cohort styles for IABTM restock

---

## 4. Personalization map (whole product)

| Surface | Personalized by |
|---------|-----------------|
| Daily media | Identity embed + hybrid rerank + likes/dislikes + returner |
| Activities | Groq plan + method/Me/I Am tagged library |
| Chat | RAG over path, briefing, feedback, memories |
| Shop catalog | 5-axis styleFit + stage |
| Activity → shop | Occasion from activity text |
| Path Edition | Style → garment/color; curated I Am quotes |
| Path Diary | Name, arc, method prompts |
| Checkpoints | Day number unlocks |
| Demand Radar | Cohort of paths (live ± demo) |

---

## 5. Judge one-liners

**Reranker:**  
*“Not a black-box feed — identityFit, duration/stage, novelty, anti-clickbait, and feedback are weighted into final; embeddings when available, lexical always.”*

**Merch:**  
*“We don’t invent tags from Shopify. We assign five deterministic axes; same path → same user vector; closest product vector ranks first. Industry-standard content-based filtering — not a neural graph.”*

**Struggle rule:**  
*“If Me contains words like procrastinating, we set energy/visibility low so apparel stays calm. The constant 0.3 is a curated rule, not an LLM guess.”*

---

## Code map

| Topic | File |
|-------|------|
| Merch rule table | `src/lib/shop/style-profile.ts` |
| Axis math / styleFit | `src/lib/shop/styles.ts` |
| Product vectors | `src/lib/shop/catalog.ts` |
| Shop scoring | `src/lib/shop/personalize.ts` |
| Media reranker | `src/lib/curator/rerank.ts` |
| Pipeline wiring | `src/lib/curator/pipeline.ts` |
| Home score UI | `src/components/IdentityVectorMap.tsx` |
