# Splat3D Phase 1 实施计划：基础搭建（第 1-4 周）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将开源 SuperSplat 编辑器 Fork 并品牌化为 Splat3D，扩展到 20 种语言，搭建 SvelteKit 商业外壳，完成 OAuth 登录、项目管理、R2 存储和 iframe 通信的核心工作流。

**架构：** SvelteKit 商业外壳（Cloudflare Pages）+ 定制 SuperSplat 编辑器（iframe 嵌入），通过 postMessage API 通信。后端使用 Hono + Cloudflare Workers，数据库使用 Neon PostgreSQL + Drizzle ORM。

**技术栈：** SvelteKit 2 / Tailwind CSS + DaisyUI / Hono / Drizzle ORM / Neon PostgreSQL / Lucia Auth / Cloudflare (Pages + Workers + R2 + KV) / i18next / Paraglide

---

## 文件结构

Phase 1 涉及两个独立项目：

### 1. SuperSplat 编辑器（当前仓库，定制化）

```
src/
├── iframe-api.ts              ← 修改：扩展 postMessage API
├── ui/
│   ├── localization.ts        ← 修改：supportedLngs 扩展到 20 种
│   ├── editor.ts              ← 修改：品牌标签 SUPERSPLAT → SPLAT3D
│   ├── about-popup.ts         ← 修改：品牌信息替换
│   ├── menu.ts                ← 修改：新增语言切换菜单项
│   └── scss/
│       ├── colors.scss        ← 修改：品牌色变量
│       ├── style.scss         ← 修改：字体引入
│       └── splat3d-theme.scss ← 新建：品牌主题覆盖层
├── index.ts                   ← 修改：控制台品牌信息
├── index.html                 ← 修改：title 和 meta 信息
static/
└── locales/
    ├── en.json                ← 已有（280 键）
    ├── zh-CN.json             ← 已有
    ├── ... (已有 9 种)
    ├── zh-TW.json             ← 新建
    ├── it.json                ← 新建
    ├── tr.json                ← 新建
    ├── ar.json                ← 新建
    ├── hi.json                ← 新建
    ├── pl.json                ← 新建
    ├── nl.json                ← 新建
    ├── th.json                ← 新建
    ├── vi.json                ← 新建
    ├── id.json                ← 新建
    └── sv.json                ← 新建
```

### 2. Splat3D 商业外壳（新项目）

```
splat3d-web/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.ts
├── wrangler.toml
├── drizzle.config.ts
├── drizzle/
│   └── schema.ts              ← Drizzle ORM schema
├── src/
│   ├── app.html
│   ├── app.css
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts          ← Neon PG 连接
│   │   │   ├── auth.ts        ← Lucia Auth 配置
│   │   │   └── r2.ts          ← R2 存储操作
│   │   ├── i18n/
│   │   │   ├── index.ts       ← Paraglide 配置
│   │   │   └── messages/      ← 20 种语言翻译文件
│   │   ├── components/
│   │   │   ├── Navbar.svelte
│   │   │   ├── Footer.svelte
│   │   │   ├── ProjectCard.svelte
│   │   │   └── LanguageSelector.svelte
│   │   └── stores/
│   │       └── user.ts
│   └── routes/
│       ├── +layout.svelte
│       ├── +layout.server.ts
│       ├── +page.svelte                   ← 落地页
│       ├── pricing/+page.svelte           ← 定价页
│       ├── login/+page.svelte             ← 登录
│       ├── login/google/+server.ts        ← Google OAuth
│       ├── login/github/+server.ts        ← GitHub OAuth
│       ├── login/google/callback/+server.ts
│       ├── login/github/callback/+server.ts
│       ├── dashboard/+page.svelte         ← 项目仪表板
│       ├── dashboard/+page.server.ts
│       ├── projects/[id]/+page.svelte     ← 编辑器页面（iframe）
│       ├── projects/[id]/+page.server.ts
│       ├── api/projects/+server.ts        ← 项目 CRUD API
│       ├── api/files/upload/+server.ts    ← R2 签名上传
│       └── api/files/download/+server.ts  ← R2 签名下载
└── static/
    └── favicon.svg
```

---

## Task 1: 编辑器品牌定制

### Task 1.1: SCSS 品牌主题

**文件:**
- 修改: `src/ui/scss/colors.scss`
- 新建: `src/ui/scss/splat3d-theme.scss`
- 修改: `src/ui/scss/style.scss`

- [ ] **Step 1: 修改品牌色变量**

编辑 `src/ui/scss/colors.scss`，将高亮色从橙色改为蓝紫渐变品牌色：

```scss
@use 'pcui-theme-grey.scss' as theme;

$text-primary: theme.$text-primary;
$text-secondary: theme.$text-secondary;
$text-dark: theme.$text-dark;
$text-darkest: theme.$text-darkest;

$error: theme.$error;

$clr-default: #b3aaac;
$clr-disabled: #7c7678;
$clr-active: white;
$clr-hilight: #6366f1;
$clr-icon-hilight: #818cf8;

$bcg-lighter: #3f3f46;
$bcg-light: #52525b;
$bcg-primary: theme.$bcg-primary;
$bcg-dark: theme.$bcg-dark;
$bcg-darker: theme.$bcg-darker;
$bcg-darkest: #18181b;

// darken amount when showing modal dialogs
$bcg-darken: rgba(0, 0, 0, 0.25);
```

- [ ] **Step 2: 创建品牌主题覆盖层**

新建 `src/ui/scss/splat3d-theme.scss`：

```scss
@use 'colors.scss' as *;

// Splat3D 品牌字体
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

// 全局字体覆盖
* {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

// 品牌版本标签样式
#app-label {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

// 菜单栏高亮状态
.menu-option:hover {
    color: $clr-hilight !important;
}

// 滚动条品牌色
::-webkit-scrollbar-thumb:hover {
    background: $clr-hilight;
}

// 选中状态的工具栏按钮
#coord-space-toggle.active {
    background-color: $bcg-dark !important;
    color: $clr-hilight;
}
```

- [ ] **Step 3: 在 style.scss 中引入品牌主题**

编辑 `src/ui/scss/style.scss`，在最后一行 `@use 'tool.scss';` 后添加：

```scss
@use 'splat3d-theme.scss';
```

同时修改字体类，将 Proxima Nova 替换为 Inter：

```scss
.font-thin {
    font-family: 'Inter', 'Helvetica Neue', Arial, Helvetica, sans-serif;
    font-weight: 300;
    font-style: normal;
}

.font-light {
    font-family: 'Inter', 'Helvetica Neue', Arial, Helvetica, sans-serif;
    font-weight: 300;
    font-style: normal;
}

.font-regular {
    font-family: 'Inter', 'Helvetica Neue', Arial, Helvetica, sans-serif;
    font-weight: normal;
    font-style: normal;
}

.font-bold {
    font-family: 'Inter', 'Helvetica Neue', Arial, Helvetica, sans-serif;
    font-weight: 600;
    font-style: normal;
}
```

- [ ] **Step 4: 构建并验证样式更改**

运行:
```bash
npm install
npm run build
```
预期: 构建成功，`dist/index.css` 中包含新的品牌色和字体

- [ ] **Step 5: 提交**

```bash
git add src/ui/scss/colors.scss src/ui/scss/splat3d-theme.scss src/ui/scss/style.scss
git commit -m "feat: 添加 Splat3D 品牌主题 - 蓝紫色调 + Inter 字体"
```

---

### Task 1.2: 品牌标签和元信息替换

**文件:**
- 修改: `src/ui/editor.ts:78-79`
- 修改: `src/ui/about-popup.ts:78-79`
- 修改: `src/index.ts:11`
- 修改: `src/index.html:4,10`

- [ ] **Step 1: 修改编辑器版本标签**

