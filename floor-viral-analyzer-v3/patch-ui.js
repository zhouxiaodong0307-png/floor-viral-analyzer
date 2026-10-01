import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
let html = fs.readFileSync(file, "utf8");

html = html.replaceAll("V4.8", "V4.9");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "先找高价值样本共同点，再按共同点生成下一篇，而不是套固定模板"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "先比较高价值样本与普通样本的差异，再决定标题、价格、规格和正文结构"
);
html = html.replace(
  "V4.9：把“结构参考”和“流量参考”分开判断；生成只用关键词高度相关样本，低相关词不会写进商品；深度抓取会边滚动边累计，适配页面虚拟列表。",
  "V4.9：生成逻辑改为高价值共同点驱动；先比较高价值组与普通组，再把真正有差异的标题/价格/规格/正文结构映射到下一篇。"
);

if (!html.includes('/v49.js?v=49')) {
  html = html.replace('</body>', '<script src="/v49.js?v=49"></script></body>');
}

fs.writeFileSync(file, html);
console.log("V4.9 commonality generator patch applied");
