# Splat3D 商业化平台设计规格

> **日期**：2026-04-28
> **品牌名**：Splat3D
> **产品定位**：3D 高斯泼溅的创建、编辑与发布平台。从浏览器开始，零安装，全球可用。
> **架构方案**：SvelteKit 商业外壳 + SuperSplat 编辑器 (iframe 嵌入)
> **部署**：Cloudflare 全家桶 (Pages + Workers + R2 + KV)
> **数据库**：Neon PostgreSQL + Cloudflare Hyperdrive
> **语言**：20 种，MVP 全部上线
> **商业模式**：混合 — Phase 1 编辑+托管+发布，Phase 2 加入重建能力

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Splat3D 平台架构                          │
│                                                              │
│  用户浏览器                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │  SvelteKit 商业外壳 (Cloudflare Pages)               │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │   │
│  │  │  落地页/定价   │ │  仪表板/项目  │ │ 账户/计费    │  │   │
│  │  │  (Tailwind    │ │  管理列表     │ │ (Stripe)    │  │   │
│  │  │   + DaisyUI)  │ │              │ │             │  │   │
│  │  └──────────────┘ └──────────────┘ └─────────────┘  │   │
│  │                                                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  SuperSplat 编辑器 (iframe 嵌入)              │   │   │
│  │  │  - 定制 PCUI 主题（新配色/字体/Logo）         │   │   │
│  │  │  - 20种语言（复用 i18next）                   │   │   │
│  │  │  - postMessage API 与外壳通信                 │   │   │
│  │  │  - 项目加载/保存 → R2 存储                    │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │ API 请求                        │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cloudflare Workers (Hono 框架)                      │   │
│  │  - /api/auth/*     用户认证 (Lucia Auth)             │   │
│  │  - /api/projects/* 项目 CRUD                        │   │
│  │  - /api/files/*    R2 签名上传/下载                  │   │
│  │  - /api/billing/*  Stripe Webhook                   │   │
│  │  - /api/publish/*  一键发布                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌──────────────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Neon PostgreSQL  │ │  R2 存储  │ │  KV 缓存  │           │
│  │  (Hyperdrive连接) │ │ .ply文件  │ │  会话/限额 │           │
│  │  用户/项目/订阅   │ │          │ │           │            │
│  └──────────────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────────┘
          +
┌─────────────────────┐
│  Hetzner VPS $4/月   │
│  GLOMAP (SfM, 纯CPU)│
│  Phase 2 才需要       │
└─────────────────────┘
```

## 2. 技术栈

| 层 | 技术 | 版本/说明 |
|---|---|---|
| 前端框架 | SvelteKit | Cloudflare adapter，SSR+SSG 混合 |
| UI 组件库 | Tailwind CSS + DaisyUI | 商业外壳页面 |
| 3D 编辑器 | SuperSplat Fork (iframe) | 保持 PCUI，定制主题 |
| i18n (商业外壳) | Paraglide (Inlang) | SvelteKit 官方推荐，编译时 i18n |
| i18n (编辑器) | i18next | 已有，扩展到 20 种语言 |
| 后端 API | Hono | Workers 原生框架 |
| 数据库 | Neon PostgreSQL | 通过 Cloudflare Hyperdrive 连接 |
| ORM | Drizzle ORM (postgres 驱动) | 类型安全，Neon 原生支持 |
| 认证 | Lucia Auth | 轻量，Workers 兼容 |
| OAuth 提供商 | Google + GitHub | 覆盖主流用户群 |
| 支付 | Stripe | 全球支付，Webhook 通过 Workers 接收 |
| 对象存储 | Cloudflare R2 | 存储 .ply/.spz 文件，零出口费 |
| 缓存 | Cloudflare KV | 会话、使用量限额 |
| 部署 | Cloudflare Pages | 全球 300+ 边缘节点 |

## 3. 20 种语言

### 语言清单

| # | 语言 | 代码 | 编辑器状态 | 商业外壳 | 特殊处理 |
|---|------|------|----------|---------|---------|
| 1 | 英语 | en | 已有 | 新建 | 基础语言 |
| 2 | 简体中文 | zh-CN | 已有 | 新建 | — |
| 3 | 日语 | ja | 已有 | 新建 | — |
| 4 | 韩语 | ko | 已有 | 新建 | — |
| 5 | 西班牙语 | es | 已有 | 新建 | — |
| 6 | 德语 | de | 已有 | 新建 | — |
| 7 | 法语 | fr | 已有 | 新建 | — |
| 8 | 葡萄牙语(巴西) | pt-BR | 已有 | 新建 | — |
| 9 | 俄语 | ru | 已有 | 新建 | — |
| 10 | 繁体中文 | zh-TW | 新增 | 新建 | — |
| 11 | 意大利语 | it | 新增 | 新建 | — |
| 12 | 土耳其语 | tr | 新增 | 新建 | — |
| 13 | 阿拉伯语 | ar | 新增 | 新建 | RTL 布局 |
| 14 | 印地语 | hi | 新增 | 新建 | — |
| 15 | 波兰语 | pl | 新增 | 新建 | — |
| 16 | 荷兰语 | nl | 新增 | 新建 | — |
| 17 | 泰语 | th | 新增 | 新建 | — |
| 18 | 越南语 | vi | 新增 | 新建 | — |
| 19 | 印尼语 | id | 新增 | 新建 | — |
| 20 | 瑞典语 | sv | 新增 | 新建 | — |

### 翻译策略

- 编辑器：约 280 个键，11 种新语言用 AI 翻译生成 JSON 文件
- 商业外壳：约 200-300 个键（落地页、仪表板、定价页等），20 种语言全部用 AI 翻译
- 阿拉伯语 RTL：在 CSS 中使用 logical properties（`margin-inline-start` 代替 `margin-left`），HTML 根元素添加 `dir="rtl"`
- 后续校对：通过 Crowdin 社区平台收集母语者反馈

### 语言切换

- 编辑器：在菜单栏「帮助」旁新增「语言」下拉菜单
- 商业外壳：顶栏/底栏语言选择器
- 检测顺序：URL 参数 → Cookie → `navigator.language` → 默认英语
- URL 格式：`splat3d.com/ja/pricing`（多语言路由前缀）

## 4. 编辑器 UI 定制

### 修改范围（低侵入）

所有定制通过 SCSS 变量覆盖 + 少量代码修改完成，不重写组件：

| 文件 | 修改内容 |
|------|---------|
| `src/ui/scss/colors.scss` | 品牌色变量替换 |
| `src/ui/scss/style.scss` | 字体、全局间距 |
| `src/ui/scss/splat3d-theme.scss` | **新增** 品牌主题覆盖层 |
| `src/ui/localization.ts` | `supportedLngs` 扩展到 20 种 |
| `src/ui/menu.ts` | 新增语言切换菜单项 |
| `src/ui/about-popup.ts` | 替换品牌信息（Splat3D 替代 PlayCanvas） |
| `src/iframe-api.ts` | 扩展 postMessage API |

### 品牌定制要点

- Logo：替换 `playcanvas-logo.png` 为 Splat3D logo
- 版本标签：`SUPERSPLAT v2.x` → `SPLAT3D v1.x`
- 配色：新品牌主色调（待定，建议渐变蓝-紫，传达科技感和3D空间感）
- 字体：Inter（UI通用）或 Plus Jakarta Sans（更现代）
- 水印：免费用户导出/发布时添加 "Made with Splat3D" 水印

## 5. 商业平台页面结构

### SvelteKit 路由

```
src/routes/
├── (marketing)/              ← 营销页面组（不需要登录）
│   ├── +page.svelte          ← 落地页（首页）
│   ├── pricing/+page.svelte  ← 定价页
│   └── features/+page.svelte ← 功能介绍
│
├── (auth)/                   ← 认证页面组
│   ├── login/+page.svelte    ← 登录（OAuth: Google/GitHub）
│   ├── register/+page.svelte ← 注册
│   └── callback/+server.ts   ← OAuth 回调
│
├── (app)/                    ← 应用页面组（需要登录）
│   ├── dashboard/            ← 项目仪表板（项目卡片列表）
│   ├── projects/[id]/        ← 项目详情（嵌入编辑器 iframe）
│   ├── account/              ← 账户设置（语言、头像、密码）
│   ├── billing/              ← 订阅管理（Stripe Customer Portal）
│   └── publish/[id]/         ← 发布管理（链接、嵌入代码、统计）
│
├── editor/                   ← SuperSplat 编辑器（独立部署，iframe 源）
│
├── view/[slug]/              ← 公开查看页（分享链接 splat3d.com/view/abc123）
│
└── api/                      ← API 路由 (Workers)
    ├── auth/
    ├── projects/
    ├── files/
    ├── billing/
    └── publish/
```

### 关键页面设计

**落地页**：
- Hero 区域：3D 泼溅演示 + 一句话价值主张 + CTA 按钮
- 功能展示：3-4 个核心功能卡片（编辑、发布、分享、多语言）
- 定价预览：Free / Pro / Business 三栏
- 客户案例 / 社会证明
- Footer：语言选择器、链接

**仪表板**：
- 项目卡片网格布局
- 每个卡片：缩略图 + 项目名 + 创建时间 + 查看次数
- 右上角：新建项目按钮 + 上传 .ply 文件
- 搜索/筛选功能

**编辑器页面**：
- 全屏 iframe 嵌入 SuperSplat 编辑器
- 顶部窄条：返回仪表板 + 项目名 + 保存/发布按钮
- iframe 通过 postMessage 与顶部条通信

## 6. 数据库 Schema

```sql
-- 用户表
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT UNIQUE NOT NULL,
  name           TEXT,
  avatar_url     TEXT,
  provider       TEXT NOT NULL,       -- 'google' | 'github'
  provider_id    TEXT NOT NULL,
  plan           TEXT DEFAULT 'free', -- 'free' | 'pro' | 'business'
  locale         TEXT DEFAULT 'en',
  storage_used   BIGINT DEFAULT 0,    -- 已用存储字节数
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  file_key       TEXT,                -- R2 中的文件路径
  file_size      BIGINT DEFAULT 0,
  file_format    TEXT,                -- 'ply' | 'splat' | 'spz'
  thumbnail_key  TEXT,                -- R2 中的缩略图路径
  is_published   BOOLEAN DEFAULT false,
  publish_slug   TEXT UNIQUE,         -- 公开访问短链
  view_count     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅表
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                  TEXT NOT NULL,  -- 'pro' | 'business'
  status                TEXT NOT NULL,  -- 'active' | 'canceled' | 'past_due'
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 会话表（Lucia Auth）
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 发布统计表
CREATE TABLE publish_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ DEFAULT NOW(),
  country     TEXT,
  referer     TEXT
);
```

## 7. iframe 通信协议 (postMessage API)

### 商业外壳 → 编辑器

| 消息类型 | 数据 | 说明 |
|---------|------|------|
| `load` | `{ url: string }` | 从 R2 签名 URL 加载项目文件 |
| `setLang` | `{ lang: string }` | 切换编辑器语言 |
| `setBrand` | `{ logo: string, watermark: boolean, name: string }` | 设置品牌信息 |
| `getExport` | `{ format: 'ply' \| 'splat' \| 'spz' }` | 请求导出文件 |

### 编辑器 → 商业外壳

| 消息类型 | 数据 | 说明 |
|---------|------|------|
| `ready` | `{}` | 编辑器加载完成 |
| `save` | `{ blob: Blob, format: string }` | 保存项目到 R2 |
| `dirty` | `{ isDirty: boolean }` | 有未保存更改 |
| `export` | `{ blob: Blob, format: string }` | 导出文件响应 |
| `thumbnail` | `{ dataUrl: string }` | 生成缩略图 |

## 8. 定价方案

| 层级 | 月价 | 年价 | 项目数 | 存储 | AI重建 | 水印 |
|------|------|------|--------|------|--------|------|
| Free | $0 | $0 | 3 | 1GB | 不含 | 有 |
| Pro | $15/月 | $144/年 | 无限 | 50GB | 50次/月 | 无 |
| Business | $39/月 | $374/年 | 无限 | 500GB | 200次/月 | 无+白标 |
| Enterprise | 定制 | 定制 | 无限 | 无限 | 无限 | 完全定制 |

## 9. 实施阶段

### Phase 1（第 1-4 周）：基础搭建

| 周 | 任务 | 产出 |
|---|---|---|
| W1 | Fork SuperSplat + 品牌主题定制 + 20种语言翻译文件生成 | 定制版编辑器 |
| W2 | SvelteKit 项目初始化 + Cloudflare 部署 + Neon PG + Drizzle schema | 技术骨架 |
| W3 | OAuth 登录(Google/GitHub) + Lucia Auth + 用户表 + 基础 API | 认证系统 |
| W4 | 项目仪表板 + R2 文件上传/下载 + iframe 嵌入编辑器 + postMessage | 核心工作流 |

### Phase 2（第 5-8 周）：商业化功能

| 周 | 任务 | 产出 |
|---|---|---|
| W5 | Stripe 集成 + 订阅管理 + 定价页 + Stripe Customer Portal | 支付系统 |
| W6 | 一键发布 + 公开查看页(view/[slug]) + 嵌入代码生成 + 查看统计 | 发布系统 |
| W7 | 落地页设计+实现 + SEO + 多语言营销页 | 营销站点 |
| W8 | 端到端测试 + Bug修复 + 性能优化 + 正式上线 | **MVP 上线** |

### Phase 3（第 9-12 周）：增长功能

| 周 | 任务 | 产出 |
|---|---|---|
| W9-10 | 水印系统 + 免费/Pro 功能门控 + 使用量限额 + 存储统计 | 转化驱动 |
| W11-12 | Hetzner VPS + GLOMAP SfM 服务 + 照片上传→重建管线 | 端到端重建 |

## 10. 起步成本

| 组件 | 服务商 | 月成本 |
|------|-------|--------|
| 前端+Workers | Cloudflare Pages+Workers | $5 |
| 对象存储 | Cloudflare R2 | $0-4 |
| CDN | Cloudflare (内含) | $0 |
| 数据库 | Neon PostgreSQL (免费层) | $0 |
| 连接池 | Cloudflare Hyperdrive | $0 |
| 缓存 | Cloudflare KV | $0 |
| 域名 | splat3d.com 或 .io | ~$1/月 |
| **总计** | | **~$6-10/月** |

Phase 2 加入 SfM 后增加 Hetzner VPS $4/月，总计 ~$10-14/月。

## 11. 关键风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| iframe 跨域通信复杂 | 开发延迟 | postMessage API 设计清晰，提前定义协议 |
| SuperSplat 上游破坏性更新 | 合并冲突 | 最小化代码修改，主要用 SCSS 覆盖 |
| Neon 免费层限制 | 数据库性能 | 0.5GB 足够起步，增长后升级 $19/月 |
| 阿拉伯语 RTL 布局 | 开发时间 | PCUI 使用 flexbox，CSS logical properties 可覆盖大部分 |
| 独立开发者瓶颈 | 进度慢 | AI 辅助开发，优先核心功能，非核心延后 |