编辑 `src/ui/editor.ts`，将第 78-79 行的 `SUPERSPLAT` 改为 `SPLAT3D`：

```typescript
// 原来:
const appLabel = new Label({
    id: 'app-label',
    text: `SUPERSPLAT v${version}`
});

// 改为:
const appLabel = new Label({
    id: 'app-label',
    text: `SPLAT3D v${version}`
});
```

- [ ] **Step 2: 修改关于弹窗品牌信息**

编辑 `src/ui/about-popup.ts`：

将第 79 行的 `text: 'SuperSplat'` 改为 `text: 'Splat3D'`。

将第 66-68 行和第 74-75 行的 GitHub 链接保留不变（仍指向原始仓库以致谢上游）。

- [ ] **Step 3: 修改控制台输出品牌**

编辑 `src/index.ts` 第 11 行：

```typescript
// 原来:
console.log(`SuperSplat v${appVersion} | SplatTransform v${stVersion} (${stRevision}) | Engine v${engineVersion} (${engineRevision}) | PCUI v${pcuiVersion} (${pcuiRevision})`);

// 改为:
console.log(`Splat3D v${appVersion} (based on SuperSplat) | SplatTransform v${stVersion} (${stRevision}) | Engine v${engineVersion} (${engineRevision}) | PCUI v${pcuiVersion} (${pcuiRevision})`);
```

- [ ] **Step 4: 修改 HTML 标题和描述**

编辑 `src/index.html`：

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Splat3D - 3D Gaussian Splat Editor</title>
        <meta charset="utf-8" />
        <base href="__BASE_HREF__">
        <link rel="manifest" href="./manifest.json">
        <link rel="stylesheet" href="./index.css">
        <link rel="shortcut icon" href="#">
        <meta name="description" content="Splat3D is a browser-based platform for creating, editing and publishing 3D Gaussian Splats. Powered by SuperSplat." />
        <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0" />

        <!-- Service worker -->
        <script>
            const sw = navigator.serviceWorker;
            if (sw) {
                sw.register('./sw.js')
                    .then(reg => console.log('service worker registered', reg))
                    .catch(err => console.log('failed to register service worker', err));
            }
        </script>
    </head>

    <body>
        <script type="module" src="./index.js"></script>
    </body>
</html>
```

- [ ] **Step 5: 构建并验证**

运行:
```bash
npm run build
```
预期: 构建成功，`dist/index.html` 中的 title 为 "Splat3D - 3D Gaussian Splat Editor"

- [ ] **Step 6: 提交**

```bash
git add src/ui/editor.ts src/ui/about-popup.ts src/index.ts src/index.html
git commit -m "feat: 替换品牌标识 SuperSplat → Splat3D"
```

---

## Task 2: 20 种语言翻译文件

### Task 2.1: 生成 11 种新语言翻译文件

**文件:**
- 新建: `static/locales/zh-TW.json`
- 新建: `static/locales/it.json`
- 新建: `static/locales/tr.json`
- 新建: `static/locales/ar.json`
- 新建: `static/locales/hi.json`
- 新建: `static/locales/pl.json`
- 新建: `static/locales/nl.json`
- 新建: `static/locales/th.json`
- 新建: `static/locales/vi.json`
- 新建: `static/locales/id.json`
- 新建: `static/locales/sv.json`

> **说明：** 每个文件包含与 `en.json` 相同的 ~280 个键，值为对应语言的翻译。因篇幅限制，此处展示每个文件的前 15 个键作为示例。实际实现时，用 AI 翻译工具基于 `en.json` 生成完整文件。

- [ ] **Step 1: 创建翻译脚本**

新建 `scripts/generate-translations.ts`（一次性使用的辅助脚本）：

```typescript
import fs from 'fs';
import path from 'path';

const enJson = JSON.parse(fs.readFileSync('static/locales/en.json', 'utf-8'));
const keys = Object.keys(enJson);

const targetLangs = ['zh-TW', 'it', 'tr', 'ar', 'hi', 'pl', 'nl', 'th', 'vi', 'id', 'sv'];

// 这个脚本的输出模板 - 实际翻译需要通过 AI 翻译 API 或手动翻译完成
for (const lang of targetLangs) {
    const outputPath = path.join('static/locales', `${lang}.json`);
    if (!fs.existsSync(outputPath)) {
        // 创建占位文件，键与 en.json 相同，值标注待翻译
        const placeholder: Record<string, string> = {};
        for (const key of keys) {
            placeholder[key] = `[${lang}] ${enJson[key]}`;
        }
        fs.writeFileSync(outputPath, JSON.stringify(placeholder, null, 4) + '\n', 'utf-8');
        console.log(`Created: ${outputPath}`);
    }
}
```

运行:
```bash
npx tsx scripts/generate-translations.ts
```
预期: 在 `static/locales/` 下生成 11 个新的 JSON 文件

- [ ] **Step 2: 用 AI 翻译替换占位文本**

对每个语言文件，使用 Claude/GPT API 将 `en.json` 翻译为目标语言。翻译时的注意事项：

- 保持所有键名不变
- 技术术语保持英文（如 PLY, Splat, SOG, SH Bands, WebM）
- 菜单项应简洁（通常 1-3 个词）
- 快捷键名称保持英文（Ctrl, Shift, Alt）

以 `static/locales/zh-TW.json` 为例（前 20 键）：

```json
{
    "menu.file": "檔案",
    "menu.file.new": "新建",
    "menu.file.open": "開啟",
    "menu.file.open-recent": "最近開啟",
    "menu.file.open-recent.clear": "清除最近記錄",
    "menu.file.import": "匯入",
    "menu.file.save": "儲存",
    "menu.file.save-as": "另存新檔",
    "menu.file.publish": "發布",
    "menu.file.export": "匯出",
    "menu.file.export.ply": "PLY (.ply)",
    "menu.file.export.splat": "Splat (.splat)",
    "menu.file.export.sog": "SOG (.sog)",
    "menu.file.export.viewer": "檢視器應用",
    "menu.select": "選取",
    "menu.select.all": "全選",
    "menu.select.none": "取消選取",
    "menu.select.invert": "反轉選取",
    "menu.select.lock": "鎖定選取",
    "menu.select.unlock": "解鎖全部"
}
```

以 `static/locales/it.json` 为例（前 20 键）：

```json
{
    "menu.file": "File",
    "menu.file.new": "Nuovo",
    "menu.file.open": "Apri",
    "menu.file.open-recent": "Apri Recente",
    "menu.file.open-recent.clear": "Cancella Recenti",
    "menu.file.import": "Importa",
    "menu.file.save": "Salva",
    "menu.file.save-as": "Salva con Nome",
    "menu.file.publish": "Pubblica",
    "menu.file.export": "Esporta",
    "menu.file.export.ply": "PLY (.ply)",
    "menu.file.export.splat": "Splat (.splat)",
    "menu.file.export.sog": "SOG (.sog)",
    "menu.file.export.viewer": "App Visualizzatore",
    "menu.select": "Seleziona",
    "menu.select.all": "Tutto",
    "menu.select.none": "Nessuno",
    "menu.select.invert": "Inverti",
    "menu.select.lock": "Blocca Selezione",
    "menu.select.unlock": "Sblocca Tutto"
}
```

对剩余 9 种语言（tr, ar, hi, pl, nl, th, vi, id, sv）重复相同流程。每个文件必须包含完整的 280 个键。

- [ ] **Step 3: 验证所有翻译文件的键完整性**

新建 `scripts/validate-translations.ts`：

```typescript
import fs from 'fs';
import path from 'path';

const localesDir = 'static/locales';
const enJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf-8'));
const enKeys = new Set(Object.keys(enJson));

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
let hasError = false;

