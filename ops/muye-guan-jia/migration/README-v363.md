# 木业管家 V363 迁移切换准备（测试分支）

**尚未在正式环境执行以下步骤。** 生产站、正式 Supabase 和旧 Netlify 保持不变。

## 原始资料
- 唯一备份：木业管家_完整备份_20261011(2).json，SHA-256 2a5e841d66306795d82834a5080b7a9e53fb87cee124b3c7e58cc9e9373fb32e
- 24 笔订单（7 进行中、17 已完成），17 个成本快照、93 条订单事件、13 条收款历史、4 个产品、34 个报价。
- 已知历史异常：订单 2026020401 总价为 0 但已收 4798；禁止自动重算。

## V363 安全功能
- Render 首次打开不会自动注入 13 笔旧历史订单；新设备空数据时安全读取云端。
- 登录采用 Supabase Auth 访问令牌，浏览器安全刷新会话。测试站仍未开放云端业务写入。
- 同 ID 的订单、成本库、产品库、产品报价存在差异即停止写入，不能按整单时间戳覆盖。
- 安全快照只供人工恢复，不参与自动云端合并。
- 云端写入采用行 updated_at CAS；写后复读校验，确认成功才更新本机合并结果。网络中断保留本机数据。
- Render 使用 version.json 检查版本及提醒更新。
- 旧版本 Netlify 仍是回退路径，未修改。

## 生产上线前缺口（禁止跳过）
1. 从当前生产 Supabase **独立导出** 完整 JSON 并确认可恢复；核对与 V337 备份 24 笔订单的金额、成本、历史差异（两边可能存在13笔同 ID 差异）。
2. 用独立数据库验证 authenticated owner 登录、SELECT / UPDATE RLS、并发 CAS、断网恢复、多设备；不能用生产主行作写入测试。
3. 得到业务主人明确的正式上线同意后，停止旧 Netlify 写入，运行 rls-cutover-v363.sql。
4. 在 production Render 专用分支按已审查的凭据开启 SUPABASE_URL / SUPABASE_KEY，并把 FLOOR_SYNC_WRITE_RELEASED_V363 改为 true；切换前必须确认 anon 策略已经撤销。
5. Mac、iPad、iPhone 登录，逐一新增/改动测试非关键记录并检查同步和原始历史数据；验证成功才停用旧站。
6. 失败则立即停止写入，恢复备份或适用回退步骤；rls-rollback-v363.sql 是降低安全性的紧急措施，不能自动运行。

## 权限警告
当前生产数据库 floor_app_data 的 anon SELECT / INSERT / UPDATE / DELETE 策略仍存在，且 Supabase 安全顾问指出 public.rls_auto_enable() 以 SECURITY DEFINER 身份暴露 RPC 可执行权限。切换 SQL 已准备但未执行。密码泄露检查也被报告为关闭，需在 Auth 配置中检查。
