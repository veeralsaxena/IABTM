import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { InAppPlayback } from "@/lib/media/youtube";
import type { MediaItem } from "@/types";

export type CatalogRecord = MediaItem & {
  ingestedAt: string;
  playback: InAppPlayback;
};

type CatalogFile = { items: CatalogRecord[] };

const FILE = path.join(process.cwd(), "data", "ingested-catalog.json");

function empty(): CatalogFile {
  return { items: [] };
}

export function readCatalog(): CatalogRecord[] {
  try {
    const raw = readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as CatalogFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function writeCatalog(items: CatalogRecord[]) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const body: CatalogFile = { items };
  writeFileSync(FILE, JSON.stringify(body, null, 2));
}

export function upsertCatalog(incoming: CatalogRecord[]): CatalogRecord[] {
  const byId = new Map(readCatalog().map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  const items = [...byId.values()];
  writeCatalog(items);
  return items;
}

export function findCatalogItem(id: string): CatalogRecord | undefined {
  return readCatalog().find((item) => item.id === id);
}

export function catalogPath() {
  return FILE;
}