for (const file of files) {
    const langJson = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'));
    const langKeys = new Set(Object.keys(langJson));

    const missing = [...enKeys].filter(k => !langKeys.has(k));
    const extra = [...langKeys].filter(k => !enKeys.has(k));

    if (missing.length > 0) {
        console.error(`${file}: 缺少 ${missing.length} 个键: ${missing.slice(0, 5).join(', ')}...`);
        hasError = true;
    }
    if (extra.length > 0) {
        console.warn(`${file}: 多出 ${extra.length} 个键: ${extra.slice(0, 5).join(', ')}...`);
    }
}

if (!hasError) {
    console.log(`✓ 所有 ${files.length} 个语言文件的键都完整`);
} else {
    process.exit(1);
}
```

运行:
```bash
npx tsx scripts/validate-translations.ts
```
预期: `✓ 所有 20 个语言文件的键都完整`

- [ ] **Step 4: 提交**

```bash
git add static/locales/ scripts/
git commit -m "feat: 添加 11 种新语言翻译文件（共 20 种语言）"
```

---

### Task 2.2: 扩展 localization.ts 支持 20 种语言

**文件:**
- 修改: `src/ui/localization.ts:16`

- [ ] **Step 1: 修改 supportedLngs 数组**

编辑 `src/ui/localization.ts`，将第 16 行的 `supportedLngs` 扩展为 20 种：

```typescript
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const localizeInit = () => {
    return i18next
    .use(Backend)
    .use(LanguageDetector)
    .init({
        detection: {
            order: ['querystring', 'navigator', 'htmlTag']
        },
        backend: {
            loadPath: './static/locales/{{lng}}.json'
        },
        supportedLngs: [
            'ar', 'de', 'en', 'es', 'fr', 'hi', 'id', 'it', 'ja',
            'ko', 'nl', 'pl', 'pt-BR', 'ru', 'sv', 'th', 'tr',
            'vi', 'zh-CN', 'zh-TW'
        ],
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });
};

interface LocalizeOptions {
    ellipsis?: boolean;
}

const localize = (key: string, options?: LocalizeOptions): string => {
    let text = i18next.t(key);

    if (options?.ellipsis) text += '...';

    return text;
};

const getLocale = (): string => {
    return i18next.language || 'en';
};

const formatInteger = (value: number): string => {
    return new Intl.NumberFormat(getLocale(), {
        maximumFractionDigits: 0
    }).format(Math.round(value));
};

export { localizeInit, localize, formatInteger };
export type { LocalizeOptions };
```

- [ ] **Step 2: 构建验证**

运行:
```bash
npm run build
```
预期: 构建成功

- [ ] **Step 3: 提交**

```bash
git add src/ui/localization.ts
git commit -m "feat: 扩展 i18next supportedLngs 到 20 种语言"
```

---

### Task 2.3: 编辑器内语言切换菜单

**文件:**
- 修改: `src/ui/menu.ts`
- 修改: `static/locales/en.json`（添加语言菜单键）

- [ ] **Step 1: 在 en.json 中添加语言菜单键**

在 `static/locales/en.json` 末尾（`"tooltip.status-bar.splat-data"` 之后）添加：

```json
{
    "...existing keys...": "...",
    "tooltip.status-bar.splat-data": "Toggle Splat Data Panel",
    "menu.language": "Language",
    "menu.language.current": "Current: {{lang}}"
}
```

同步到所有其他 19 个语言文件中，翻译 `menu.language` 和 `menu.language.current`。例如 `zh-CN.json` 添加：
```json
{
    "menu.language": "语言",
    "menu.language.current": "当前: {{lang}}"
}
```

- [ ] **Step 2: 在菜单栏添加语言选择菜单**

编辑 `src/ui/menu.ts`，在文件顶部添加 i18next 导入：

```typescript
import i18next from 'i18next';
```

在 `help` Label 定义（约第 85 行）之后添加语言 Label：

```typescript
const language = new Label({
    text: localize('menu.language'),
    class: 'menu-option'
});
```

在 `buttonsContainer.append(help);` 之后（约第 116 行）添加：

```typescript
buttonsContainer.append(language);
```

在 `helpMenuPanel` 定义之后（约第 324 行之后）添加语言菜单面板：

```typescript
const languageNames: Record<string, string> = {
    'ar': 'العربية',
    'de': 'Deutsch',
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'hi': 'हिन्दी',
    'id': 'Bahasa Indonesia',
    'it': 'Italiano',
    'ja': '日本語',
    'ko': '한국어',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'pt-BR': 'Português (BR)',
    'ru': 'Русский',
    'sv': 'Svenska',
    'th': 'ไทย',
    'tr': 'Türkçe',
    'vi': 'Tiếng Việt',
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文'
};

const languageMenuItems: MenuItem[] = Object.entries(languageNames).map(([code, name]) => ({
    text: name,
    extra: i18next.language === code ? '✓' : '',
    onSelect: () => {
        i18next.changeLanguage(code).then(() => {
            window.location.reload();
        });
    }
}));

const languageMenuPanel = new MenuPanel(languageMenuItems);
```

在 `this.append(helpMenuPanel);` 之后添加：

```typescript
this.append(languageMenuPanel);
```

在 `options` 数组中添加语言菜单项（在 help 项之后）：

```typescript
const options: { dom: HTMLElement, menuPanel: MenuPanel }[] = [{
    dom: scene.dom,
    menuPanel: fileMenuPanel
}, {
    dom: selection.dom,
    menuPanel: selectionMenuPanel
}, {
    dom: render.dom,
    menuPanel: renderMenuPanel
}, {
    dom: help.dom,
    menuPanel: helpMenuPanel
}, {
    dom: language.dom,
    menuPanel: languageMenuPanel
}];
```

- [ ] **Step 3: 构建并验证**

运行:
```bash
npm run build
npm run develop
```
预期: 浏览器中菜单栏出现 "Language" 菜单项，点击展开显示 20 种语言列表

- [ ] **Step 4: 提交**

```bash
git add src/ui/menu.ts static/locales/
git commit -m "feat: 添加编辑器内语言切换菜单（20 种语言）"
```

---

## Task 3: 扩展 iframe postMessage API

**文件:**
- 修改: `src/iframe-api.ts`

- [ ] **Step 1: 扩展 postMessage 消息类型定义**

将 `src/iframe-api.ts` 完整替换为：

```typescript
import i18next from 'i18next';
import { Events } from './events';

// 消息类型常量
const MSG_PREFIX = 'splat3d:';
const IS_SCENE_DIRTY = `${MSG_PREFIX}is-scene-dirty`;
const LOAD_FILE = `${MSG_PREFIX}load`;
const SET_LANG = `${MSG_PREFIX}set-lang`;
const SET_BRAND = `${MSG_PREFIX}set-brand`;
const SAVE_REQUEST = `${MSG_PREFIX}save-request`;
const READY = `${MSG_PREFIX}ready`;
const DIRTY_STATE = `${MSG_PREFIX}dirty-state`;

// ---- 查询/响应接口 ----

interface IsSceneDirtyQuery {
    type: typeof IS_SCENE_DIRTY;
}

interface IsSceneDirtyResponse {
    type: typeof IS_SCENE_DIRTY;
    result: boolean;
}

// ---- 外壳 → 编辑器 ----

interface LoadFileMessage {
    type: typeof LOAD_FILE;
    url: string;
    filename?: string;
}

interface SetLangMessage {
    type: typeof SET_LANG;
    lang: string;
}

interface SetBrandMessage {
    type: typeof SET_BRAND;
    logo?: string;
    watermark?: boolean;
    name?: string;
}

interface SaveRequestMessage {
    type: typeof SAVE_REQUEST;
}

// ---- 编辑器 → 外壳 ----

interface ReadyMessage {
    type: typeof READY;
}

interface DirtyStateMessage {
    type: typeof DIRTY_STATE;
    isDirty: boolean;
}

