const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");

  const res = await fetch(
    `${GEMINI_BASE}/gemini-embedding-001:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: text.slice(0, 8000) }] },
        outputDimensionality: 768,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embedding failed: ${err}`);
  }

  const data = await res.json();
  const values: number[] = data.embedding?.values;
  if (!values?.length) throw new Error("Empty embedding from Gemini");
  return values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const text of texts) {
    out.push(await embedText(text));
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
