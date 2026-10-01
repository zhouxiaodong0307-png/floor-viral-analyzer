import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
const v52File = new URL("./public/v52.js", import.meta.url);
let html = fs.readFileSync(file, "utf8");
const v52 = fs.readFileSync(v52File, "utf8");

html = html.replaceAll("V4.8", "V5.2").replaceAll("V4.9", "V5.2").replaceAll("V5.0", "V5.2").replaceAll("V5.1", "V5.2");
html = html.replace(
  "先把数据抓够，再只用与你商品真正相关的样本决定下一篇怎么发",
  "先用想要/浏览/点赞/收藏/评论筛高价值样本，再直接生成可发布商品文案"
);
html = html.replace(
  "不会再把不相关的“柚木 / 锁扣 / 原木”等词硬塞进你的商品",
  "输入商品关键词后，直接把高价值样本共性写成买家能看到的发布文案"
);

html = html.replace(/<script\s+src=["']\/v49\.js[^>]*><\/script>/g, "");
html = html.replace(/<script\s+id=["']v50-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v51-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(/<script\s+id=["']v52-inline["'][\s\S]*?<\/script>/g, "");
html = html.replace(
  "</body>",
  `<script id="v52-inline">\n${v52}\n<\/script></body>`
);

html = html.replace(
  /<div class="foot">[\s\S]*?<\/div><\/div>\s*<script>/,
  '<div class="foot">V5.2：可直接发布模式。先按想要、评论、收藏、点赞、浏览、发布时间和页面排名筛高价值内容，再提炼共同卖点并直接写成标题、分段正文和搜索词；分析结论不会再混进可复制正文。</div></div>\n<script>'
);

fs.writeFileSync(file, html);
console.log("V5.2 direct-publish generator applied");