// 类型守卫
const isSceneDirtyQuery = (data: any): data is IsSceneDirtyQuery => {
    return data?.type === IS_SCENE_DIRTY;
};

const isLoadFileMessage = (data: any): data is LoadFileMessage => {
    return data?.type === LOAD_FILE && typeof data.url === 'string';
};

const isSetLangMessage = (data: any): data is SetLangMessage => {
    return data?.type === SET_LANG && typeof data.lang === 'string';
};

const isSetBrandMessage = (data: any): data is SetBrandMessage => {
    return data?.type === SET_BRAND;
};

const isSaveRequestMessage = (data: any): data is SaveRequestMessage => {
    return data?.type === SAVE_REQUEST;
};

const registerIframeApi = (events: Events) => {
    window.addEventListener('message', async (event: MessageEvent) => {
        const source = event.source as Window | null;
        if (!source) {
            return;
        }

        const data = event.data;

        // 场景脏状态查询（兼容旧协议）
        if (isSceneDirtyQuery(data)) {
            const response: IsSceneDirtyResponse = {
                type: IS_SCENE_DIRTY,
                result: events.invoke('scene.dirty') as boolean
            };
            source.postMessage(response, event.origin);
            return;
        }

        // 从 URL 加载文件
        if (isLoadFileMessage(data)) {
            await events.invoke('import', [{
                filename: data.filename || data.url.split('/').pop() || 'scene.ply',
                url: data.url
            }]);
            return;
        }

        // 切换语言
        if (isSetLangMessage(data)) {
            await i18next.changeLanguage(data.lang);
            window.location.reload();
            return;
        }

        // 设置品牌信息
        if (isSetBrandMessage(data)) {
            if (data.name) {
                const appLabel = document.getElementById('app-label');
                if (appLabel) {
                    appLabel.textContent = data.name;
                }
            }
            return;
        }

        // 保存请求 - 触发场景保存事件
        if (isSaveRequestMessage(data)) {
            events.fire('doc.save.iframe');
            return;
        }
    });

    // 通知父窗口编辑器已就绪
    if (window.parent !== window) {
        const readyMsg: ReadyMessage = { type: READY };
        window.parent.postMessage(readyMsg, '*');

        // 监听脏状态变化并通知父窗口
        events.on('scene.dirty', () => {
            const dirtyMsg: DirtyStateMessage = {
                type: DIRTY_STATE,
                isDirty: events.invoke('scene.dirty') as boolean
            };
            window.parent.postMessage(dirtyMsg, '*');
        });
    }
};

export { registerIframeApi };
```

- [ ] **Step 2: 构建验证**

运行:
```bash
npm run build
```
预期: 构建成功，无 TypeScript 编译错误

- [ ] **Step 3: 提交**

```bash
git add src/iframe-api.ts
git commit -m "feat: 扩展 iframe postMessage API（加载/保存/语言/品牌）"
```

---

## Task 4: SvelteKit 商业外壳项目初始化

### Task 4.1: 创建 SvelteKit 项目骨架

**文件:**
- 新建: `splat3d-web/` 目录下的所有文件

- [ ] **Step 1: 初始化 SvelteKit 项目**

```bash
cd D:/project
npx sv create splat3d-web --template minimal --types ts
cd splat3d-web
```

预期: 生成 SvelteKit 项目骨架

- [ ] **Step 2: 安装核心依赖**

```bash
npm install @sveltejs/adapter-cloudflare
npm install tailwindcss @tailwindcss/vite daisyui
npm install drizzle-orm @neondatabase/serverless
npm install lucia @lucia-auth/adapter-drizzle
npm install arctic
npm install hono
npm install -D drizzle-kit @cloudflare/workers-types wrangler
```

预期: 所有依赖安装成功

- [ ] **Step 3: 配置 svelte.config.js**

将 `splat3d-web/svelte.config.js` 替换为：

```javascript
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter({
            routes: {
                include: ['/*'],
                exclude: ['<all>']
            }
        })
    }
};

export default config;
```

- [ ] **Step 4: 配置 vite.config.ts**

将 `splat3d-web/vite.config.ts` 替换为：

```typescript
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit()
    ]
});
```

- [ ] **Step 5: 配置 app.css**

将 `splat3d-web/src/app.css` 替换为：

```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
    --color-primary: #6366f1;
    --color-primary-content: #ffffff;
    --color-secondary: #8b5cf6;
    --color-secondary-content: #ffffff;
    --color-accent: #06b6d4;
    --color-neutral: #18181b;
    --color-base-100: #ffffff;
    --color-base-200: #f4f4f5;
    --color-base-300: #e4e4e7;
}
```

- [ ] **Step 6: 配置 wrangler.toml**

新建 `splat3d-web/wrangler.toml`：

```toml
name = "splat3d-web"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[vars]
PUBLIC_EDITOR_URL = "https://editor.splat3d.com"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "splat3d-files"

[[kv_namespaces]]
binding = "KV"
id = "placeholder-kv-id"

[hyperdrive]
binding = "HYPERDRIVE"
id = "placeholder-hyperdrive-id"
```

- [ ] **Step 7: 配置 app.d.ts 平台类型**

将 `splat3d-web/src/app.d.ts` 替换为：

```typescript
/// <reference types="@cloudflare/workers-types" />

declare global {
    namespace App {
        interface Locals {
            user: import('$lib/server/auth').SessionUser | null;
            session: import('$lib/server/auth').DatabaseSession | null;
        }
        interface Platform {
            env: {
                R2_BUCKET: R2Bucket;
                KV: KVNamespace;
                HYPERDRIVE: Hyperdrive;
                GOOGLE_CLIENT_ID: string;
                GOOGLE_CLIENT_SECRET: string;
                GITHUB_CLIENT_ID: string;
                GITHUB_CLIENT_SECRET: string;
                DATABASE_URL: string;
            };
            context: ExecutionContext;
        }
    }
}

