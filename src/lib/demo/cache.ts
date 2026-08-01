import { promises as fs } from "fs";
import path from "path";

/** Committed + runtime-updated last successful judge demo payload. */
export const DEMO_CACHE_PATH = path.join(
  process.cwd(),
  "data",
  "demo-last-success.json",
);

export type DemoCacheEnvelope = {
  savedAt: string;
  source: "live" | "seed";
  latencyMs?: number;
  payload: Record<string, unknown>;
};

export async function readDemoCache(): Promise<DemoCacheEnvelope | null> {
  try {
    const raw = await fs.readFile(DEMO_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as DemoCacheEnvelope;
    if (!parsed?.payload || typeof parsed.payload !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeDemoCache(
  payload: Record<string, unknown>,
  meta?: { latencyMs?: number },
): Promise<void> {
  const envelope: DemoCacheEnvelope = {
    savedAt: new Date().toISOString(),
    source: "live",
    latencyMs: meta?.latencyMs,
    payload,
  };
  await fs.mkdir(path.dirname(DEMO_CACHE_PATH), { recursive: true });
  await fs.writeFile(DEMO_CACHE_PATH, JSON.stringify(envelope, null, 2), "utf8");
}
