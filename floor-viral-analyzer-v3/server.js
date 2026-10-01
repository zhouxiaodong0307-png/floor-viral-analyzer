import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

let browserPromise;
let goofishContext = null;
let loginPage = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled"
      ]
    }).catch(err => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

async function getGoofishContext() {
  if (goofishContext) return goofishContext;

  const browser = await getBrowser();

  goofishContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    locale: "zh-CN",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36"
  });

  return goofishContext;
}

function isPrivateIp(ip) {
  if (!net.isIP(ip)) return false;
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;

  const m = ip.match(/^172\.(\d+)\./);
  if (m && +m[1] >= 16 && +m[1] <= 31) return true;

  if (
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80:")
  ) return true;

  return false;
}

async function validateUrl(raw) {
  let u;

  try {
    u = new URL(raw);
  } catch {
    throw new Error("网址格式不正确");
  }

  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("仅支持 http/https 网址");
  }

  const host = u.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("不支持本地地址");
  }

  const found = await dns.lookup(host, { all: true });

  if (found.some(x => isPrivateIp(x.address))) {
    throw new Error("不支持内网地址");
  }

  return u.toString();
}

function humanNumber(value) {
  if (value == null) return null;

  const s = String(value)
    .replace(/,/g, "")
    .trim()
    .toLowerCase();

  const m = s.match(
    /([\d.]+)\s*(万|w|k|千|m|百万)?/i
  );

  if (!m) return null;

  let n = parseFloat(m[1]);

  if (!Number.isFinite(n)) return null;

  const unit = (m[2] || "").toLowerCase();

  if (unit === "万" || unit === "w") n *= 10000;
  else if (unit === "k" || unit === "千") n *= 1000;
  else if (unit === "m" || unit === "百万") n *= 1000000;

  return Math.round(n);
}

function cleanText(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuery(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("q") || "";
  } catch {
    return "";
  }
}

/* =========================
   闲鱼登录
========================= */

app.get("/api/goofish/login", async (req, res) => {
  try {
    const context = await getGoofishContext();

    if (loginPage) {
      try {
        await loginPage.close();
      } catch {}
    }

    loginPage = await context.newPage();

    await loginPage.goto(
      "https://www.goofish.com/login",
      {
        waitUntil: "domcontentloaded",
        timeout: 45000
      }
    );

    await loginPage.waitForTimeout(3000);

    const shot = await loginPage.screenshot({
      type: "png"
    });

    res.json({
      ok: true,
      screenshot:
        "data:image/png;base64," +
        shot.toString("base64")
    });

  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err?.message || "打开闲鱼登录页失败"
    });
  }
});

app.get("/api/goofish/login-status", async (req, res) => {
  try {
    const context = await getGoofishContext();

    const pages = context.pages();

    const page =
      loginPage ||
      pages[0] ||
      await context.newPage();

    const cookies = await context.cookies();

    const hasLoginCookie = cookies.some(c =>
      /unb|cookie2|sgcookie|tracknick|login/i.test(c.name)
    );

    let body = "";

    try {
      body = cleanText(
        await page.locator("body").innerText({
          timeout: 3000
        })
      );
    } catch {}

    const loginText =
      /扫码登录|密码登录|短信登录|立即登录|登录闲鱼/i.test(body);

    const loggedIn =
      hasLoginCookie && !loginText;

    res.json({
      ok: true,
      loggedIn
    });

  } catch (err) {
    res.json({
      ok: true,
      loggedIn: false
    });
  }
});

/* =========================
   闲鱼商品抓取
========================= */

