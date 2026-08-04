# Vector — CEO briefing (Slidev)

Executive deck for **I Am Better Than Me** leadership. Framed as an extension of the Me → I Am model, not a critique of the existing platform.

## Run locally

```bash
cd slides
npm install
npm run dev
```

Opens at http://localhost:3030

From repo root: `npm run slides`

## Export

```bash
# PDF
npm run export

# PowerPoint
npx slidev export --format pptx --output ../docs/Vector-CEO-Briefing.pptx
```

Latest PPTX: `docs/Vector-CEO-Briefing.pptx`

## Deck outline (~22 slides)

1. Title + agenda  
2. Built on IABTM (Me / I Am / Method)  
3. Opportunity as an extension layer  
4. What Vector is + surfaces shipped  
5. Journey, onboarding, Today, Discover  
6. Architecture + full pipeline  
7. Identity block, hybrid rerank, hard vs soft feedback  
8. Data model, stack, live demo script  
9. How it extends the company + next steps  
10. CEO summary + close  

Edit `slides.md` and re-export when content changes.
