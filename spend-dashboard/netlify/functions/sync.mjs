import { getStore } from "@netlify/blobs";

const STORE_NAME = "spend-dashboard-sync";
const REGION = "ap-southeast-1";
const SPACE_RE = /^[a-f0-9]{64}$/i;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,PUT,OPTIONS"
  }
});

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const url = new URL(req.url);
  const pathSpace = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
  const space = String(url.searchParams.get("space") || (SPACE_RE.test(pathSpace) ? pathSpace : ""));
  if (!SPACE_RE.test(space)) return json({ error: "invalid space" }, 400);

  const store = getStore({
    name: STORE_NAME,
    region: REGION,
    consistency: "strong"
  });
  const key = `ledger/${space}`;

  if (req.method === "GET") {
    const entry = await store.getWithMetadata(key, {
      consistency: "strong",
      type: "json"
    });
    if (!entry || entry.data === null) return json({ error: "not found" }, 404);
    return json({
      blob: entry.data.blob,
      updatedAt: entry.data.updatedAt || null,
      revision: entry.data.revision || 1,
      etag: entry.etag
    });
  }

  if (req.method !== "PUT") return json({ error: "method not allowed" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const blob = body?.blob;
  const baseEtag = body?.etag || null;
  if (typeof blob !== "string" || blob.length < 16 || blob.length > 11_000_000) {
    return json({ error: "invalid blob" }, 400);
  }

  const current = await store.getWithMetadata(key, {
    consistency: "strong",
    type: "json"
  });

  if (!current) {
    const value = { blob, updatedAt: new Date().toISOString(), revision: 1 };
    const result = await store.setJSON(key, value, { onlyIfNew: true });
    if (!result.modified) {
      const latest = await store.getWithMetadata(key, { consistency: "strong", type: "json" });
      return json({
        error: "conflict",
        blob: latest?.data?.blob || null,
        updatedAt: latest?.data?.updatedAt || null,
        revision: latest?.data?.revision || 1,
        etag: latest?.etag || null
      }, 409);
    }
    return json({ ok: true, updatedAt: value.updatedAt, revision: 1, etag: result.etag });
  }

  if (!baseEtag || baseEtag !== current.etag) {
    return json({
      error: "conflict",
      blob: current.data?.blob || null,
      updatedAt: current.data?.updatedAt || null,
      revision: current.data?.revision || 1,
      etag: current.etag
    }, 409);
  }

  const revision = Number(current.data?.revision || 1) + 1;
  const value = { blob, updatedAt: new Date().toISOString(), revision };
  const result = await store.setJSON(key, value, { onlyIfMatch: current.etag });
  if (!result.modified) {
    const latest = await store.getWithMetadata(key, { consistency: "strong", type: "json" });
    return json({
      error: "conflict",
      blob: latest?.data?.blob || null,
      updatedAt: latest?.data?.updatedAt || null,
      revision: latest?.data?.revision || revision,
      etag: latest?.etag || null
    }, 409);
  }
  return json({ ok: true, updatedAt: value.updatedAt, revision, etag: result.etag });
};
