import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: false, limit: "3mb" }));
app.use(express.static("public", { etag: false, maxAge: 0 }));

function clean(v, max = 1200) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isPublicHttpUrl(raw) {
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol) && !["localhost", "127.0.0.1"].includes(u.hostname);
  } catch {
    return false;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

app.get("/api/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, version: "3.9.0", mode: "multi-site-local-collector" });
});

app.post("/import", (req, res) => {
  try {
    const raw = typeof req.body?.data === "string" ? req.body.data : "";
    const payload = JSON.parse(raw || "{}");
    const source = clean(payload.source, 2200);
    if (!isPublicHttpUrl(source)) throw new Error("来源网址无效");

    const platform = clean(payload.platform || new URL(source).hostname, 80);
    const rows = Array.isArray(payload.items) ? payload.items : [];
    const items = rows.slice(0, 150).map((x, i) => ({
      rank: Number(x.rank) || i + 1,
      platform: clean(x.platform || platform, 80),
      title: clean(x.title, 260),
      text: clean(x.text, 1600),
      url: isPublicHttpUrl(x.url) ? clean(x.url, 2200) : source,
      image: isPublicHttpUrl(x.image) ? clean(x.image, 2200) : "",
      price: num(x.price),
      wants: num(x.wants ?? x.favs),
      likes: num(x.likes),
      favs: num(x.favs),
      comments: num(x.comments),
      views: num(x.views),
      specs: clean(x.specs, 160),
      ageText: clean(x.ageText, 100),
      author: clean(x.author, 100),
      location: clean(x.location, 100)
    })).filter(x => x.title);

    if (!items.length) throw new Error("没有收到可分析内容");

    const safe = JSON.stringify({
      source,
      platform,
      pageTitle: clean(payload.pageTitle, 220),
      capturedAt: new Date().toISOString(),
      items
    }).replace(/</g, "\\u003c");

    res.type("html").send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>正在导入</title></head><body><script>localStorage.setItem('floorV39Import',JSON.stringify(${safe}));location.replace('/?imported=1&v=39&t='+Date.now());<\/script></body></html>`);
  } catch (err) {
    res.status(400).type("html").send(`<!doctype html><meta charset="utf-8"><body style="font-family:-apple-system;padding:30px"><h2>导入失败</h2><p>${clean(err?.message || "未知错误", 300)}</p><p>请回到目标网站，等内容卡片显示后重新点击“网页抓取”。</p></body>`);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`V3.9 running on :${PORT}`);
});