async function analyzeGoofish(url, maxItems) {
  const context = await getGoofishContext();
  const page = await context.newPage();

  try {
    const keyword = extractQuery(url);

    if (!keyword) {
      throw new Error("没有识别到闲鱼搜索关键词");
    }

    const apiItems = [];

    page.on("response", async response => {
      try {
        const requestUrl = response.url();

        if (
          !/mtop|search|item/i.test(requestUrl)
        ) return;

        const type =
          response.headers()["content-type"] || "";

        if (!type.includes("json")) return;

        const json = await response.json();

        const stack = [json];

        while (stack.length) {
          const value = stack.pop();

          if (!value) continue;

          if (Array.isArray(value)) {
            for (const x of value) stack.push(x);
            continue;
          }

          if (typeof value !== "object") continue;

          const title =
            value.title ||
            value.itemTitle ||
            value.item_title ||
            value.name ||
            value.desc;

          const itemId =
            value.itemId ||
            value.item_id ||
            value.id;

          const price =
            value.price ||
            value.currentPrice ||
            value.salePrice;

          if (
            title &&
            itemId &&
            String(title).length >= 4
          ) {
            apiItems.push({
              title: cleanText(title),
              itemId: String(itemId),
              price:
                price != null
                  ? cleanText(price)
                  : null,
              raw: value
            });
          }

          for (const v of Object.values(value)) {
            if (
              v &&
              (typeof v === "object")
            ) {
              stack.push(v);
            }
          }
        }

      } catch {}
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await page.waitForTimeout(5000);

    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 900);
        await new Promise(r =>
          setTimeout(r, 700)
        );
      }
    });

    await page.waitForTimeout(2500);

    const bodyText = cleanText(
      await page.locator("body").innerText()
    );

    const blocked =
      /验证码|安全验证|访问过于频繁|请完成验证|登录后查看|扫码登录|密码登录/i.test(
        bodyText.slice(0, 6000)
      );

    if (blocked && apiItems.length === 0) {
      throw new Error(
        "闲鱼登录状态无效或触发安全验证，请重新扫码登录"
      );
    }

    const domItems = await page.evaluate(() => {
      const clean = s =>
        String(s || "")
          .replace(/\s+/g, " ")
          .trim();

      const results = [];
      const seen = new Set();

      const anchors = [
        ...document.querySelectorAll("a[href]")
      ];

      for (const a of anchors) {
        const href = a.href || "";

        if (
          !/goofish\.com/.test(href) ||
          !/(item|detail)/i.test(href)
        ) continue;

        let box = a;

        for (let i = 0; i < 6; i++) {
          if (!box?.parentElement) break;

          const parent = box.parentElement;
          const text = clean(parent.innerText);

          if (
            text.length >= 10 &&
            text.length <= 1000 &&
            (
              /[¥￥]\s*\d/.test(text) ||
              /人想要/.test(text)
            )
          ) {
            box = parent;
            break;
          }

          box = parent;
        }

        const text = clean(
          box?.innerText || a.innerText
        );

        if (
          !text ||
          text.length < 6 ||
          /隐私政策|用户协议|营业执照|阿里巴巴/i.test(text)
        ) continue;

        if (seen.has(href)) continue;
        seen.add(href);

        const img =
          box?.querySelector("img")?.src ||
          a.querySelector("img")?.src ||
          "";

        results.push({
          href,
          text,
          img
        });
      }

      return results;
    });

    const merged = [];
    const seen = new Set();

    for (const x of apiItems) {
      const key = x.itemId;

      if (seen.has(key)) continue;
      seen.add(key);

      let favs = null;

      const rawText = JSON.stringify(x.raw);

      const wantMatch = rawText.match(
        /(?:want|wanted|collect|favor)[^0-9]{0,30}([\d.]+(?:万|w|k)?)/i
      );

      if (wantMatch) {
        favs = humanNumber(wantMatch[1]);
      }

      merged.push({
        title: x.title.slice(0, 180),
        text: x.title,
        url:
          "https://www.goofish.com/item?id=" +
          encodeURIComponent(x.itemId),
        image: "",
        views: null,
        likes: null,
        favs,
        comments: null,
        shares: null,
        publishedAt: null,
        price: x.price
      });
    }

    for (const x of domItems) {
      if (merged.length >= maxItems) break;

      const idMatch = x.href.match(
        /(?:id=|\/item\/)(\d+)/
      );

      const key =
        idMatch?.[1] || x.href;

      if (seen.has(key)) continue;
      seen.add(key);

      const want = x.text.match(
        /([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*人想要/i
      );

      const price = x.text.match(
        /[¥￥]\s*([\d,.]+)/
      );

      let title = x.text
        .split(/(?=[¥￥])/)[0]
        .replace(
          /^(包邮|验货宝|超赞鱼小铺|全新|严选|转卖)\s*/g,
          ""
        )
        .trim();

      merged.push({
        title: title.slice(0, 180),
        text: x.text.slice(0, 1200),
        url: x.href,
        image: x.img,
        views: null,
        likes: null,
        favs:
          want
            ? humanNumber(want[1])
            : null,
        comments: null,
        shares: null,
        publishedAt: null,
        price:
          price
            ? price[1]
            : null
      });
    }

    if (!merged.length) {
      throw new Error(
        "当前没有获取到闲鱼商品数据，请重新登录后再试"
      );
    }

    return {
      ok: true,
      url,
      site: "goofish.com",
      status: 200,
      blocked: false,
      title:
        keyword + " - 闲鱼搜索",
      description:
        `闲鱼关键词：${keyword}`,
      image: "",
      text: "",
      pageMetrics: {
        views: null,
        likes: null,
        favs: null,
        comments: null,
        shares: null,
        publishedAt: null
      },
      items: merged.slice(
        0,
        Math.max(
          1,
          Math.min(maxItems, 100)
        )
      )
    };

  } finally {
    await page.close();
  }
}

/* =========================
   普通网页
========================= */

async function analyzeGeneric(url, maxItems) {
  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 1200
    },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const clean = s =>
        String(s || "")
          .replace(/\s+/g, " ")
          .trim();

      const title = clean(
        document.querySelector(
          'meta[property="og:title"]'
        )?.content ||
        document.title ||
        document.querySelector("h1")
          ?.textContent
      );

      const description = clean(
        document.querySelector(
          'meta[property="og:description"]'
        )?.content ||
        document.querySelector(
          'meta[name="description"]'
        )?.content
      );

      const bodyText = clean(
        document.body?.innerText || ""
      );

      return {
        title,
        description,
        bodyText
      };
    });

    return {
      ok: true,
      url,
      site:
        new URL(url)
          .hostname
          .replace(/^www\./, ""),
      status:
        response?.status() || null,
      blocked: false,
      title:
        data.title || url,
      description:
        data.description || "",
      image: "",
      text:
        data.bodyText.slice(0, 12000),
      pageMetrics: {
        views: null,
        likes: null,
        favs: null,
        comments: null,
        shares: null,
        publishedAt: null
      },
      items: []
    };

  } finally {
    await context.close();
  }
}

/* =========================
   API
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    version: "3.2.0"
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const url = await validateUrl(
      req.body?.url || ""
    );

    const maxItems = Number(
      req.body?.maxItems || 60
    );

    const host =
      new URL(url).hostname.toLowerCase();

    let result;

    if (
      host === "goofish.com" ||
      host.endsWith(".goofish.com")
    ) {
      result = await analyzeGoofish(
        url,
        maxItems
      );
    } else {
      result = await analyzeGeneric(
        url,
        maxItems
      );
    }

    res.json(result);

  } catch (err) {
    res.status(400).json({
      ok: false,
      error:
        err?.message || "分析失败"
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `V3.2 running on :${PORT}`
  );
});
