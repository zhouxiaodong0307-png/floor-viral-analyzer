import fs from "node:fs";

const file = new URL("./public/index.html", import.meta.url);
let html = fs.readFileSync(file, "utf8");

const oldHead = '<th>排名</th><th>价值</th><th>标题</th><th>来源</th><th>价格</th><th>想要</th><th>点赞</th><th>收藏</th><th>评论</th><th>时间</th><th>互动/小时</th><th>卖家类型</th>';
const newHead = '<th>排名</th><th>价值</th><th>标题</th><th>价格</th><th>想要</th><th>点赞</th><th>收藏</th><th>评论</th><th>时间</th><th>互动/小时</th><th>卖家类型</th><th>来源</th>';

const oldRow = '<td class="title">${esc(x.title)}</td><td><a class="openlink" href="${esc(x.url)}" target="_blank" rel="noopener">打开</a></td><td>${x.price!=null?\'¥\'+esc(x.price):\'—\'}</td><td>${fmt(x.wants)}</td><td>${fmt(x.likes)}</td><td>${fmt(x.favs)}</td><td>${fmt(x.comments)}</td><td>${esc(x.ageText||\'—\')}</td><td>${x.velocity==null?\'—\':fmt(x.velocity)}</td><td>${esc(x.sellerType)}</td>';
const newRow = '<td class="title">${esc(x.title)}</td><td>${x.price!=null?\'¥\'+esc(x.price):\'—\'}</td><td>${fmt(x.wants)}</td><td>${fmt(x.likes)}</td><td>${fmt(x.favs)}</td><td>${fmt(x.comments)}</td><td>${esc(x.ageText||\'—\')}</td><td>${x.velocity==null?\'—\':fmt(x.velocity)}</td><td>${esc(x.sellerType)}</td><td><a class="openlink" href="${esc(x.url)}" target="_blank" rel="noopener">打开</a></td>';

if (html.includes(oldHead)) html = html.replace(oldHead, newHead);
if (html.includes(oldRow)) html = html.replace(oldRow, newRow);

fs.writeFileSync(file, html);
console.log("UI column patch applied");