export {};
```

- [ ] **Step 8: 验证项目构建**

```bash
npm run build
```
预期: SvelteKit 构建成功（可能有类型警告，因为 Locals 类型引用的模块还未创建）

- [ ] **Step 9: 提交**

```bash
cd D:/project/splat3d-web
git init
git add -A
git commit -m "feat: 初始化 SvelteKit + Cloudflare + Tailwind + DaisyUI 项目骨架"
```

---

### Task 4.2: 数据库 Schema (Drizzle ORM)

**文件:**
- 新建: `splat3d-web/drizzle/schema.ts`
- 新建: `splat3d-web/drizzle.config.ts`
- 新建: `splat3d-web/src/lib/server/db.ts`

- [ ] **Step 1: 创建 Drizzle schema**

新建 `splat3d-web/drizzle/schema.ts`：

```typescript
import { pgTable, text, uuid, timestamp, bigint, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').unique().notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    provider: text('provider').notNull(),
    providerId: text('provider_id').notNull(),
    plan: text('plan').default('free').notNull(),
    locale: text('locale').default('en').notNull(),
    storageUsed: bigint('storage_used', { mode: 'number' }).default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
});

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    fileKey: text('file_key'),
    fileSize: bigint('file_size', { mode: 'number' }).default(0).notNull(),
    fileFormat: text('file_format'),
    thumbnailKey: text('thumbnail_key'),
    isPublished: boolean('is_published').default(false).notNull(),
    publishSlug: text('publish_slug').unique(),
    viewCount: integer('view_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    plan: text('plan').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
```

- [ ] **Step 2: 创建 Drizzle 配置**

新建 `splat3d-web/drizzle.config.ts`：

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './drizzle/schema.ts',
    out: './drizzle/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!
    }
});
```

- [ ] **Step 3: 创建数据库连接模块**

新建 `splat3d-web/src/lib/server/db.ts`：

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../../drizzle/schema';

export function createDb(databaseUrl: string) {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

- [ ] **Step 4: 提交**

```bash
git add drizzle/ src/lib/server/db.ts
git commit -m "feat: 添加 Drizzle ORM schema（users/sessions/projects/subscriptions）"
```

---

### Task 4.3: Lucia Auth 认证系统

**文件:**
- 新建: `splat3d-web/src/lib/server/auth.ts`
- 新建: `splat3d-web/src/routes/login/+page.svelte`
- 新建: `splat3d-web/src/routes/login/google/+server.ts`
- 新建: `splat3d-web/src/routes/login/google/callback/+server.ts`
- 新建: `splat3d-web/src/routes/login/github/+server.ts`
- 新建: `splat3d-web/src/routes/login/github/callback/+server.ts`
- 新建: `splat3d-web/src/hooks.server.ts`

- [ ] **Step 1: 创建 Lucia Auth 配置**

新建 `splat3d-web/src/lib/server/auth.ts`：

```typescript
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { Google, GitHub } from 'arctic';
import { sessions, users } from '../../../drizzle/schema';
import type { Database } from './db';

export type SessionUser = {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    plan: string;
    locale: string;
};

export type DatabaseSession = {
    id: string;
    userId: string;
    expiresAt: Date;
};

export function createAuth(db: Database) {
    const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

    const lucia = new Lucia(adapter, {
        sessionCookie: {
            attributes: {
                secure: true
            }
        },
        getUserAttributes: (attributes: any) => {
            return {
                email: attributes.email,
                name: attributes.name,
                avatarUrl: attributes.avatar_url,
                plan: attributes.plan,
                locale: attributes.locale
            };
        }
    });

    return lucia;
}

export function createGoogleAuth(clientId: string, clientSecret: string, redirectUri: string) {
    return new Google(clientId, clientSecret, redirectUri);
}

export function createGitHubAuth(clientId: string, clientSecret: string) {
    return new GitHub(clientId, clientSecret);
}

export type Auth = ReturnType<typeof createAuth>;
```

- [ ] **Step 2: 创建 hooks.server.ts 认证中间件**

新建 `splat3d-web/src/hooks.server.ts`：

```typescript
import type { Handle } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { createAuth } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
    const db = createDb(event.platform?.env.DATABASE_URL ?? '');
    const lucia = createAuth(db);

    const sessionId = event.cookies.get(lucia.sessionCookieName);

    if (!sessionId) {
        event.locals.user = null;
        event.locals.session = null;
        return resolve(event);
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (session?.fresh) {
        const sessionCookie = lucia.createSessionCookie(session.id);
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: '.',
            ...sessionCookie.attributes
        });
    }

    if (!session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        event.cookies.set(sessionCookie.name, sessionCookie.value, {
            path: '.',
            ...sessionCookie.attributes
        });
    }

    event.locals.user = user as any;
    event.locals.session = session as any;

    return resolve(event);
};
```

- [ ] **Step 3: 创建登录页面**

新建 `splat3d-web/src/routes/login/+page.svelte`：

```svelte
<script lang="ts">
    // 登录页面 - OAuth 按钮
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
            <h2 class="card-title text-2xl font-bold">
                <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Splat3D
                </span>
            </h2>
            <p class="text-base-content/60">3D Gaussian Splat Platform</p>

            <div class="divider"></div>

            <div class="flex flex-col gap-3 w-full">
                <a href="/login/google" class="btn btn-outline gap-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                </a>

                <a href="/login/github" class="btn btn-neutral gap-2">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Continue with GitHub
                </a>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 4: 创建 Google OAuth 路由**

新建 `splat3d-web/src/routes/login/google/+server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { generateState, generateCodeVerifier } from 'arctic';
import { createGoogleAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform, url }) => {
    const env = platform!.env;
    const redirectUri = `${url.origin}/login/google/callback`;
    const google = createGoogleAuth(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);

    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const authUrl = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);

    cookies.set('google_oauth_state', state, {
        path: '/',
        httpOnly: true,
        secure: true,
        maxAge: 60 * 10,
        sameSite: 'lax'
    });
    cookies.set('google_oauth_code_verifier', codeVerifier, {
        path: '/',
        httpOnly: true,
        secure: true,
        maxAge: 60 * 10,
        sameSite: 'lax'
    });

    redirect(302, authUrl.toString());
};
```

- [ ] **Step 5: 创建 Google OAuth 回调路由**

新建 `splat3d-web/src/routes/login/google/callback/+server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { createGoogleAuth, createAuth } from '$lib/server/auth';
import { createDb } from '$lib/server/db';
import { users } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);
    const lucia = createAuth(db);

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies.get('google_oauth_state');
    const codeVerifier = cookies.get('google_oauth_code_verifier');

    if (!code || !state || !storedState || state !== storedState || !codeVerifier) {
        return new Response('Invalid OAuth state', { status: 400 });
    }

    const redirectUri = `${url.origin}/login/google/callback`;
    const google = createGoogleAuth(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);

    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const googleUserResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const googleUser: { id: string; email: string; name: string; picture: string } =
        await googleUserResponse.json();

    // 查找或创建用户
    const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email));

    let userId: string;

    if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        await db
            .update(users)
            .set({
                name: googleUser.name,
                avatarUrl: googleUser.picture,
                updatedAt: new Date()
            })
            .where(eq(users.id, userId));
    } else {
        const newUsers = await db
            .insert(users)
            .values({
                email: googleUser.email,
                name: googleUser.name,
                avatarUrl: googleUser.picture,
                provider: 'google',
                providerId: googleUser.id
            })
            .returning();
        userId = newUsers[0].id;
    }

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
    });

    redirect(302, '/dashboard');
};
```

- [ ] **Step 6: 创建 GitHub OAuth 路由**

新建 `splat3d-web/src/routes/login/github/+server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { generateState } from 'arctic';
import { createGitHubAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, platform }) => {
    const env = platform!.env;
    const github = createGitHubAuth(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

    const state = generateState();
    const authUrl = github.createAuthorizationURL(state, ['user:email']);

    cookies.set('github_oauth_state', state, {
        path: '/',
        httpOnly: true,
        secure: true,
        maxAge: 60 * 10,
        sameSite: 'lax'
    });

    redirect(302, authUrl.toString());
};
```

- [ ] **Step 7: 创建 GitHub OAuth 回调路由**

新建 `splat3d-web/src/routes/login/github/callback/+server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { createGitHubAuth, createAuth } from '$lib/server/auth';
import { createDb } from '$lib/server/db';
import { users } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);
    const lucia = createAuth(db);

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const storedState = cookies.get('github_oauth_state');

    if (!code || !state || !storedState || state !== storedState) {
        return new Response('Invalid OAuth state', { status: 400 });
    }

    const github = createGitHubAuth(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
    const tokens = await github.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    const githubUserResponse = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const githubUser: { id: number; login: string; name: string; avatar_url: string } =
        await githubUserResponse.json();

    // 获取主邮箱
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const emails: { email: string; primary: boolean; verified: boolean }[] =
        await emailsResponse.json();
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email ?? `${githubUser.id}@github.noemail`;

    // 查找或创建用户
    const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, primaryEmail));

    let userId: string;

    if (existingUsers.length > 0) {
        userId = existingUsers[0].id;
        await db
            .update(users)
            .set({
                name: githubUser.name || githubUser.login,
                avatarUrl: githubUser.avatar_url,
                updatedAt: new Date()
            })
            .where(eq(users.id, userId));
    } else {
        const newUsers = await db
            .insert(users)
            .values({
                email: primaryEmail,
                name: githubUser.name || githubUser.login,
                avatarUrl: githubUser.avatar_url,
                provider: 'github',
                providerId: String(githubUser.id)
            })
            .returning();
        userId = newUsers[0].id;
    }

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
    });

    redirect(302, '/dashboard');
};
```

- [ ] **Step 8: 提交**

```bash
git add src/lib/server/auth.ts src/hooks.server.ts src/routes/login/
git commit -m "feat: 添加 Lucia Auth + Google/GitHub OAuth 登录"
```

---

### Task 4.4: 公共布局和导航栏

**文件:**
- 新建: `splat3d-web/src/routes/+layout.svelte`
- 新建: `splat3d-web/src/routes/+layout.server.ts`
- 新建: `splat3d-web/src/lib/components/Navbar.svelte`
- 新建: `splat3d-web/src/lib/components/Footer.svelte`

- [ ] **Step 1: 创建根布局服务端加载**

新建 `splat3d-web/src/routes/+layout.server.ts`：

```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    return {
        user: locals.user
    };
};
```

- [ ] **Step 2: 创建导航栏组件**

新建 `splat3d-web/src/lib/components/Navbar.svelte`：

```svelte
<script lang="ts">
    interface Props {
        user: { name: string | null; avatarUrl: string | null; email: string } | null;
    }
    let { user }: Props = $props();
