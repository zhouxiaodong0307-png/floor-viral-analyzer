import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v63File = new URL("./public/v63.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v63 = fs.readFileSync(v63File, "utf8");

html = html
  .replaceAll("V4.8", "V6.3")
  .replaceAll("V4.9", "V6.3")
  .replaceAll("V5.0", "V6.3")
  .replaceAll("V5.1", "V6.3")
  .replaceAll("V5.2", "V6.3")
  .replaceAll("V6.0", "V6.3")
  .replaceAll("V6.1", "V6.3")
  .replaceAll("V6.2", "V6.3");

html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "先抓真实唯一商品，再用高表现与普通样本的差异决定下一条怎么发"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "V6.3 重做500条抓取与可直接发布生成：不再把旧模板当成分析结果"
);

html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
for (const id of ['v50-inline','v51-inline','v52-inline','v60-inline','v61-inline','v62-inline','v63-inline']) {
  html = html.replace(new RegExp(`<script\\s+id=["']${id}["'][\\s\\S]*?<\\/script>`, 'g'), '');
}
html = html.replace("</body>", `<script id="v63-inline">\n${v63}\n<\/script></body>`);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V6.3：抓取目标仍为500条唯一商品，但不再把页面DOM节点当商品。分析只用清洗后的真实记录；发布区改为3个真正不同的测试方案，并且只有你勾选且数据支持的卖点才会写进可复制正文。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V6.3 standalone decision UI applied");
