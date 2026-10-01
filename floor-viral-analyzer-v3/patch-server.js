import fs from "node:fs";

const file = new URL("./server.js", import.meta.url);
let s = fs.readFileSync(file, "utf8");

s = s.replace('rows.slice(0, 100)', 'rows.slice(0, 600)');

// Preserve missing numeric fields as null. Number(null) === 0 was corrupting data completeness.
s = s.replace(
`function clean(v, max = 1200) {\n  return String(v ?? "").replace(/\\s+/g, " ").trim().slice(0, max);\n}`,
`function clean(v, max = 1200) {\n  return String(v ?? "").replace(/\\s+/g, " ").trim().slice(0, max);\n}\n\nfunction nullableNumber(v) {\n  if (v === null || v === undefined || v === "") return null;\n  const n = Number(v);\n  return Number.isFinite(n) ? n : null;\n}`
);
for (const field of ['price','wants','likes','favs','comments','shares']) {
  const old = `Number.isFinite(Number(x.${field}${field==='wants'?' ?? x.favs':''})) ? Number(x.${field}${field==='wants'?' ?? x.favs':''}) : null`;
  if (field === 'wants') {
    s = s.replace(old, 'nullableNumber(x.wants ?? x.favs)');
  } else {
    s = s.replace(old, `nullableNumber(x.${field})`);
  }
}

s = s.replace(
`    shares: nullableNumber(x.shares),\n    specs: clean(x.specs, 140),`,
`    shares: nullableNumber(x.shares),\n    views: nullableNumber(x.views),\n    consults: nullableNumber(x.consults),\n    seller: clean(x.seller, 120),\n    location: clean(x.location, 120),\n    imageCount: nullableNumber(x.imageCount),\n    imageType: clean(x.imageType, 80),\n    status: clean(x.status, 80),\n    productId: clean(x.productId, 180),\n    sourceKeyword: clean(x.sourceKeyword, 120),\n    keywordHits: Array.isArray(x.keywordHits) ? x.keywordHits.map(v => clean(v, 80)).filter(Boolean).slice(0, 20) : [],\n    sampleTier: clean(x.sampleTier, 20),\n    specs: clean(x.specs, 140),`
);

s = s.replace('version: "4.1.0", mode: "safe-local-browser-bridge"', 'version: "6.2.0", mode: "validated-500-product-collector"');
s = s.replace(
`const safe = JSON.stringify({ source, site, capturedAt: new Date().toISOString(), items }).replace(/</g, "\\\\u003c");`,
`const safe = JSON.stringify({ source, site, capturedAt: new Date().toISOString(), rawCount: Number(payload.rawCount) || rows.length, keyword: clean(payload.keyword || "", 120), items }).replace(/</g, "\\\\u003c");`
);
s = s.replace("location.replace('/?imported=1&v=41')", "location.replace('/?imported=1&v=62&t='+Date.now())");
s = s.replace('console.log(`V4.1 running on :${PORT}`)', 'console.log(`V6.2 running on :${PORT}`)');

fs.writeFileSync(file, s);
console.log("V6.2 server normalization patch applied");
