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

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Multi-turn chat (non-stream) for companion / tools. */
export async function groqChat(
  messages: ChatMessage[],
  opts?: { temperature?: number; model?: string },
): Promise<string> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model: opts?.model ?? GROQ_MODEL,
    temperature: opts?.temperature ?? 0.55,
    messages,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/** Streaming chat — yields text deltas. */
export async function* groqChatStream(
  messages: ChatMessage[],
  opts?: { temperature?: number; model?: string },
): AsyncGenerator<string> {
  const groq = getGroq();
  const stream = await groq.chat.completions.create({
    model: opts?.model ?? GROQ_MODEL,
    temperature: opts?.temperature ?? 0.55,
    messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
