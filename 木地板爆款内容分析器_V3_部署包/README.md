# 木地板爆款内容分析器 V3

## 这版和 V2 的区别
V2 是纯静态网页，遇到闲鱼这类动态页面会失败。
V3 增加 Node.js + Playwright 浏览器后端，服务器会真正打开网页、等待渲染，再提取公开内容。

## 推荐部署
### Railway
1. 新建项目
2. 上传本部署包到 GitHub 或直接导入仓库
3. Railway 会识别 Dockerfile
4. 部署完成后打开生成的网址

### Render
仓库中已包含 render.yaml，可直接按 Docker Web Service 部署。

## 重要
- 不能继续作为纯 Netlify 静态站直接部署；Netlify 原来的站点只能承载前端，无法运行本包的常驻 Playwright 浏览器服务。
- 所有公开 URL 都会执行，但页面要求登录/验证码/权限时只会标记受限，不绕过限制。