</script>

<div class="navbar bg-base-100 shadow-sm border-b border-base-300">
    <div class="navbar-start">
        <a href="/" class="btn btn-ghost text-xl font-bold">
            <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Splat3D
            </span>
        </a>
    </div>
    <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
            <li><a href="/pricing">Pricing</a></li>
            {#if user}
                <li><a href="/dashboard">Dashboard</a></li>
            {/if}
        </ul>
    </div>
    <div class="navbar-end">
        {#if user}
            <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
                    <div class="w-8 rounded-full">
                        {#if user.avatarUrl}
                            <img alt="Avatar" src={user.avatarUrl} />
                        {:else}
                            <div class="bg-primary text-primary-content flex items-center justify-center w-full h-full text-sm font-bold">
                                {(user.name || user.email)[0].toUpperCase()}
                            </div>
                        {/if}
                    </div>
                </div>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow">
                    <li><a href="/dashboard">Dashboard</a></li>
                    <li><a href="/api/auth/logout">Logout</a></li>
                </ul>
            </div>
        {:else}
            <a href="/login" class="btn btn-primary btn-sm">Sign In</a>
        {/if}
    </div>
</div>
```

- [ ] **Step 3: 创建页脚组件**

新建 `splat3d-web/src/lib/components/Footer.svelte`：

```svelte
<footer class="footer footer-center bg-base-200 text-base-content p-10">
    <nav class="grid grid-flow-col gap-4">
        <a href="/pricing" class="link link-hover">Pricing</a>
        <a href="https://github.com/playcanvas/supersplat" target="_blank" class="link link-hover">Open Source</a>
    </nav>
    <aside>
        <p>Copyright &copy; {new Date().getFullYear()} Splat3D. Powered by SuperSplat.</p>
    </aside>
</footer>
```

- [ ] **Step 4: 创建根布局**

将 `splat3d-web/src/routes/+layout.svelte` 替换为：

```svelte
<script lang="ts">
    import '../app.css';
    import Navbar from '$lib/components/Navbar.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import type { LayoutData } from './$types';

    let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="min-h-screen flex flex-col">
    <Navbar user={data.user} />
    <main class="flex-1">
        {@render children()}
    </main>
    <Footer />
</div>
```

- [ ] **Step 5: 提交**

```bash
git add src/routes/+layout.svelte src/routes/+layout.server.ts src/lib/components/
git commit -m "feat: 添加公共布局、导航栏和页脚组件"
```

---

### Task 4.5: 落地页和定价页

**文件:**
- 修改: `splat3d-web/src/routes/+page.svelte`
- 新建: `splat3d-web/src/routes/pricing/+page.svelte`

- [ ] **Step 1: 创建落地页**

将 `splat3d-web/src/routes/+page.svelte` 替换为：

```svelte
<svelte:head>
    <title>Splat3D - Create, Edit & Publish 3D Gaussian Splats</title>
    <meta name="description" content="Browser-based platform for 3D Gaussian Splat creation, editing and publishing. No installation required." />
</svelte:head>

<!-- Hero -->
<section class="hero min-h-[70vh] bg-gradient-to-br from-base-100 to-base-200">
    <div class="hero-content text-center">
        <div class="max-w-2xl">
            <h1 class="text-5xl font-bold">
                <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    3D Gaussian Splats
                </span>
                <br />
                Create. Edit. Publish.
            </h1>
            <p class="py-6 text-lg text-base-content/70">
                Browser-based platform for creating, editing and publishing 3D Gaussian Splats.
                Zero installation. Global availability. 20 languages.
            </p>
            <div class="flex gap-4 justify-center">
                <a href="/login" class="btn btn-primary btn-lg">Get Started Free</a>
                <a href="/pricing" class="btn btn-outline btn-lg">View Pricing</a>
            </div>
        </div>
    </div>
</section>

<!-- Features -->
<section class="py-20 bg-base-100">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Everything You Need</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#9998;</div>
                    <h3 class="card-title">Edit</h3>
                    <p>Professional-grade 3D Gaussian Splat editor running entirely in your browser.</p>
                </div>
            </div>
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#9729;</div>
                    <h3 class="card-title">Publish</h3>
                    <p>One-click publishing with shareable links and embeddable viewers.</p>
                </div>
            </div>
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#127760;</div>
                    <h3 class="card-title">Global</h3>
                    <p>Available in 20 languages with edge-deployed infrastructure worldwide.</p>
                </div>
            </div>
        </div>
    </div>
</section>
```

- [ ] **Step 2: 创建定价页**

新建 `splat3d-web/src/routes/pricing/+page.svelte`：

```svelte
<svelte:head>
    <title>Pricing - Splat3D</title>
</svelte:head>

<section class="py-20 bg-base-100">
    <div class="container mx-auto px-4">
        <h1 class="text-4xl font-bold text-center mb-4">Simple Pricing</h1>
        <p class="text-center text-base-content/60 mb-12">Start free, upgrade as you grow</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <!-- Free -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <h2 class="card-title">Free</h2>
                    <p class="text-3xl font-bold">$0<span class="text-sm font-normal text-base-content/60">/month</span></p>
                    <ul class="mt-4 space-y-2 text-sm">
                        <li>3 projects</li>
                        <li>1 GB storage</li>
                        <li>Watermark on exports</li>
                        <li>Community support</li>
                    </ul>
                    <div class="card-actions mt-6">
                        <a href="/login" class="btn btn-outline btn-block">Get Started</a>
                    </div>
                </div>
            </div>

            <!-- Pro -->
            <div class="card bg-primary text-primary-content border-2 border-primary shadow-xl">
                <div class="card-body">
                    <div class="badge badge-secondary">Most Popular</div>
                    <h2 class="card-title">Pro</h2>
                    <p class="text-3xl font-bold">$15<span class="text-sm font-normal opacity-70">/month</span></p>
                    <ul class="mt-4 space-y-2 text-sm">
                        <li>Unlimited projects</li>
                        <li>50 GB storage</li>
                        <li>No watermark</li>
                        <li>50 AI reconstructions/month</li>
                        <li>Priority support</li>
                    </ul>
                    <div class="card-actions mt-6">
                        <a href="/login" class="btn btn-secondary btn-block">Start Pro Trial</a>
                    </div>
                </div>
            </div>

            <!-- Business -->
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body">
                    <h2 class="card-title">Business</h2>
                    <p class="text-3xl font-bold">$39<span class="text-sm font-normal text-base-content/60">/month</span></p>
                    <ul class="mt-4 space-y-2 text-sm">
                        <li>Unlimited projects</li>
                        <li>500 GB storage</li>
                        <li>No watermark + white label</li>
                        <li>200 AI reconstructions/month</li>
                        <li>Dedicated support</li>
                    </ul>
                    <div class="card-actions mt-6">
                        <a href="/login" class="btn btn-outline btn-block">Contact Sales</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
```

- [ ] **Step 3: 提交**

```bash
git add src/routes/+page.svelte src/routes/pricing/
git commit -m "feat: 添加落地页和定价页"
```

---

### Task 4.6: 项目仪表板

**文件:**
- 新建: `splat3d-web/src/routes/dashboard/+page.server.ts`
- 新建: `splat3d-web/src/routes/dashboard/+page.svelte`
- 新建: `splat3d-web/src/lib/components/ProjectCard.svelte`

- [ ] **Step 1: 创建仪表板服务端加载**

新建 `splat3d-web/src/routes/dashboard/+page.server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
    if (!locals.user) {
        redirect(302, '/login');
    }

    const db = createDb(platform!.env.DATABASE_URL);

    const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, locals.user.id))
        .orderBy(desc(projects.updatedAt));

    return {
        projects: userProjects
    };
};
```

- [ ] **Step 2: 创建项目卡片组件**

新建 `splat3d-web/src/lib/components/ProjectCard.svelte`：

```svelte
<script lang="ts">
    interface Project {
        id: string;
        name: string;
        thumbnailKey: string | null;
        viewCount: number;
        updatedAt: Date;
        fileFormat: string | null;
    }

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    };
</script>

