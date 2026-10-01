import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v63File = new URL("./public/v63.js", import.meta.url);
const collectorFile = new URL("./public/v63collector.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v63 = fs.readFileSync(v63File, "utf8");
const collector = fs.readFileSync(collectorFile, "utf8");

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
for (const id of ['v50-inline','v51-inline','v52-inline','v60-inline','v61-inline','v62-inline','v63-inline','v63collector-inline']) {
  html = html.replace(new RegExp(`<script\\s+id=["']${id}["'][\\s\\S]*?<\\/script>`, 'g'), '');
}
html = html.replace("</body>", `<script id="v63-inline">\n${v63}\n<\/script>\n<script id="v63collector-inline">\n${collector}\n<\/script></body>`);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V6.3：单页不足500条时会按精准词→同类词→行业词自动扩展抓取，所有商品按ID/链接去重并保留命中关键词；发布区改为3个不同测试模型，只有你勾选且数据支持的卖点才写进可复制正文。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V6.3 standalone decision UI + multi-query collector applied");
