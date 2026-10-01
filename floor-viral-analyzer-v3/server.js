import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: false, limit: "3mb" }));
app.use(express.static("public", { etag: false, maxAge: 0, setHeaders(res){ res.setHeader("Cache-Control","no-store, no-cache, must-revalidate"); } }));

function clean(v, max = 1000) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function isGoofishUrl(raw) {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    return h === "goofish.com" || h.endsWith(".goofish.com");
  } catch { return false; }
}

app.get("/api/health", (req, res) => {
  res.setHeader("Cache-Control","no-store");
  res.json({ ok: true, version: "3.8.0", mode: "local-browser-card-collector" });
});

app.post("/import", (req, res) => {
  try {
    const raw = typeof req.body?.data === "string" ? req.body.data : "";
    const payload = JSON.parse(raw || "{}");
    const source = clean(payload.source, 2000);
    if (!isGoofishUrl(source)) throw new Error("来源不是闲鱼页面");

    const rows = Array.isArray(payload.items) ? payload.items : [];
    const items = rows.slice(0, 120).map((x, i) => ({
      rank: Number(x.rank) || i + 1,
      title: clean(x.title, 240),
      text: clean(x.text, 1400),
      url: isGoofishUrl(x.url) ? clean(x.url, 2000) : source,
      image: clean(x.image, 2000),
      price: Number.isFinite(Number(x.price)) ? Number(x.price) : null,
      favs: Number.isFinite(Number(x.favs)) ? Number(x.favs) : null,
      specs: clean(x.specs, 140),
      location: clean(x.location, 80),
      ageText: clean(x.ageText, 80)
    })).filter(x => x.title && x.title.length >= 3);

    if (!items.length) throw new Error("没有收到商品数据");

    const safe = JSON.stringify({ source, capturedAt: new Date().toISOString(), items }).replace(/</g, "\\u003c");
    res.type("html").send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-store"><title>正在导入</title></head><body><script>localStorage.setItem('floorV38Import',JSON.stringify(${safe}));location.replace('/?imported=1&v=38&t='+Date.now());<\/script></body></html>`);
  } catch (err) {
    res.status(400).type("html").send(`<!doctype html><meta charset="utf-8"><body style="font-family:-apple-system;padding:30px"><h2>导入失败</h2><p>${clean(err?.message || "未知错误", 300)}</p><p>请回到闲鱼搜索结果页，等商品卡片出现后重新点击“闲鱼抓取”。</p></body>`);
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`V3.8 running on :${PORT}`));