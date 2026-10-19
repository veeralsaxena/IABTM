export const curatorRoutes = [
  { method: "POST", path: "/api/ingest/search", file: "src/app/api/ingest/search/route.ts" },
  { method: "POST", path: "/api/ingest", file: "src/app/api/ingest/route.ts" },
  { method: "GET", path: "/api/catalog", file: "src/app/api/catalog/route.ts" },
  { method: "GET", path: "/api/media/:id", file: "src/app/api/media/[id]/route.ts" },
  { method: "POST", path: "/api/curator", file: "src/app/api/curator/route.ts" },
] as const;