<a href="/projects/{project.id}" class="card bg-base-200 hover:shadow-lg transition-shadow cursor-pointer">
    <figure class="h-48 bg-base-300 flex items-center justify-center">
        {#if project.thumbnailKey}
            <img src="/api/files/thumbnail/{project.id}" alt={project.name} class="object-cover w-full h-full" />
        {:else}
            <span class="text-6xl opacity-20">&#9674;</span>
        {/if}
    </figure>
    <div class="card-body p-4">
        <h3 class="card-title text-sm">{project.name}</h3>
        <div class="flex justify-between text-xs text-base-content/50">
            <span>{formatDate(project.updatedAt)}</span>
            <span>{project.viewCount} views</span>
        </div>
    </div>
</a>
```

- [ ] **Step 3: 创建仪表板页面**

新建 `splat3d-web/src/routes/dashboard/+page.svelte`：

```svelte
<script lang="ts">
    import ProjectCard from '$lib/components/ProjectCard.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let showNewProjectModal = $state(false);
    let newProjectName = $state('');
</script>

<svelte:head>
    <title>Dashboard - Splat3D</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold">My Projects</h1>
        <button class="btn btn-primary" onclick={() => showNewProjectModal = true}>
            + New Project
        </button>
    </div>

    {#if data.projects.length === 0}
        <div class="text-center py-20">
            <p class="text-6xl mb-4">&#128194;</p>
            <h2 class="text-xl font-semibold mb-2">No projects yet</h2>
            <p class="text-base-content/60 mb-6">Create your first 3D Gaussian Splat project</p>
            <button class="btn btn-primary" onclick={() => showNewProjectModal = true}>
                Create Project
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each data.projects as project}
                <ProjectCard {project} />
            {/each}
        </div>
    {/if}
</div>

<!-- 新建项目模态框 -->
{#if showNewProjectModal}
    <div class="modal modal-open">
        <div class="modal-box">
            <h3 class="text-lg font-bold">New Project</h3>
            <div class="form-control mt-4">
                <label class="label" for="project-name">
                    <span class="label-text">Project Name</span>
                </label>
                <input
                    id="project-name"
                    type="text"
                    placeholder="My Splat Scene"
                    class="input input-bordered"
                    bind:value={newProjectName}
                />
            </div>
            <div class="modal-action">
                <button class="btn" onclick={() => showNewProjectModal = false}>Cancel</button>
                <form method="POST" action="/api/projects">
                    <input type="hidden" name="name" value={newProjectName} />
                    <button type="submit" class="btn btn-primary" disabled={!newProjectName.trim()}>
                        Create
                    </button>
                </form>
            </div>
        </div>
        <div class="modal-backdrop" onclick={() => showNewProjectModal = false}></div>
    </div>
{/if}
```

- [ ] **Step 4: 提交**

```bash
git add src/routes/dashboard/ src/lib/components/ProjectCard.svelte
git commit -m "feat: 添加项目仪表板页面和项目卡片组件"
```

---

### Task 4.7: 项目 CRUD API

**文件:**
- 新建: `splat3d-web/src/routes/api/projects/+server.ts`

- [ ] **Step 1: 创建项目 API 路由**

新建 `splat3d-web/src/routes/api/projects/+server.ts`：

```typescript
import { json, redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// 创建项目
export const POST: RequestHandler = async ({ request, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createDb(platform!.env.DATABASE_URL);
    const formData = await request.formData();
    const name = formData.get('name') as string;

    if (!name?.trim()) {
        return json({ error: 'Name is required' }, { status: 400 });
    }

    const newProject = await db
        .insert(projects)
        .values({
            userId: locals.user.id,
            name: name.trim()
        })
        .returning();

    redirect(302, `/projects/${newProject[0].id}`);
};

// 列出项目
export const GET: RequestHandler = async ({ locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createDb(platform!.env.DATABASE_URL);

    const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, locals.user.id));

    return json({ projects: userProjects });
};
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/api/projects/
git commit -m "feat: 添加项目 CRUD API（创建/列出）"
```

---

### Task 4.8: R2 文件上传/下载 API

**文件:**
- 新建: `splat3d-web/src/lib/server/r2.ts`
- 新建: `splat3d-web/src/routes/api/files/upload/+server.ts`
- 新建: `splat3d-web/src/routes/api/files/download/+server.ts`

- [ ] **Step 1: 创建 R2 操作模块**

新建 `splat3d-web/src/lib/server/r2.ts`：

```typescript
export function getFileKey(userId: string, projectId: string, filename: string): string {
    return `projects/${userId}/${projectId}/${filename}`;
}

export function getThumbnailKey(userId: string, projectId: string): string {
    return `thumbnails/${userId}/${projectId}.png`;
}

export async function uploadToR2(
    bucket: R2Bucket,
    key: string,
    data: ArrayBuffer | ReadableStream,
    contentType: string
): Promise<void> {
    await bucket.put(key, data, {
        httpMetadata: { contentType }
    });
}

export async function downloadFromR2(
    bucket: R2Bucket,
    key: string
): Promise<R2ObjectBody | null> {
    return await bucket.get(key);
}

export async function deleteFromR2(
    bucket: R2Bucket,
    key: string
): Promise<void> {
    await bucket.delete(key);
}
```

- [ ] **Step 2: 创建文件上传 API**

新建 `splat3d-web/src/routes/api/files/upload/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getFileKey, uploadToR2 } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const file = formData.get('file') as File;

    if (!projectId || !file) {
        return json({ error: 'Missing projectId or file' }, { status: 400 });
    }

    // 验证项目归属
    const projectList = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, locals.user.id)));

    if (projectList.length === 0) {
        return json({ error: 'Project not found' }, { status: 404 });
    }

    const fileKey = getFileKey(locals.user.id, projectId, file.name);
    const arrayBuffer = await file.arrayBuffer();

    await uploadToR2(env.R2_BUCKET, fileKey, arrayBuffer, file.type || 'application/octet-stream');

    // 更新项目记录
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    await db
        .update(projects)
        .set({
            fileKey,
            fileSize: file.size,
            fileFormat: ext,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    return json({ success: true, fileKey });
};
```

- [ ] **Step 3: 创建文件下载 API**

新建 `splat3d-web/src/routes/api/files/download/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { downloadFromR2 } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
        return json({ error: 'Missing projectId' }, { status: 400 });
    }

    // 验证项目归属
    const projectList = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, locals.user.id)));

    if (projectList.length === 0 || !projectList[0].fileKey) {
        return json({ error: 'File not found' }, { status: 404 });
    }

    const r2Object = await downloadFromR2(env.R2_BUCKET, projectList[0].fileKey);
    if (!r2Object) {
        return json({ error: 'File not found in storage' }, { status: 404 });
    }

    return new Response(r2Object.body, {
        headers: {
            'Content-Type': r2Object.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${projectList[0].fileKey.split('/').pop()}"`,
            'Cache-Control': 'private, max-age=3600'
        }
    });
};
```

- [ ] **Step 4: 提交**

```bash
git add src/lib/server/r2.ts src/routes/api/files/
git commit -m "feat: 添加 R2 文件上传/下载 API"
```

---

### Task 4.9: 编辑器 iframe 嵌入页面

**文件:**
- 新建: `splat3d-web/src/routes/projects/[id]/+page.server.ts`
- 新建: `splat3d-web/src/routes/projects/[id]/+page.svelte`

- [ ] **Step 1: 创建编辑器页面服务端加载**

新建 `splat3d-web/src/routes/projects/[id]/+page.server.ts`：

```typescript
import { redirect, error } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, platform }) => {
    if (!locals.user) {
        redirect(302, '/login');
    }

    const db = createDb(platform!.env.DATABASE_URL);

    const projectList = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)));

    if (projectList.length === 0) {
        error(404, 'Project not found');
    }

    const project = projectList[0];

    // 生成文件下载 URL（如果有文件）
    let fileDownloadUrl: string | null = null;
    if (project.fileKey) {
        fileDownloadUrl = `/api/files/download?projectId=${project.id}`;
    }

    return {
        project,
        fileDownloadUrl,
        editorUrl: platform!.env.PUBLIC_EDITOR_URL || '/editor'
    };
};
```

- [ ] **Step 2: 创建编辑器 iframe 嵌入页面**

新建 `splat3d-web/src/routes/projects/[id]/+page.svelte`：

```svelte
<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let iframeRef: HTMLIFrameElement | undefined = $state();
    let isDirty = $state(false);
    let editorReady = $state(false);

    const MSG_PREFIX = 'splat3d:';

    function handleMessage(event: MessageEvent) {
        const msg = event.data;
        if (!msg?.type?.startsWith(MSG_PREFIX)) return;

        switch (msg.type) {
            case `${MSG_PREFIX}ready`:
                editorReady = true;
                // 如果有已保存的文件，通知编辑器加载
                if (data.fileDownloadUrl) {
                    iframeRef?.contentWindow?.postMessage({
                        type: `${MSG_PREFIX}load`,
                        url: data.fileDownloadUrl,
                        filename: data.project.name
                    }, '*');
                }
                break;
            case `${MSG_PREFIX}dirty-state`:
                isDirty = msg.isDirty;
                break;
        }
    }

    async function saveProject() {
        // 向编辑器请求保存
        iframeRef?.contentWindow?.postMessage({
            type: `${MSG_PREFIX}save-request`
        }, '*');
    }

    $effect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    });
