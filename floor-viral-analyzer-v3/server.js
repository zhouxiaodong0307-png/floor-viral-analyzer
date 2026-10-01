import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

let browserPromise;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    }).catch(err => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  return false;
}

async function validateUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error("网址格式不正确"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("仅支持 http/https 公开网址");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) throw new Error("不支持本地地址");
  const found = await dns.lookup(host, { all: true });
  if (found.some(x => isPrivateIp(x.address))) throw new Error("不支持内网地址");
  return u.toString();
}

function humanNumber(v) {
  if (v == null) return null;
  const s = String(v).replace(/,/g, "").trim().toLowerCase();
  const m = s.match(/([\d.]+)\s*(万|w|k|千|m|百万)?/i);
  if (!m) return null;

  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;

  const unit = (m[2] || "").toLowerCase();
  if (unit === "万" || unit === "w") n *= 10000;
  else if (unit === "k" || unit === "千") n *= 1000;
  else if (unit === "m" || unit === "百万") n *= 1000000;

  return Math.round(n);
}

function metric(text, keys) {
  for (const k of keys) {
    const p1 = new RegExp(
      `${k}\\s*[:：]?\\s*([\\d,.]+\\s*(?:万|w|W|k|K|千|m|M|百万)?)`,
      "i"
    );
    const p2 = new RegExp(
      `([\\d,.]+\\s*(?:万|w|W|k|K|千|m|M|百万)?)\\s*${k}`,
      "i"
    );

    for (const re of [p1, p2]) {
      const m = text.match(re);
      if (m) {
        const n = humanNumber(m[1]);
        if (n != null) return n;
      }
    }
  }
  return null;
}

function extractDate(text) {
  const now = new Date();

  let m = text.match(/(\d+)\s*(分钟前|小时前|天前)/);
  if (m) {
    const d = new Date(now);
    const n = +m[1];

    if (m[2] === "分钟前") d.setMinutes(d.getMinutes() - n);
    if (m[2] === "小时前") d.setHours(d.getHours() - n);
    if (m[2] === "天前") d.setDate(d.getDate() - n);

    return d.toISOString();
  }

  if (/今天/.test(text))
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  if (/昨天/.test(text))
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

  m = text.match(/\b(20\d{2})[年\/\-.](\d{1,2})[月\/\-.](\d{1,2})\b/);
  if (m)
    return new Date(+m[1], +m[2] - 1, +m[3]).toISOString();

  return null;
}

const KEYS = {
  views: ["浏览量?", "阅读量?", "播放量?", "views?"],
  likes: ["点赞", "获赞", "喜欢", "likes?"],
  favs: ["收藏", "想要", "favorites?", "favourites?", "wants?"],
  comments: ["评论", "回复", "comments?"],
  shares: ["分享", "转发", "shares?"]
};

function parseMetrics(text) {
  return {
    views: metric(text, KEYS.views),
    likes: metric(text, KEYS.likes),
    favs: metric(text, KEYS.favs),
    comments: metric(text, KEYS.comments),
    shares: metric(text, KEYS.shares),
    publishedAt: extractDate(text)
  };
}

function scoreCandidate(x) {
  let s = 0;
  if (x.href) s += 2;
  if (x.text && x.text.length >= 6) s += 2;
  if (/\d/.test(x.text || "")) s += 1;
  if (/(浏览|点赞|收藏|想要|评论|¥|￥|元|实木|地板|橡木|柚木)/i.test(x.text || ""))
    s += 3;
  return s;
}

