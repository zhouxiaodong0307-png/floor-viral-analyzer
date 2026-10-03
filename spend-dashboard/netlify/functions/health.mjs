import { getStore } from "@netlify/blobs";

export default async () => {
  getStore({ name: "spend-dashboard-sync", region: "ap-southeast-1", consistency: "strong" });
  return Response.json({
    ok: true,
    version: "1.3.0",
    storage: "netlify-blobs",
    region: "ap-southeast-1",
    consistency: "strong"
  }, { headers: { "cache-control": "no-store" } });
};
