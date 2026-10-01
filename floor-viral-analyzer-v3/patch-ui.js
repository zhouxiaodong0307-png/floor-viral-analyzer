import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v60File = new URL("./public/v60.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v60 = fs.readFileSync(v60File, "utf8");

html = html.replaceAll("V4.8", "V6.0").replaceAll("V4.9", "V6.0").replaceAll("V5.0", "V6.0").replaceAll("V5.1", "V6.0").replaceAll("V5.2", "V6.0");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "闲鱼商品测试决策系统：先找差异，再决定下一条只测试什么"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "分析层已升级为 数据 → 差异 → 假设 → 测试 → 结果回收"
);

html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
html = html.replace(/<script\s+id=["']v50-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v51-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v52-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v60-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(
  "</body>",
  `<script id="v60-inline">\n${v60}\n<\/script></body>`
);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V6.0：从“文案生成器”升级为商品测试决策系统。先做 A/B/C 证据分级和单位时间表现归一化，再比较高表现组与普通组差异，输出下一轮测试变量、3 个不同测试方案，并记录自己的发布结果形成闭环。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V6.0 product testing decision system applied");
