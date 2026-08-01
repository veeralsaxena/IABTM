import Groq from "groq-sdk";

/** Best available quality model on this Groq account */
export const GROQ_MODEL = "openai/gpt-oss-120b";

let client: Groq | null = null;

function getGroq() {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export async function groqJson<T>(
  system: string,
  user: string,
  model = GROQ_MODEL,
): Promise<T> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}

export async function groqText(
  system: string,
  user: string,
  model = GROQ_MODEL,
): Promise<string> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model,
    temperature: 0.45,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}
