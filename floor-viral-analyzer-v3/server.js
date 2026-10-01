import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: false, limit: "3mb" }));
app.use(express.static("public", { etag: false, maxAge: 0 }));

let browserPromise = null;

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
  return rows.slice(0, 100).map((x, i) => ({
    rank: Number(x.rank) || i + 1,
    title: clean(x.title, 260),
    text: clean(x.text, 1400),
    url: clean(x.url || source, 2200),
    image: clean(x.image, 2200),
    price: Number.isFinite(Number(x.price)) ? Number(x.price) : null,
    wants: Number.isFinite(Number(x.wants ?? x.favs)) ? Number(x.wants ?? x.favs) : null,
    likes: Number.isFinite(Number(x.likes)) ? Number(x.likes) : null,
    favs: Number.isFinite(Number(x.favs)) ? Number(x.favs) : null,
    comments: Number.isFinite(Number(x.comments)) ? Number(x.comments) : null,
    shares: Number.isFinite(Number(x.shares)) ? Number(x.shares) : null,
    specs: clean(x.specs, 140),
    ageText: clean(x.ageText, 80),
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

    const rows = await page.evaluate(() => {
      const C = s => String(s || "").replace(/\s+/g, " ").trim();
      const N = s => {
        const m = String(s || "").replace(/,/g, "").match(/([\d.]+)\s*(万|w|W|k|K|千)?/);
        if (!m) return null;
        let v = +m[1], u = m[2] || "";
        if (/万|w/i.test(u)) v *= 10000;
        if (/k|千/i.test(u)) v *= 1000;
        return Math.round(v);
      };
      const out = [], seen = new Set();
      const cand = [];
      for (const el of document.querySelectorAll("article,li,a,div")) {
        const r = el.getBoundingClientRect();
        if (r.width < 150 || r.width > 760 || r.height < 90 || r.height > 1000) continue;
        const text = C(el.innerText);
        if (text.length < 8 || text.length > 1200) continue;
        if (!el.querySelector("img")) continue;
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
        out.push({
          rank: out.length + 1,
          title,
          text,
          url: a?.href || location.href,
          image: c.el.querySelector("img")?.src || "",
          price: pm ? +pm[1].replace(/,/g, "") : null,
          wants: wm ? N(wm[1]) : null,
          likes: lm ? N(lm[1]) : null,
          favs: fm ? N(fm[1]) : null,
          comments: cm ? N(cm[1]) : null,
          specs: sm ? sm[0] : "",
          ageText: tm ? tm[1] : ""
        });
        if (out.length >= 60) break;
      }
      return out;
    });

    return rows;
  } finally {
    await context.close();
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, version: "4.0.0", mode: "dual-input-multi-site" });
});

app.post("/api/analyze-url", async (req, res) => {
  try {
    const url = await validatePublicUrl(req.body?.url || "");
    const site = siteFromUrl(url);
    const rows = await analyzeUrl(url);
    const items = normalizeItems(rows, url, site);
    if (!items.length) {
      return res.status(409).json({ ok: false, needsCollector: true, error: "这个网址服务器端没有抓到有效内容，请改用“网页抓取”读取你当前已打开的页面。" });
    }
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
    const safe = JSON.stringify({ source, site, capturedAt: new Date().toISOString(), items }).replace(/</g, "\\u003c");
    res.type("html").send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>正在导入</title></head><body><script>localStorage.setItem('floorV40Import',JSON.stringify(${safe}));location.replace('/?imported=1&v=40');<\/script></body></html>`);
  } catch (err) {
    res.status(400).type("html").send(`<!doctype html><meta charset="utf-8"><body style="font-family:-apple-system;padding:30px"><h2>导入失败</h2><p>${clean(err?.message || "未知错误", 300)}</p></body>`);
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`V4.0 running on :${PORT}`));
