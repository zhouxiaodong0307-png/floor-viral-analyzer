import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

let browser = null;
let goofishContext = null;
let loginPage = null;
let loginReady = false;
let browserStarting = null;

function jsonError(res, status, message) {
  if (!res.headersSent) {
    res.status(status).json({
      ok: false,
      error: message
    });
  }
}

async function getBrowser() {
  if (browser?.isConnected()) return browser;

  if (browserStarting) return browserStarting;

  browserStarting = chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ]
  });

  try {
    browser = await browserStarting;

    browser.on("disconnected", () => {
      browser = null;
      goofishContext = null;
      loginPage = null;
      loginReady = false;
    });

    return browser;
  } finally {
    browserStarting = null;
  }
}

async function getGoofishContext() {
  if (goofishContext) return goofishContext;

  const b = await getBrowser();

  goofishContext = await b.newContext({
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

  return goofishContext;
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

async function closeLoginPage() {
  if (!loginPage) return;

  try {
    await loginPage.close();
  } catch {}

  loginPage = null;
}

/* =========================
   登录
========================= */

app.get("/api/goofish/login", async (req, res) => {
  try {
    loginReady = false;

    await closeLoginPage();

    const context = await getGoofishContext();

    loginPage = await context.newPage();

    await loginPage.goto(
      "https://www.goofish.com/login",
      {
        waitUntil: "domcontentloaded",
        timeout: 30000
      }
    );

    await loginPage.waitForTimeout(2000);

    const screenshot = await loginPage.screenshot({
      type: "jpeg",
      quality: 60,
      fullPage: false
    });

    res.json({
      ok: true,
      loggedIn: false,
      screenshot:
        "data:image/jpeg;base64," +
        screenshot.toString("base64")
    });

  } catch (err) {
    console.error(
      "[LOGIN]",
      err?.stack || err
    );

    jsonError(
      res,
      500,
      "闲鱼登录页面打开失败"
    );
  }
});

app.get(
  "/api/goofish/login-status",
  async (req, res) => {
    try {
      if (!goofishContext) {
        return res.json({
          ok: true,
          loggedIn: false
        });
      }

      const cookies =
        await goofishContext.cookies(
          "https://www.goofish.com"
        );

      /*
        不再因为“存在任意 cookie”就判断登录。
        只有完成登录页跳转，并且存在登录相关 cookie，
        才认为当前会话已登录。
      */

      let pagePassedLogin = false;

      if (
        loginPage &&
        !loginPage.isClosed()
      ) {
        const currentUrl =
          loginPage.url();

        const body = clean(
          await loginPage
            .locator("body")
            .innerText({
              timeout: 2500
            })
            .catch(() => "")
        );

        const stillLogin =
          /扫码登录|密码登录|短信登录|登录闲鱼|立即登录/i
            .test(body);

        pagePassedLogin =
          !currentUrl.includes("/login") &&
          !stillLogin;
      }

      const loginCookie =
        cookies.some(c =>
          /cookie2|sgcookie|tracknick|unb/i
            .test(c.name)
        );

      loginReady =
        Boolean(
          pagePassedLogin &&
          loginCookie
        );

      res.json({
        ok: true,
        loggedIn: loginReady
      });

    } catch (err) {
      console.error(
        "[LOGIN STATUS]",
        err?.stack || err
      );

      res.json({
        ok: true,
        loggedIn: false
      });
    }
  }
);

/* =========================
   闲鱼分析
========================= */

async function analyzeGoofish(url, maxItems) {
  if (!loginReady) {
    throw new Error(
      "闲鱼尚未完成登录，请先扫码登录"
    );
  }

  const context =
    await getGoofishContext();

  const page =
    await context.newPage();

  try {
    /*
      阻止字体、视频等高内存资源。
      图片也不下载，减少 Render 免费实例压力。
    */

    await page.route(
      "**/*",
      async route => {
        const type =
          route.request().resourceType();

        if (
          [
            "image",
            "media",
            "font"
          ].includes(type)
        ) {
          return route.abort();
        }

        return route.continue();
      }
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    await page.waitForTimeout(2500);

    const result =
      await page.evaluate(() => {
        const clean = s =>
          String(s || "")
            .replace(/\s+/g, " ")
            .trim();

        const body =
          clean(
            document.body?.innerText || ""
          );

        const seen = new Set();
        const items = [];

        const anchors =
          Array.from(
            document.querySelectorAll(
              'a[href*="item"]'
            )
          );

        for (const a of anchors) {
          if (items.length >= 80) break;

          const href =
            a.href || "";

          if (
            !href ||
            seen.has(href)
          ) continue;

          let box = a;

          for (
            let i = 0;
            i < 6 &&
            box?.parentElement;
            i++
          ) {
            const parent =
              box.parentElement;

            const text =
              clean(parent.innerText);

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

          const text =
            clean(
              box?.innerText ||
              a.innerText
            );

          if (
            text.length < 5 ||
            /隐私政策|用户协议|营业执照|阿里巴巴|ICP备/i
              .test(text)
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
          body,
          title:
            document.title || "",
          items
        };
      });

    const blocked =
      /验证码|安全验证|访问过于频繁|请完成验证|扫码登录|密码登录|短信登录/i
        .test(
          result.body.slice(0, 5000)
        );

    if (blocked) {
      loginReady = false;

      throw new Error(
        "闲鱼要求重新登录或安全验证，请重新扫码登录"
      );
    }

    const output = [];

    for (
      const item of result.items
    ) {
      if (
        output.length >= maxItems
      ) break;

      const priceMatch =
        item.text.match(
          /[¥￥]\s*([\d,.]+)/
        );

      const wantMatch =
        item.text.match(
          /([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*人想要/i
        );

      let title =
        item.text
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
        title:
          title.slice(0, 180),

        text:
          item.text.slice(0, 800),

        url:
          item.href,

        image: "",

        price:
          priceMatch
            ? priceMatch[1]
            : null,

        favs:
          wantMatch
            ? humanNumber(
                wantMatch[1]
              )
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
        "页面已打开，但没有识别到商品；可能需要重新登录或闲鱼页面结构已变化"
      );
    }

    return {
      ok: true,
      url,
      site: "goofish.com",
      status: 200,
      blocked: false,
      title:
        result.title ||
        "闲鱼搜索",
      description: "",
      image: "",
      text: "",
      pageMetrics: {},
      items: output
    };

  } finally {
    try {
      await page.close();
    } catch {}
  }
}

/* =========================
   API
========================= */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      ok: true,
      version: "3.3.0",
      loggedIn: loginReady
    });
  }
);

app.post(
  "/api/analyze",
  async (req, res) => {
    try {
      const url =
        await validateUrl(
          req.body?.url || ""
        );

      const host =
        new URL(url)
          .hostname
          .toLowerCase();

      if (
        host !== "goofish.com" &&
        !host.endsWith(
          ".goofish.com"
        )
      ) {
        throw new Error(
          "V3.3 当前仅分析闲鱼搜索网址"
        );
      }

      const maxItems =
        Math.max(
          1,
          Math.min(
            Number(
              req.body?.maxItems ||
              60
            ),
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

      jsonError(
        res,
        400,
        err?.message ||
        "分析失败"
      );
    }
  }
);

/*
  防止未捕获错误导致整个 Node 服务退出
*/

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
      `V3.3 running on :${PORT}`
    );
  }
);
