import fs from "node:fs";

const file = new URL("./server.js", import.meta.url);
let s = fs.readFileSync(file, "utf8");

s = s.replace('rows.slice(0, 100)', 'rows.slice(0, 600)');
s = s.replace(
`    shares: Number.isFinite(Number(x.shares)) ? Number(x.shares) : null,\n    specs: clean(x.specs, 140),`,
`    shares: Number.isFinite(Number(x.shares)) ? Number(x.shares) : null,\n    views: Number.isFinite(Number(x.views)) ? Number(x.views) : null,\n    consults: Number.isFinite(Number(x.consults)) ? Number(x.consults) : null,\n    seller: clean(x.seller, 120),\n    location: clean(x.location, 120),\n    imageCount: Number.isFinite(Number(x.imageCount)) ? Number(x.imageCount) : null,\n    imageType: clean(x.imageType, 80),\n    status: clean(x.status, 80),\n    productId: clean(x.productId, 180),\n    sourceKeyword: clean(x.sourceKeyword, 120),\n    keywordHits: Array.isArray(x.keywordHits) ? x.keywordHits.map(v => clean(v, 80)).filter(Boolean).slice(0, 20) : [],\n    sampleTier: clean(x.sampleTier, 20),\n    specs: clean(x.specs, 140),`
);
s = s.replace('version: "4.1.0", mode: "safe-local-browser-bridge"', 'version: "6.1.0", mode: "rolling-database-500-sample"');
s = s.replace(
`const safe = JSON.stringify({ source, site, capturedAt: new Date().toISOString(), items }).replace(/</g, "\\\\u003c");`,
`const safe = JSON.stringify({ source, site, capturedAt: new Date().toISOString(), rawCount: Number(payload.rawCount) || rows.length, keyword: clean(payload.keyword || "", 120), items }).replace(/</g, "\\\\u003c");`
);
s = s.replace("location.replace('/?imported=1&v=41')", "location.replace('/?imported=1&v=61&t='+Date.now())");
s = s.replace('console.log(`V4.1 running on :${PORT}`)', 'console.log(`V6.1 running on :${PORT}`)');

fs.writeFileSync(file, s);
console.log("V6.1 server normalization patch applied");
