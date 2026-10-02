import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: false, limit: "3mb" }));
app.use(express.static("public", { etag: false, maxAge: 0, setHeaders(res){ res.setHeader("Cache-Control","no-store, no-cache, must-revalidate"); res.setHeader("Access-Control-Allow-Origin","*"); } }));

let browserPromise = null;

const BRIDGE_ZIP_BASE64 = "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";

function nullableNumber(v) { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; }

function clean(v, max = 1200) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  return !!(m && +m[1] >= 16 && +m[1] <= 31);
}

async function validatePublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("网址格式不正确"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("仅支持 http/https 网址");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) throw new Error("不支持本地地址");
  const found = await dns.lookup(host, { all: true });
  if (found.some(x => isPrivateIp(x.address))) throw new Error("不支持内网地址");
  return u.toString();
}

function siteFromUrl(raw) {
  try {
    const h = new URL(raw).hostname.toLowerCase();
    if (h.includes("goofish.com")) return "闲鱼";
    if (h.includes("xiaohongshu.com")) return "小红书";
    return h.replace(/^www\./, "");
  } catch { return "未知网站"; }
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote", "--single-process"]
    }).catch(err => { browserPromise = null; throw err; });
  }
  return browserPromise;
}

function normalizeItems(rows, source, site) {
  return rows.slice(0, 600).map((x, i) => ({
    rank: Number(x.rank) || i + 1,
    title: clean(x.title, 260),
    text: clean(x.text, 1400),
    url: clean(x.url || source, 2200),
    image: clean(x.image, 2200),
    price: nullableNumber(x.price),
    wants: nullableNumber(x.wants ?? x.favs),
    likes: nullableNumber(x.likes),
    favs: nullableNumber(x.favs),
    comments: nullableNumber(x.comments),
    views: nullableNumber(x.views),
    exposure: nullableNumber(x.exposure ?? x.impressions),
    impressions: nullableNumber(x.impressions ?? x.exposure),
    consults: nullableNumber(x.consults),
    sales: nullableNumber(x.sales ?? x.sold),
    sold: nullableNumber(x.sold ?? x.sales),
    shares: nullableNumber(x.shares),
    specs: clean(x.specs, 140),
    ageText: clean(x.ageText, 80),
    imageCount: nullableNumber(x.imageCount),
    searchKeyword: clean(x.searchKeyword, 120),
    productId: clean(x.productId, 180),
    keywordHits: Array.isArray(x.keywordHits) ? x.keywordHits.map(v => clean(v, 100)).filter(Boolean).slice(0, 30) : [],
    sampleTier: clean(x.sampleTier, 10),
    seller: clean(x.seller, 160),
    publishedAt: clean(x.publishedAt, 80),
    contentType: clean(x.contentType, 80),
    coverType: clean(x.coverType, 80),
    site
  })).filter(x => x.title);
}