async function analyzePage(url, maxItems = 40) {
  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await page.waitForTimeout(3000);

    await page.evaluate(() =>
      window.scrollTo(0, Math.min(document.body.scrollHeight, 3500))
    );

    await page.waitForTimeout(1500);

    const status = response?.status() || null;
    const isGoofish = /(^|\.)goofish\.com$/i.test(new URL(url).hostname);

    const data = await page.evaluate((isGoofish) => {
      const clean = s => (s || "").replace(/\s+/g, " ").trim();

      const title = clean(
        document.querySelector('meta[property="og:title"]')?.content ||
        document.querySelector("title")?.textContent ||
        document.querySelector("h1")?.textContent
      );

      const description = clean(
        document.querySelector('meta[property="og:description"]')?.content ||
        document.querySelector('meta[name="description"]')?.content
      );

      const image =
        document.querySelector('meta[property="og:image"]')?.content || "";

      const bodyText = clean(document.body?.innerText || "");

      const seen = new Set();
      const cards = [];

      const rejectText =
        /阿里巴巴|隐私政策|软件许可|用户服务协议|营业执照|ICP备|公安|促进绿色消费|Banner横幅|钱币收藏|二次元/i;

      if (isGoofish) {
        const productAnchors = [
          ...document.querySelectorAll(
            'a[href*="/item"],a[href*="item?id="],a[href*="item?"]'
          )
        ];

        for (const a of productAnchors) {
          let href = "";

          try {
            href = new URL(a.getAttribute("href"), location.href).href;
          } catch {}

          if (!href || seen.has(href)) continue;

          let container = a;

          for (let i = 0; i < 7 && container?.parentElement; i++) {
            const p = container.parentElement;
            const t = clean(p.innerText || "");

            if (
              t.length >= 12 &&
              t.length <= 900 &&
              (/[¥￥]\s*\d/.test(t) ||
                /\d+(?:\.\d+)?\s*人想要/.test(t))
            ) {
              container = p;
              break;
            }

            container = p;
          }

          const text = clean(
            container?.innerText || a.innerText || ""
          );

          if (!text || rejectText.test(text)) continue;

          const img =
            container?.querySelector("img")?.src ||
            a.querySelector("img")?.src ||
            "";

          seen.add(href);

          cards.push({
            text,
            href,
            img
          });
        }
      } else {
        const anchors = [...document.querySelectorAll("a[href]")];

        for (const a of anchors) {
          const container =
            a.closest(
              "article,li,[class*='item'],[class*='card'],[class*='product'],[class*='goods']"
            ) || a;

          const text = clean(
            container.innerText || a.innerText || ""
          );

          let href = "";

          try {
            href = new URL(
              a.getAttribute("href"),
              location.href
            ).href;
          } catch {}

          if (!href || !text || !href.startsWith("http"))
            continue;

          const key =
            href + "|" + text.slice(0, 100);

          if (seen.has(key)) continue;

          seen.add(key);

          cards.push({
            text,
            href,
            img:
              container.querySelector("img")?.src ||
              a.querySelector("img")?.src ||
              ""
          });
        }
      }

      return {
        title,
        description,
        image,
        bodyText,
        cards
      };
    }, isGoofish);

    const blocked =
      /(请登录|登录后|验证码|安全验证|访问过于频繁|请完成验证|verify|captcha|sign in|log in)/i.test(
        data.bodyText.slice(0, 5000)
      );

    const pageMetrics = parseMetrics(data.bodyText);

    let items = data.cards
      .map(c => {
        const m = parseMetrics(c.text);

        const parts = c.text
          .split(
            /(?=¥|￥|\d+(?:\.\d+)?\s*人想要)/
          )
          .map(x => x.trim())
          .filter(Boolean);

        const productTitle = parts[0]
          .replace(
            /^(包邮|验货宝|超赞鱼小铺|全新|严选|转卖)\s*/g,
            ""
          )
          .trim();

        const want = c.text.match(
          /([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*人想要/i
        );

        return {
          title:
            (productTitle || c.text).slice(0, 180),
          text: c.text.slice(0, 1200),
          url: c.href,
          image: c.img,
          ...m,
          favs: want
            ? humanNumber(want[1])
            : m.favs
        };
      })
      .filter(x =>
        isGoofish
          ? x.title.length >= 4
          : scoreCandidate({
              href: x.url,
              text: x.text
            }) >= 4
      )
      .slice(
        0,
        Math.max(
          1,
          Math.min(maxItems, 100)
        )
      );

    const host = new URL(url).hostname.replace(
      /^www\./,
      ""
    );

    return {
      ok: true,
      url,
      site: host,
      status,
      blocked,
      title: data.title,
      description: data.description,
      image: data.image,
      text: data.bodyText.slice(0, 12000),
      pageMetrics,
      items
    };
  } finally {
    await context.close();
  }
}

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    version: "3.1.0"
  })
);

app.post("/api/analyze", async (req, res) => {
  try {
    const url = await validateUrl(
      req.body?.url || ""
    );

    const maxItems = Number(
      req.body?.maxItems || 40
    );

    const result = await analyzePage(
      url,
      maxItems
    );

    res.json(result);
  } catch (err) {
    res.status(400).json({
      ok: false,
      error:
        err?.message || "分析失败"
    });
  }
});

app.listen(PORT, () =>
  console.log(
    `V3.1 running on :${PORT}`
  )
);
