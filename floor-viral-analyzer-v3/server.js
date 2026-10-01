import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
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
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;

  const m = ip.match(/^172\.(\d+)\./);

  if (m && +m[1] >= 16 && +m[1] <= 31) {
    return true;
  }

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

  if (
    host === "localhost" ||
    host.endsWith(".local")
  ) {
    throw new Error("不支持本地地址");
  }

  const found = await dns.lookup(host, {
    all: true
  });

  if (found.some(x => isPrivateIp(x.address))) {
    throw new Error("不支持内网地址");
  }

  return u.toString();
}

function clean(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function humanNumber(value) {
  if (value == null) return null;

  const s = String(value)
    .replace(/,/g, "")
    .trim();

  const m = s.match(
    /([\d.]+)\s*(万|w|W|k|K|千)?/
  );

  if (!m) return null;

  let n = Number(m[1]);

  if (!Number.isFinite(n)) return null;

  const unit = m[2] || "";

  if (/万|w/i.test(unit)) n *= 10000;
  if (/k|千/i.test(unit)) n *= 1000;

  return Math.round(n);
}

async function analyzeGoofish(url, maxItems) {
  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 800
    },
    locale: "zh-CN",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    await page.route("**/*", async route => {
      const type = route.request().resourceType();

      if (
        ["image", "media", "font"].includes(type)
      ) {
        return route.abort();
      }

      return route.continue();
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const clean = s =>
        String(s || "")
          .replace(/\s+/g, " ")
          .trim();

      const body = clean(
        document.body?.innerText || ""
      );

      const items = [];
      const seen = new Set();

      const anchors = Array.from(
        document.querySelectorAll(
          'a[href*="item"]'
        )
      );

      for (const a of anchors) {
        if (items.length >= 80) break;

        const href = a.href || "";

        if (!href || seen.has(href)) {
          continue;
        }

        let box = a;

        for (
          let i = 0;
          i < 6 && box?.parentElement;
          i++
        ) {
          const parent = box.parentElement;

          const text = clean(
            parent.innerText
          );

          if (
            text.length >= 8 &&
            text.length <= 700 &&
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
          box?.innerText ||
          a.innerText
        );

        if (
          text.length < 5 ||
          /隐私政策|用户协议|营业执照|阿里巴巴|ICP备|软件许可/i.test(text)
        ) {
          continue;
        }

        seen.add(href);

        items.push({
          href,
          text
        });
      }

      return {
        title: document.title || "",
        body,
        items
      };
    });

    const body = result.body.slice(
      0,
      8000
    );

    const restricted =
      /请登录|登录后|扫码登录|密码登录|短信登录|验证码|安全验证|访问过于频繁|请完成验证|异常访问/i.test(
        body
      );

    if (
      restricted &&
      result.items.length === 0
    ) {
      throw new Error(
        "闲鱼当前要求登录或安全验证，请在闲鱼正常登录后再试"
      );
    }

    const output = [];

    for (const item of result.items) {
      if (output.length >= maxItems) {
        break;
      }

      const priceMatch =
        item.text.match(
          /[¥￥]\s*([\d,.]+)/
        );

      const wantMatch =
        item.text.match(
          /([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*人想要/i
        );

      let title = item.text
        .split(/(?=[¥￥])/)[0]
        .replace(
          /^(包邮|验货宝|超赞鱼小铺|全新|严选|转卖)\s*/g,
          ""
        )
        .trim();

      if (!title) {
        title = item.text;
      }

      output.push({
        title: title.slice(0, 180),
        text: item.text.slice(0, 800),
        url: item.href,
        image: "",
        price: priceMatch
          ? priceMatch[1]
          : null,
        favs: wantMatch
          ? humanNumber(wantMatch[1])
          : null,
        views: null,
        likes: null,
        comments: null,
        shares: null,
        publishedAt: null
      });
    }

    if (!output.length) {
      throw new Error(
        "没有识别到闲鱼商品。若浏览器能正常看到商品，说明服务器访问闲鱼时受到限制。"
      );
    }

    return {
      ok: true,
      url,
      site: "goofish.com",
      status: response?.status() || 200,
      blocked: false,
      title:
        result.title || "闲鱼搜索",
      description: "",
      image: "",
      text: "",
      pageMetrics: {},
      items: output
    };

  } finally {
    await context.close();
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    version: "3.4.0"
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const url = await validateUrl(
      req.body?.url || ""
    );

    const host =
      new URL(url)
        .hostname
        .toLowerCase();

    if (
      host !== "goofish.com" &&
      !host.endsWith(".goofish.com")
    ) {
      throw new Error(
        "当前版本仅支持闲鱼网址"
      );
    }

    const maxItems = Math.max(
      1,
      Math.min(
        Number(req.body?.maxItems || 60),
        60
      )
    );

    const result =
      await analyzeGoofish(
        url,
        maxItems
      );

    res.json(result);

  } catch (err) {
    console.error(
      "[ANALYZE]",
      err?.stack || err
    );

    if (!res.headersSent) {
      res.status(400).json({
        ok: false,
        error:
          err?.message || "分析失败"
      });
    }
  }
});

process.on(
  "unhandledRejection",
  err => {
    console.error(
      "[UNHANDLED REJECTION]",
      err
    );
  }
);

process.on(
  "uncaughtException",
  err => {
    console.error(
      "[UNCAUGHT EXCEPTION]",
      err
    );
  }
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `V3.4 running on :${PORT}`
    );
  }
);
