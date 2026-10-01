import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v51File = new URL("./public/v51.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v51 = fs.readFileSync(v51File, "utf8");

html = html.replaceAll("V4.8", "V5.1").replaceAll("V4.9", "V5.1").replaceAll("V5.0", "V5.1");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "先分析高价值商品的共同流量结构，再按共同点生成下一篇"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "先提炼标题、钩子、卖点排序、价格玩法、信任话术和咨询转化共性，再生成"
);

html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
html = html.replace(/<script\s+id=["']v50-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v51-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(
  "</body>",
  `<script id="v51-inline">\n${v51}\n<\/script></body>`
);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V5.1：爆款共性驱动生成。先从高价值样本提炼标题结构、开篇钩子、卖点排序、价格玩法、信任话术、用户痛点、标签和排版，再按共性生成可直接发布内容；并区分吸引点击与提高咨询的因素。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V5.1 viral commonality generator applied");