async function analyzeUrl(url) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "zh-CN",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  try {
    await page.route("**/*", route => {
      const t = route.request().resourceType();
      return ["media", "font"].includes(t) ? route.abort() : route.continue();
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight, 2200)));
    await page.waitForTimeout(1200);

    return await page.evaluate(() => {
      const C = s => String(s || "").replace(/\s+/g, " ").trim();
      const N = s => {
        const m = String(s || "").replace(/,/g, "").match(/([\d.]+)\s*(万|w|W|k|K|千)?/);
        if (!m) return null;
        let v = +m[1], u = m[2] || "";
        if (/万|w/i.test(u)) v *= 10000;
        if (/k|千/i.test(u)) v *= 1000;
        return Math.round(v);
      };
      const out = [], seen = new Set(), cand = [];
      for (const el of document.querySelectorAll("article,li,a,div")) {
        const r = el.getBoundingClientRect();
        if (r.width < 150 || r.width > 760 || r.height < 90 || r.height > 1000) continue;
        const text = C(el.innerText);
        if (text.length < 8 || text.length > 1200 || !el.querySelector("img")) continue;
        cand.push({ el, text, area: r.width * r.height, top: r.top });
      }
      cand.sort((a, b) => a.area - b.area || a.top - b.top);
      for (const c of cand) {
        const lines = (c.el.innerText || "").split(/\n+/).map(C).filter(Boolean);
        let title = lines.find(x => x.length >= 6 && x.length <= 120 && !/^(¥|￥|\d+[万wk]?|点赞|收藏|评论|分享|想要)/i.test(x));
        if (!title) continue;
        const key = title.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);
        const text = c.text;
        const pm = text.match(/[¥￥]\s*([\d,.]+)/);
        const wm = text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:人想要|想要)/i);
        const lm = text.match(/(?:点赞|赞)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i) || text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*(?:点赞|赞)/i);
        const fm = text.match(/(?:收藏)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i) || text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*收藏/i);
        const cm = text.match(/(?:评论)\s*[:：]?\s*([\d,.]+\s*(?:万|w|W|k|K|千)?)/i) || text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*评论/i);
        const sm = text.match(/\b\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?\s*mm?\b/i);
        const tm = text.match(/(刚刚|今天|昨天|\d+\s*(?:分钟|小时|天)前)(?:发布)?/);
        const a = c.el.closest("a[href]") || c.el.querySelector("a[href]");
        out.push({ rank: out.length + 1, title, text, url: a?.href || location.href, image: c.el.querySelector("img")?.src || "", price: pm ? +pm[1].replace(/,/g, "") : null, wants: wm ? N(wm[1]) : null, likes: lm ? N(lm[1]) : null, favs: fm ? N(fm[1]) : null, comments: cm ? N(cm[1]) : null, specs: sm ? sm[0] : "", ageText: tm ? tm[1] : "" });
        if (out.length >= 60) break;
      }
      return out;
    });
  } finally {
    await context.close();
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, version: "8.1.3", mode: "decision-system-permanent-collector" });
});

app.get("/browser-bridge.zip", (req, res) => {
  const zip = Buffer.from(BRIDGE_ZIP_BASE64, "base64");
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=browser-bridge-v1.zip");
  res.setHeader("Cache-Control", "no-store");
  res.send(zip);
});

app.post("/api/analyze-url", async (req, res) => {
  try {
    const url = await validatePublicUrl(req.body?.url || "");
    const site = siteFromUrl(url);
    const rows = await analyzeUrl(url);
    const items = normalizeItems(rows, url, site);
    if (!items.length) return res.status(409).json({ ok: false, needsCollector: true, error: "这个网址服务器端没有抓到有效内容，请使用本机浏览器桥接或网页抓取。" });
    res.json({ ok: true, source: url, site, items });
  } catch (err) {
    res.status(400).json({ ok: false, error: err?.message || "分析失败" });
  }
});

app.post("/import", (req, res) => {
  try {
    const raw = typeof req.body?.data === "string" ? req.body.data : "";
    const payload = JSON.parse(raw || "{}");
    const source = clean(payload.source, 2200);
    const site = siteFromUrl(source);
    const rows = Array.isArray(payload.items) ? payload.items : [];
    const items = normalizeItems(rows, source, site);
    if (!items.length) throw new Error("没有收到有效内容数据");
    const safe = JSON.stringify({ source, site, keyword: clean(payload.keyword,120), meta: payload.meta || {}, capturedAt: new Date().toISOString(), items }).replace(/</g, "\\u003c");
    res.type("html").send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>正在导入</title></head><body><script>localStorage.setItem('floorV7Import',JSON.stringify(${safe}));location.replace('/?imported=1&v=813&t='+Date.now());<\/script></body></html>`);
  } catch (err) {
    res.status(400).type("html").send(`<!doctype html><meta charset="utf-8"><body style="font-family:-apple-system;padding:30px"><h2>导入失败</h2><p>${clean(err?.message || "未知错误", 300)}</p></body>`);
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`V8.1.3 running on :${PORT}`));