</script>

<svelte:head>
    <title>{data.project.name} - Splat3D</title>
</svelte:head>

<!-- 编辑器顶部窄条 -->
<div class="h-12 bg-base-100 border-b border-base-300 flex items-center px-4 gap-4">
    <a href="/dashboard" class="btn btn-ghost btn-sm">&#8592; Dashboard</a>
    <span class="font-semibold flex-1 truncate">{data.project.name}</span>
    <div class="flex items-center gap-2">
        {#if isDirty}
            <span class="badge badge-warning badge-sm">Unsaved</span>
        {/if}
        <button class="btn btn-primary btn-sm" onclick={saveProject} disabled={!editorReady}>
            Save
        </button>
    </div>
</div>

<!-- 编辑器 iframe -->
<iframe
    bind:this={iframeRef}
    src={data.editorUrl}
    class="w-full border-0"
    style="height: calc(100vh - 112px);"
    allow="clipboard-read; clipboard-write"
    title="Splat3D Editor"
></iframe>
```

- [ ] **Step 3: 提交**

```bash
git add src/routes/projects/
git commit -m "feat: 添加编辑器 iframe 嵌入页面（含 postMessage 通信）"
```

---

### Task 4.10: 登出和认证保护

**文件:**
- 新建: `splat3d-web/src/routes/api/auth/logout/+server.ts`

- [ ] **Step 1: 创建登出 API**

新建 `splat3d-web/src/routes/api/auth/logout/+server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { createAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies, platform }) => {
    if (!locals.session) {
        redirect(302, '/');
    }

    const db = createDb(platform!.env.DATABASE_URL);
    const lucia = createAuth(db);

    await lucia.invalidateSession(locals.session.id);
    const sessionCookie = lucia.createBlankSessionCookie();

    cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
    });

    redirect(302, '/');
};
```

- [ ] **Step 2: 提交**

```bash
git add src/routes/api/auth/
git commit -m "feat: 添加登出 API 路由"
```

---

### Task 4.11: 端到端验证

- [ ] **Step 1: 构建整个商业外壳项目**

```bash
cd D:/project/splat3d-web
npm run build
```
预期: SvelteKit + Cloudflare adapter 构建成功

- [ ] **Step 2: 构建编辑器**

```bash
cd D:/project/supersplat
npm install
npm run build
```
预期: Rollup 构建成功，`dist/` 目录包含定制后的编辑器

- [ ] **Step 3: 本地开发验证**

在两个终端分别运行：

终端 1（编辑器）:
```bash
cd D:/project/supersplat
npm run develop
```

终端 2（商业外壳）:
```bash
cd D:/project/splat3d-web
npm run dev
```

手动验证清单：
- [ ] 编辑器：品牌标签显示 "SPLAT3D v2.24.5"
- [ ] 编辑器：配色为蓝紫色调（高亮色 #6366f1）
- [ ] 编辑器：菜单栏有 "Language" 菜单项
- [ ] 编辑器：点击语言菜单显示 20 种语言
- [ ] 商业外壳：落地页正常渲染
- [ ] 商业外壳：定价页显示 Free/Pro/Business 三栏
- [ ] 商业外壳：导航栏显示 Splat3D 品牌名

- [ ] **Step 4: 提交验证说明**

```bash
cd D:/project/supersplat
git add -A
git commit -m "chore: Phase 1 基础搭建完成 - 品牌定制 + 20语言 + 商业外壳骨架"
```

---

## 自审查对照

| 设计规格要求 | 对应 Task | 状态 |
|-------------|----------|------|
| Fork SuperSplat + 品牌主题 | Task 1.1, 1.2 | 已覆盖 |
| 20 种语言翻译文件 | Task 2.1, 2.2, 2.3 | 已覆盖 |
| SvelteKit 项目初始化 | Task 4.1 | 已覆盖 |
| Cloudflare 部署配置 | Task 4.1 (wrangler.toml) | 已覆盖 |
| Neon PG + Drizzle schema | Task 4.2 | 已覆盖 |
| OAuth 登录 (Google/GitHub) | Task 4.3 | 已覆盖 |
| Lucia Auth | Task 4.3 | 已覆盖 |
| 项目仪表板 | Task 4.6 | 已覆盖 |
| R2 文件上传/下载 | Task 4.8 | 已覆盖 |
| iframe 嵌入编辑器 | Task 4.9 | 已覆盖 |
| postMessage API | Task 3 | 已覆盖 |
| 落地页 | Task 4.5 | 已覆盖 |
| 定价页 | Task 4.5 | 已覆盖 |
| 语言切换菜单 | Task 2.3 | 已覆盖 |
| 阿拉伯语 RTL | Task 2.1 (翻译文件) | 文件已覆盖，CSS logical properties 留待 Phase 2 细化 |
