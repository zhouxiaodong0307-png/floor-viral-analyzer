import express from "express";
import { chromium } from "playwright";
import dns from "node:dns/promises";
import net from "node:net";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

let browserPromise = null;
async function getBrowser(){
  if(!browserPromise){
    browserPromise = chromium.launch({
      headless:true,
      args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu","--no-zygote","--single-process"]
    }).catch(err=>{browserPromise=null;throw err;});
  }
  return browserPromise;
}

function isPrivateIp(ip){
  if(!net.isIP(ip)) return false;
  if(ip==="127.0.0.1"||ip==="::1") return true;
  if(ip.startsWith("10.")||ip.startsWith("192.168.")||ip.startsWith("169.254.")) return true;
  const m=ip.match(/^172\.(\d+)\./);
  return !!(m && +m[1]>=16 && +m[1]<=31);
}

async function validateUrl(raw){
  let u;
  try{u=new URL(raw);}catch{throw new Error("网址格式不正确");}
  if(!["http:","https:"].includes(u.protocol)) throw new Error("仅支持 http/https 网址");
  const host=u.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".local")) throw new Error("不支持本地地址");
  const found=await dns.lookup(host,{all:true});
  if(found.some(x=>isPrivateIp(x.address))) throw new Error("不支持内网地址");
  return u.toString();
}

function clean(s){return String(s||"").replace(/\s+/g," ").trim();}
function humanNumber(value){
  if(value==null) return null;
  const s=String(value).replace(/,/g,"").trim();
  const m=s.match(/([\d.]+)\s*(万|w|W|k|K|千)?/);
  if(!m) return null;
  let n=Number(m[1]);
  if(!Number.isFinite(n)) return null;
  const unit=m[2]||"";
  if(/万|w/i.test(unit)) n*=10000;
  if(/k|千/i.test(unit)) n*=1000;
  return Math.round(n);
}

async function analyzeGoofish(url,maxItems){
  const browser=await getBrowser();
  const context=await browser.newContext({
    viewport:{width:1365,height:900},
    locale:"zh-CN",
    userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  });
  const page=await context.newPage();
  try{
    await page.route("**/*",async route=>{
      const type=route.request().resourceType();
      if(["media","font"].includes(type)) return route.abort();
      return route.continue();
    });

    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForTimeout(2500);
    for(let i=0;i<4;i++){
      await page.evaluate(()=>window.scrollBy(0,800));
      await page.waitForTimeout(500);
    }

    const result=await page.evaluate(()=>{
      const clean=s=>String(s||"").replace(/\s+/g," ").trim();
      const body=clean(document.body?.innerText||"");
      const items=[]; const seen=new Set();
      const anchors=Array.from(document.querySelectorAll('a[href*="item"]'));
      let rank=0;
      for(const a of anchors){
        if(items.length>=100) break;
        const href=a.href||"";
        if(!href||seen.has(href)) continue;
        let box=a;
        for(let i=0;i<6&&box?.parentElement;i++){
          const p=box.parentElement;
          const t=clean(p.innerText);
          if(t.length>=8&&t.length<=800&&(/[¥￥]\s*\d/.test(t)||/人想要/.test(t))){box=p;break;}
          box=p;
        }
        const text=clean(box?.innerText||a.innerText);
        if(text.length<5||/隐私政策|用户协议|营业执照|阿里巴巴|ICP备|软件许可/i.test(text)) continue;
        seen.add(href); rank++;
        const img=box?.querySelector("img")?.src||a.querySelector("img")?.src||"";
        items.push({href,text,img,rank});
      }
      return {title:document.title||"",body,items};
    });

    const restricted=/请登录|登录后|扫码登录|密码登录|短信登录|验证码|安全验证|访问过于频繁|请完成验证|异常访问/i.test(result.body.slice(0,8000));
    if(restricted && result.items.length===0){
      throw new Error("服务器访问闲鱼时受到登录或安全验证限制");
    }

    const output=[];
    for(const item of result.items){
      if(output.length>=maxItems) break;
      const priceMatch=item.text.match(/[¥￥]\s*([\d,.]+)/);
      const wantMatch=item.text.match(/([\d,.]+\s*(?:万|w|W|k|K|千)?)\s*人想要/i);
      const areaMatch=item.text.match(/(\d+(?:\.\d+)?)\s*(?:㎡|平方|平米)/i);
      const specMatch=item.text.match(/\b\d{2,4}\s*[x×*]\s*\d{2,4}(?:\s*[x×*]\s*\d{1,3})?/i);
      let title=item.text.split(/(?=[¥￥])/)[0].replace(/^(包邮|验货宝|超赞鱼小铺|全新|严选|转卖)\s*/g,"").trim();
      if(!title) title=item.text;
      output.push({
        rank:item.rank,
        title:title.slice(0,180),
        text:item.text.slice(0,900),
        url:item.href,
        image:item.img,
        price:priceMatch?Number(priceMatch[1].replace(/,/g,"")):null,
        favs:wantMatch?humanNumber(wantMatch[1]):null,
        area:areaMatch?Number(areaMatch[1]):null,
        spec:specMatch?specMatch[0].replace(/\*/g,"×"):null
      });
    }

    if(!output.length) throw new Error("没有识别到商品；当前服务器可能受到闲鱼访问限制");

    return {ok:true,url,site:"goofish.com",status:response?.status()||200,title:result.title||"闲鱼搜索",items:output};
  } finally {
    await context.close();
  }
}

app.get("/api/health",(req,res)=>res.json({ok:true,version:"3.5.0"}));
app.post("/api/analyze",async(req,res)=>{
  try{
    const url=await validateUrl(req.body?.url||"");
    const host=new URL(url).hostname.toLowerCase();
    if(host!=="goofish.com"&&!host.endsWith(".goofish.com")) throw new Error("当前版本仅支持闲鱼网址");
    const maxItems=Math.max(1,Math.min(Number(req.body?.maxItems||80),80));
    res.json(await analyzeGoofish(url,maxItems));
  }catch(err){
    console.error("[ANALYZE]",err?.stack||err);
    if(!res.headersSent) res.status(400).json({ok:false,error:err?.message||"分析失败"});
  }
});

process.on("unhandledRejection",err=>console.error("[UNHANDLED REJECTION]",err));
process.on("uncaughtException",err=>console.error("[UNCAUGHT EXCEPTION]",err));
app.listen(PORT,"0.0.0.0",()=>console.log(`V3.5 running on :${PORT}`));
