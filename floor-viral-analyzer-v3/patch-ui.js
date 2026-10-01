import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v61File = new URL("./public/v61.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v61 = fs.readFileSync(v61File, "utf8");

html = html.replaceAll("V4.8", "V6.1").replaceAll("V4.9", "V6.1").replaceAll("V5.0", "V6.1").replaceAll("V5.1", "V6.1").replaceAll("V5.2", "V6.1").replaceAll("V6.0", "V6.1");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "默认每关键词抓取约500条原始数据，先清洗分层，再决定下一条测试什么"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "有效、直接相关、近期、可比较的数据优先；精准样本不足时自动降级为探索性分析"
);

html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
html = html.replace(/<script\s+id=["']v50-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v51-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v52-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v60-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v61-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(
  "</body>",
  `<script id="v61-inline">\n${v61}\n<\/script></body>`
);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V6.1：每关键词默认目标500条原始数据，清洗后目标有效样本≥300；A级直接相关、B级同类、C级大盘严格分层；直接相关≥100为高可信、30–99为中可信、<30只做探索性分析。历史数据库滚动去重，最近7天最高权重、30天内主要参考、30天以上自动降权。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V6.1 rolling database and evidence pipeline applied");
