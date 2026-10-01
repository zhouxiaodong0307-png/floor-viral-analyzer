import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v50File = new URL("./public/v50.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v50 = fs.readFileSync(v50File, "utf8");

html = html.replaceAll("V4.8", "V5.0").replaceAll("V4.9", "V5.0");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "先找高价值样本共同点，再按共同点生成下一篇，而不是套固定模板"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "先比较高价值样本与普通样本，只有真正更集中的共同点才进入下一篇"
);
html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
html = html.replace(/<script\s+id=["']v50-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(
  "</body>",
  `<script id="v50-inline">\n${v50}\n<\/script></body>`
);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V5.0：高价值共同点驱动生成；先比较高价值组与普通组，再把显著共同点用于标题、正文、价格位置和标签。商品事实仍只来自你的输入。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V5.0 inline winner-pattern generator applied");
