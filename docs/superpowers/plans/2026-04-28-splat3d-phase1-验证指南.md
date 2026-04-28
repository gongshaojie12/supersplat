# Splat3D Phase 1 端到端验证指南

> **日期**：2026-04-28
> **状态**：所有实现任务已完成，待手动验证

---

## 1. 环境准备

### 1.1 编辑器（SuperSplat）

```bash
cd D:/project/supersplat
npm install
npm run build
```

预期：Rollup 构建成功，`dist/` 目录包含定制后的编辑器文件。

### 1.2 商业外壳（splat3d-web）

```bash
cd D:/project/splat3d-web
npm run build
```

预期：SvelteKit + Cloudflare adapter 构建成功（已验证通过）。

---

## 2. 启动本地开发服务

在两个终端分别运行：

**终端 1 — 编辑器**：

```bash
cd D:/project/supersplat
npm run develop
```

默认地址：`http://localhost:3000`

**终端 2 — 商业外壳**：

```bash
cd D:/project/splat3d-web
npm run dev
```

默认地址：`http://localhost:5173`

---

## 3. 验证清单

### 3.1 编辑器品牌定制

| # | 验证项 | 预期结果 | 通过 |
|---|--------|---------|------|
| 1 | 右下角版本标签 | 显示 `SPLAT3D v2.24.5` | ☐ |
| 2 | 高亮配色 | 靛蓝色 `#6366f1`（非橙色） | ☐ |
| 3 | 字体 | Inter 字体族 | ☐ |
| 4 | 关于弹窗 | 标题显示 `Splat3D` | ☐ |
| 5 | 浏览器标签页 | 标题为 `Splat3D - 3D Gaussian Splat Editor` | ☐ |
| 6 | 控制台日志 | 输出 `Splat3D v2.24.5 (based on SuperSplat)` | ☐ |

### 3.2 多语言支持（20 种语言）

| # | 验证项 | 预期结果 | 通过 |
|---|--------|---------|------|
| 7 | 菜单栏语言菜单 | 菜单栏出现 `Language` 菜单项 | ☐ |
| 8 | 语言列表 | 点击后显示 20 种语言，各语言以母语名称显示 | ☐ |
| 9 | 当前语言标记 | 当前语言旁有 ✓ 标记 | ☐ |
| 10 | 切换语言 | 选择「简体中文」后页面刷新，UI 文本变为中文 | ☐ |
| 11 | 切换日语 | 选择「日本語」后 UI 文本变为日语 | ☐ |

### 3.3 商业外壳页面

| # | 验证项 | 预期结果 | 通过 |
|---|--------|---------|------|
| 12 | 落地页渲染 | Hero 区域显示渐变标题 + CTA 按钮 | ☐ |
| 13 | 导航栏品牌 | 左侧显示渐变色 `Splat3D` 品牌名 | ☐ |
| 14 | 导航栏链接 | 包含 Pricing 链接；未登录时显示 Sign In 按钮 | ☐ |
| 15 | 页脚 | 显示版权信息和 Open Source 链接 | ☐ |
| 16 | 定价页 | `/pricing` 显示 Free / Pro / Business 三栏定价 | ☐ |
| 17 | 定价卡片 | Pro 卡片高亮显示 `Most Popular` 徽标 | ☐ |
| 18 | 登录页 | `/login` 显示 Google 和 GitHub OAuth 按钮 | ☐ |

### 3.4 认证流程（需配置 OAuth 密钥后测试）

> 需要在 `wrangler.toml` 或环境变量中配置 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 和 `DATABASE_URL`。

| # | 验证项 | 预期结果 | 通过 |
|---|--------|---------|------|
| 19 | Google 登录 | 点击后跳转 Google OAuth 授权页 | ☐ |
| 20 | GitHub 登录 | 点击后跳转 GitHub OAuth 授权页 | ☐ |
| 21 | OAuth 回调 | 授权后回调创建用户并跳转 `/dashboard` | ☐ |
| 22 | 仪表板 | 登录后显示项目列表（空状态提示） | ☐ |
| 23 | 导航栏头像 | 登录后右上角显示用户头像/首字母 | ☐ |
| 24 | 登出 | 点击 Logout 后清除会话，跳转首页 | ☐ |

### 3.5 项目工作流（需配置数据库和 R2 后测试）

| # | 验证项 | 预期结果 | 通过 |
|---|--------|---------|------|
| 25 | 新建项目 | 点击 `+ New Project` 弹出模态框，输入名称创建 | ☐ |
| 26 | 项目跳转 | 创建后跳转 `/projects/[id]` 编辑器页面 | ☐ |
| 27 | 编辑器 iframe | 页面嵌入 SuperSplat 编辑器 iframe | ☐ |
| 28 | 顶部操作条 | 显示返回 Dashboard 按钮 + 项目名 + Save 按钮 | ☐ |
| 29 | 项目卡片 | 仪表板显示已创建项目的卡片（名称、日期、浏览数） | ☐ |

---

## 4. 已完成任务总览

### 编辑器仓库（D:\project\supersplat）— 6 个 Commit

| Commit | 任务 | 说明 |
|--------|------|------|
| 2509da2 | Task 1.1 | SCSS 品牌主题（配色 + 字体 + 主题覆盖层） |
| cec8b55 | Task 1.2 | 品牌标签替换（SUPERSPLAT → SPLAT3D） |
| 280fb90 | Task 2.1 | 11 种新语言翻译文件（281 键 × 11 种语言） |
| fff3ea0 | Task 2.2 | supportedLngs 扩展到 20 种语言 |
| 8bdab58 | Task 2.3 | 语言切换菜单（20 种语言母语名称 + 切换功能） |
| de5dccf | Task 3 | iframe postMessage API 扩展（splat3d: 前缀） |

### 商业外壳仓库（D:\project\splat3d-web）— 10 个 Commit

| Commit | 任务 | 说明 |
|--------|------|------|
| 88bc737 | Task 4.1 | SvelteKit + Cloudflare + Tailwind + DaisyUI 项目骨架 |
| a12ca64 | Task 4.2 | Drizzle ORM schema（users/sessions/projects/subscriptions） |
| db5a2e3 | Task 4.3 | Lucia Auth + Google/GitHub OAuth 登录 |
| cfd90ea | Task 4.4 | 公共布局、导航栏、页脚组件 |
| 2ff66e1 | Task 4.5 | 落地页 + 定价页 |
| cad3897 | Task 4.6 | 项目仪表板 + 项目卡片组件 |
| 12fccfd | Task 4.7 | 项目 CRUD API（创建/列出） |
| f90a3f2 | Task 4.8 | R2 文件上传/下载 API |
| a08b856 | Task 4.9 | 编辑器 iframe 嵌入页面（含 postMessage 通信） |
| a802fab | Task 4.10 | 登出 API 路由 |

---

## 5. 后续配置要求

在进行完整验证前，需要准备以下外部服务：

| 服务 | 配置项 | 用途 |
|------|--------|------|
| Neon PostgreSQL | `DATABASE_URL` | 数据库连接（需先运行 Drizzle 迁移） |
| Google OAuth | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google 登录 |
| GitHub OAuth | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub 登录 |
| Cloudflare R2 | `R2_BUCKET`（wrangler.toml 已配置） | 文件存储 |

### 数据库迁移

```bash
cd D:/project/splat3d-web
npx drizzle-kit generate
npx drizzle-kit push
```
