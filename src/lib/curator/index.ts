export { searchForIdentity, ingestForIdentity, ingestUrl } from "./ingest";
export { curateRecommendations } from "./recommend";
export { readCatalog } from "./catalog-store";

/**
 * Local curator. No login, no Supabase.
 *
 *   POST /api/ingest/search   { me, iam }              find, don't save
 *   POST /api/ingest          { me, iam }              search and save
 *   POST /api/ingest          { url, me, iam }         save one link
 *   GET  /api/catalog                                      what's saved
 *   GET  /api/media/:id                                    player for one item
 *   POST /api/curator         { me, iam }              what to show this person
 *
 * ingest.ts         live search and save
 * catalog-store.ts  data/ingested-catalog.json
 * recommend.ts      serve a saved video only on a similar path
 * rerank.ts         score
 */
export { curatorRoutes } from "./routes";
