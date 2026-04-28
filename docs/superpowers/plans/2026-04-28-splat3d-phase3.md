# Splat3D Phase 3 实施计划：增长功能（第 9-12 周）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 实现免费/付费功能门控、水印系统、使用量限额与存储统计，以驱动免费用户向付费转化；搭建照片上传到 3D 重建的前端管线（SfM 后端为 Hetzner VPS，本 Phase 完成前端 + API 对接部分）。

**架构：** 在现有 SvelteKit 商业外壳（D:\project\splat3d-web）上扩展功能门控中间件和重建任务管理；在编辑器仓库（D:\project\supersplat）扩展水印渲染。

**技术栈：** SvelteKit 2 / Drizzle ORM / Cloudflare KV（限额缓存）/ postMessage API（水印控制）

---

## 文件结构

### 商业外壳（D:\project\splat3d-web）

```
splat3d-web/
├── drizzle/
│   └── schema.ts                                       ← 修改：添加 reconstruction_jobs 表
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── plan-limits.ts                          ← 新建：计划限额常量和检查函数
│   │   │   └── storage.ts                              ← 新建：存储统计工具
│   │   └── components/
│   │       ├── UpgradePrompt.svelte                    ← 新建：升级提示组件
│   │       └── ReconstructionUpload.svelte             ← 新建：照片上传重建组件
│   └── routes/
│       ├── dashboard/
│       │   ├── +page.server.ts                         ← 修改：添加计划限额和存储统计
│       │   └── +page.svelte                            ← 修改：显示存储用量和限额提示
│       ├── billing/
│       │   ├── +page.server.ts                         ← 修改：传入实际存储数据
│       │   └── +page.svelte                            ← 修改：显示真实存储用量
│       ├── api/
│       │   ├── projects/+server.ts                     ← 修改：新建项目时检查限额
│       │   ├── files/upload/+server.ts                 ← 修改：上传时检查存储限额+更新 storageUsed
│       │   └── reconstruct/
│       │       ├── +server.ts                          ← 新建：创建重建任务
│       │       └── [id]/+server.ts                     ← 新建：查询重建状态
│       └── reconstruct/+page.svelte                    ← 新建：重建页面
│       └── reconstruct/+page.server.ts                 ← 新建：重建页面服务端
```

### 编辑器仓库（D:\project\supersplat）

```
src/
├── ui/
│   └── watermark.ts                                    ← 新建：水印渲染模块
├── iframe-api.ts                                       ← 修改：添加 set-watermark 消息处理
```

---

### Task 9.1: 计划限额常量和检查函数

**文件:**
- 新建: `splat3d-web/src/lib/server/plan-limits.ts`

- [ ] **Step 1: 创建计划限额模块**

新建 `splat3d-web/src/lib/server/plan-limits.ts`：

```typescript
export const PLAN_LIMITS = {
    free: {
        maxProjects: 3,
        maxStorageBytes: 1 * 1024 * 1024 * 1024,
        maxReconstructions: 0,
        watermark: true
    },
    pro: {
        maxProjects: Infinity,
        maxStorageBytes: 50 * 1024 * 1024 * 1024,
        maxReconstructions: 50,
        watermark: false
    },
    business: {
        maxProjects: Infinity,
        maxStorageBytes: 500 * 1024 * 1024 * 1024,
        maxReconstructions: 200,
        watermark: false
    }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
    return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.free;
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function canCreateProject(plan: string, currentCount: number): boolean {
    const limits = getPlanLimits(plan);
    return currentCount < limits.maxProjects;
}

export function canUploadFile(plan: string, currentStorageUsed: number, fileSize: number): boolean {
    const limits = getPlanLimits(plan);
    return (currentStorageUsed + fileSize) <= limits.maxStorageBytes;
}

export function hasWatermark(plan: string): boolean {
    return getPlanLimits(plan).watermark;
}
```

- [ ] **Step 2: 提交**

```bash
cd D:/project/splat3d-web
git add src/lib/server/plan-limits.ts
git commit -m "feat: 添加计划限额常量和检查函数"
```

---

### Task 9.2: 项目创建限额门控

**文件:**
- 修改: `splat3d-web/src/routes/api/projects/+server.ts`

- [ ] **Step 1: 在项目创建时检查限额**

在 `splat3d-web/src/routes/api/projects/+server.ts` 中，在 POST handler 的 `if (!name?.trim())` 校验之后、`db.insert` 之前添加项目数量检查：

在文件顶部添加导入：
```typescript
import { canCreateProject } from '$lib/server/plan-limits';
import { count } from 'drizzle-orm';
```

在 `if (!name?.trim())` 之后添加：
```typescript
    // 检查项目数量限额
    const projectCount = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.userId, locals.user.id));

    if (!canCreateProject(locals.user.plan, projectCount[0].count)) {
        return json({ error: 'Project limit reached. Upgrade your plan.' }, { status: 403 });
    }
```

- [ ] **Step 2: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/api/projects/
git commit -m "feat: 项目创建时检查计划限额"
```

---

### Task 9.3: 文件上传存储限额 + 存储统计更新

**文件:**
- 新建: `splat3d-web/src/lib/server/storage.ts`
- 修改: `splat3d-web/src/routes/api/files/upload/+server.ts`

- [ ] **Step 1: 创建存储统计工具**

新建 `splat3d-web/src/lib/server/storage.ts`：

```typescript
import { eq, sql } from 'drizzle-orm';
import { projects, users } from '../../../drizzle/schema';
import type { Database } from './db';

export async function recalculateStorageUsed(db: Database, userId: string): Promise<number> {
    const result = await db
        .select({ total: sql<number>`COALESCE(SUM(${projects.fileSize}), 0)` })
        .from(projects)
        .where(eq(projects.userId, userId));

    const totalUsed = result[0].total;

    await db
        .update(users)
        .set({ storageUsed: totalUsed, updatedAt: new Date() })
        .where(eq(users.id, userId));

    return totalUsed;
}
```

- [ ] **Step 2: 在文件上传时检查存储限额**

在 `splat3d-web/src/routes/api/files/upload/+server.ts` 中添加存储限额检查。

在文件顶部添加导入：
```typescript
import { canUploadFile } from '$lib/server/plan-limits';
import { recalculateStorageUsed } from '$lib/server/storage';
import { users } from '../../../../../drizzle/schema';
```

在 `const fileKey = getFileKey(...)` 之前添加：
```typescript
    // 检查存储限额
    if (!canUploadFile(locals.user.plan, 0, file.size)) {
        // 先精确计算当前用量
        const currentUsed = await recalculateStorageUsed(db, locals.user.id);
        if (!canUploadFile(locals.user.plan, currentUsed, file.size)) {
            return json({ error: 'Storage limit exceeded. Upgrade your plan.' }, { status: 403 });
        }
    }
```

在 `return json({ success: true, fileKey })` 之前添加：
```typescript
    // 更新用户存储统计
    await recalculateStorageUsed(db, locals.user.id);
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/lib/server/storage.ts src/routes/api/files/upload/
git commit -m "feat: 文件上传时检查存储限额并更新统计"
```

---

### Task 9.4: 仪表板显示存储用量和限额

**文件:**
- 修改: `splat3d-web/src/routes/dashboard/+page.server.ts`
- 修改: `splat3d-web/src/routes/dashboard/+page.svelte`
- 新建: `splat3d-web/src/lib/components/UpgradePrompt.svelte`

- [ ] **Step 1: 创建升级提示组件**

新建 `splat3d-web/src/lib/components/UpgradePrompt.svelte`：

```svelte
<script lang="ts">
    interface Props {
        message: string;
    }
    let { message }: Props = $props();
</script>

<div class="alert alert-warning">
    <span>{message}</span>
    <a href="/pricing" class="btn btn-sm btn-primary">Upgrade</a>
</div>
```

- [ ] **Step 2: 更新仪表板服务端加载**

将 `splat3d-web/src/routes/dashboard/+page.server.ts` 替换为：

```typescript
import { redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects, users } from '../../../drizzle/schema';
import { eq, desc, count } from 'drizzle-orm';
import { getPlanLimits, formatBytes } from '$lib/server/plan-limits';
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

    const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.id, locals.user.id));

    const limits = getPlanLimits(locals.user.plan);
    const storageUsed = userRecord[0]?.storageUsed || 0;

    return {
        projects: userProjects,
        plan: locals.user.plan,
        projectCount: userProjects.length,
        maxProjects: limits.maxProjects,
        storageUsed,
        storageUsedFormatted: formatBytes(storageUsed),
        maxStorageFormatted: formatBytes(limits.maxStorageBytes),
        storagePercent: limits.maxStorageBytes === Infinity ? 0 : Math.round((storageUsed / limits.maxStorageBytes) * 100),
        canCreateMore: userProjects.length < limits.maxProjects,
        hasWatermark: limits.watermark
    };
};
```

- [ ] **Step 3: 更新仪表板页面显示限额信息**

将 `splat3d-web/src/routes/dashboard/+page.svelte` 替换为：

```svelte
<script lang="ts">
    import ProjectCard from '$lib/components/ProjectCard.svelte';
    import UpgradePrompt from '$lib/components/UpgradePrompt.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let showNewProjectModal = $state(false);
    let newProjectName = $state('');
</script>

<svelte:head>
    <title>Dashboard - Splat3D</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
    <!-- 存储和项目统计 -->
    <div class="stats shadow mb-6 w-full">
        <div class="stat">
            <div class="stat-title">Projects</div>
            <div class="stat-value text-lg">
                {data.projectCount}{data.maxProjects !== Infinity ? ` / ${data.maxProjects}` : ''}
            </div>
        </div>
        <div class="stat">
            <div class="stat-title">Storage</div>
            <div class="stat-value text-lg">{data.storageUsedFormatted}</div>
            <div class="stat-desc">{data.maxStorageFormatted} limit</div>
        </div>
        <div class="stat">
            <div class="stat-title">Plan</div>
            <div class="stat-value text-lg capitalize">{data.plan}</div>
            {#if data.plan === 'free'}
                <div class="stat-desc"><a href="/pricing" class="link link-primary">Upgrade</a></div>
            {/if}
        </div>
    </div>

    {#if !data.canCreateMore}
        <div class="mb-6">
            <UpgradePrompt message="You've reached the project limit for your plan." />
        </div>
    {/if}

    {#if data.storagePercent > 80}
        <div class="mb-6">
            <UpgradePrompt message="You're running low on storage ({data.storagePercent}% used)." />
        </div>
    {/if}

    <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold">My Projects</h1>
        <button
            class="btn btn-primary"
            onclick={() => showNewProjectModal = true}
            disabled={!data.canCreateMore}
        >
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
cd D:/project/splat3d-web
git add src/lib/components/UpgradePrompt.svelte src/routes/dashboard/
git commit -m "feat: 仪表板显示存储用量、项目计数和计划限额提示"
```

---

### Task 9.5: Billing 页面显示真实存储数据

**文件:**
- 修改: `splat3d-web/src/routes/billing/+page.server.ts`
- 修改: `splat3d-web/src/routes/billing/+page.svelte`

- [ ] **Step 1: 更新 Billing 服务端**

将 `splat3d-web/src/routes/billing/+page.server.ts` 替换为：

```typescript
import { redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { subscriptions, users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getPlanLimits, formatBytes } from '$lib/server/plan-limits';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
    if (!locals.user) {
        redirect(302, '/login');
    }

    const db = createDb(platform!.env.DATABASE_URL);

    const sub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, locals.user.id));

    const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.id, locals.user.id));

    const limits = getPlanLimits(locals.user.plan);
    const storageUsed = userRecord[0]?.storageUsed || 0;

    return {
        subscription: sub.length > 0 ? sub[0] : null,
        plan: locals.user.plan,
        success: url.searchParams.get('success') === 'true',
        storageUsed,
        storageUsedFormatted: formatBytes(storageUsed),
        maxStorageFormatted: formatBytes(limits.maxStorageBytes),
        storagePercent: limits.maxStorageBytes === Infinity ? 0 : Math.round((storageUsed / limits.maxStorageBytes) * 100)
    };
};
```

- [ ] **Step 2: 更新 Billing 页面**

将 `splat3d-web/src/routes/billing/+page.svelte` 替换为：

```svelte
<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>Billing - Splat3D</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-2xl">
    <h1 class="text-2xl font-bold mb-8">Billing & Subscription</h1>

    {#if data.success}
        <div class="alert alert-success mb-6">
            <span>Subscription activated successfully!</span>
        </div>
    {/if}

    <div class="card bg-base-200">
        <div class="card-body">
            <h2 class="card-title">Current Plan</h2>
            <div class="flex items-center gap-4 mt-2">
                <span class="badge badge-lg {data.plan === 'free' ? 'badge-ghost' : 'badge-primary'}">
                    {data.plan.charAt(0).toUpperCase() + data.plan.slice(1)}
                </span>
                {#if data.subscription?.status === 'canceled'}
                    <span class="badge badge-warning">Cancels at period end</span>
                {/if}
            </div>

            {#if data.subscription && data.subscription.currentPeriodEnd}
                <p class="text-sm text-base-content/60 mt-2">
                    Current period ends: {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
            {/if}

            <div class="card-actions mt-6">
                {#if data.plan === 'free'}
                    <a href="/pricing" class="btn btn-primary">Upgrade Plan</a>
                {:else}
                    <form method="POST" action="/api/billing/portal">
                        <button type="submit" class="btn btn-outline">Manage Subscription</button>
                    </form>
                {/if}
            </div>
        </div>
    </div>

    <div class="card bg-base-200 mt-6">
        <div class="card-body">
            <h2 class="card-title">Storage Usage</h2>
            <div class="mt-2 space-y-3">
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span>{data.storageUsedFormatted} used</span>
                        <span>{data.maxStorageFormatted} limit</span>
                    </div>
                    <progress
                        class="progress {data.storagePercent > 80 ? 'progress-warning' : 'progress-primary'} w-full"
                        value={data.storagePercent}
                        max="100"
                    ></progress>
                </div>
                {#if data.storagePercent > 90}
                    <div class="alert alert-warning text-sm">
                        <span>Storage almost full. Consider upgrading your plan.</span>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/billing/
git commit -m "feat: Billing 页面显示真实存储用量和进度条"
```

---

### Task 10.1: 编辑器水印模块

**文件:**
- 新建: `supersplat/src/ui/watermark.ts`
- 修改: `supersplat/src/iframe-api.ts`

- [ ] **Step 1: 创建水印渲染模块**

新建 `D:\project\supersplat\src\ui\watermark.ts`：

```typescript
let watermarkElement: HTMLDivElement | null = null;

export function showWatermark() {
    if (watermarkElement) return;

    watermarkElement = document.createElement('div');
    watermarkElement.id = 'splat3d-watermark';
    watermarkElement.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        background: rgba(0, 0, 0, 0.5);
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        font-family: Inter, sans-serif;
        border-radius: 6px;
        pointer-events: none;
        z-index: 9999;
        user-select: none;
    `;
    watermarkElement.textContent = 'Made with Splat3D';

    document.body.appendChild(watermarkElement);
}

export function hideWatermark() {
    if (watermarkElement) {
        watermarkElement.remove();
        watermarkElement = null;
    }
}

export function setWatermarkVisible(visible: boolean) {
    if (visible) {
        showWatermark();
    } else {
        hideWatermark();
    }
}
```

- [ ] **Step 2: 在 iframe-api.ts 中添加水印消息处理**

在 `D:\project\supersplat\src\iframe-api.ts` 中，添加 `set-watermark` 消息类型的处理。

在文件顶部添加导入：
```typescript
import { setWatermarkVisible } from './ui/watermark';
```

在消息处理的 switch 中添加 case：
```typescript
case `${prefix}set-watermark`:
    setWatermarkVisible(data.visible);
    break;
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/supersplat
git add src/ui/watermark.ts src/iframe-api.ts
git commit -m "feat: 添加水印渲染模块和 iframe set-watermark 消息处理"
```

---

### Task 10.2: 编辑器页面发送水印指令

**文件:**
- 修改: `splat3d-web/src/routes/projects/[id]/+page.server.ts`
- 修改: `splat3d-web/src/routes/projects/[id]/+page.svelte`

- [ ] **Step 1: 更新编辑器页面服务端传递水印标志**

在 `splat3d-web/src/routes/projects/[id]/+page.server.ts` 中，在 return 对象中添加：

```typescript
import { hasWatermark } from '$lib/server/plan-limits';
```

在 return 对象中添加：
```typescript
        showWatermark: hasWatermark(locals.user.plan)
```

- [ ] **Step 2: 编辑器页面在 ready 时发送水印指令**

在 `splat3d-web/src/routes/projects/[id]/+page.svelte` 的 `case \`${MSG_PREFIX}ready\`` 中，在 editorReady = true 之后添加：

```typescript
                // 发送水印指令
                iframeRef?.contentWindow?.postMessage({
                    type: `${MSG_PREFIX}set-watermark`,
                    visible: data.showWatermark
                }, '*');
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/projects/
git commit -m "feat: 编辑器页面根据用户计划发送水印显示指令"
```

---

### Task 11.1: 重建任务数据库表

**文件:**
- 修改: `splat3d-web/drizzle/schema.ts`

- [ ] **Step 1: 添加 reconstruction_jobs 表**

在 `splat3d-web/drizzle/schema.ts` 末尾添加：

```typescript
export const reconstructionJobs = pgTable('reconstruction_jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    status: text('status').default('pending').notNull(),
    photoCount: integer('photo_count').default(0).notNull(),
    photosKey: text('photos_key'),
    resultKey: text('result_key'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});
```

- [ ] **Step 2: 提交**

```bash
cd D:/project/splat3d-web
git add drizzle/schema.ts
git commit -m "feat: 添加 reconstruction_jobs 表到数据库 schema"
```

---

### Task 11.2: 重建 API

**文件:**
- 新建: `splat3d-web/src/routes/api/reconstruct/+server.ts`
- 新建: `splat3d-web/src/routes/api/reconstruct/[id]/+server.ts`

- [ ] **Step 1: 创建重建任务 API**

新建 `splat3d-web/src/routes/api/reconstruct/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { reconstructionJobs, users } from '../../../../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getPlanLimits } from '$lib/server/plan-limits';
import { uploadToR2 } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    const limits = getPlanLimits(locals.user.plan);

    if (limits.maxReconstructions === 0) {
        return json({ error: 'AI reconstruction is not available on the Free plan. Upgrade to Pro.' }, { status: 403 });
    }

    // 检查本月重建次数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(reconstructionJobs)
        .where(
            and(
                eq(reconstructionJobs.userId, locals.user.id),
                sql`${reconstructionJobs.createdAt} >= ${monthStart.toISOString()}`
            )
        );

    if (monthlyCount[0].count >= limits.maxReconstructions) {
        return json({ error: `Monthly reconstruction limit reached (${limits.maxReconstructions}). Resets next month.` }, { status: 403 });
    }

    const formData = await request.formData();
    const photos = formData.getAll('photos') as File[];

    if (photos.length < 3) {
        return json({ error: 'At least 3 photos required' }, { status: 400 });
    }

    if (photos.length > 200) {
        return json({ error: 'Maximum 200 photos per reconstruction' }, { status: 400 });
    }

    // 创建任务记录
    const job = await db
        .insert(reconstructionJobs)
        .values({
            userId: locals.user.id,
            status: 'uploading',
            photoCount: photos.length
        })
        .returning();

    const jobId = job[0].id;
    const photosKey = `reconstructions/${locals.user.id}/${jobId}`;

    // 上传照片到 R2
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const key = `${photosKey}/${i}_${photo.name}`;
        const buffer = await photo.arrayBuffer();
        await uploadToR2(env.R2_BUCKET, key, buffer, photo.type || 'image/jpeg');
    }

    // 更新任务状态为 pending（等待 SfM 处理）
    await db
        .update(reconstructionJobs)
        .set({
            status: 'pending',
            photosKey,
            updatedAt: new Date()
        })
        .where(eq(reconstructionJobs.id, jobId));

    // TODO: 通知 Hetzner VPS 开始 SfM 处理（Phase 3 后续对接）

    return json({ success: true, jobId });
};

// 列出用户的重建任务
export const GET: RequestHandler = async ({ locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createDb(platform!.env.DATABASE_URL);

    const jobs = await db
        .select()
        .from(reconstructionJobs)
        .where(eq(reconstructionJobs.userId, locals.user.id))
        .orderBy(sql`${reconstructionJobs.createdAt} DESC`)
        .limit(20);

    return json({ jobs });
};
```

- [ ] **Step 2: 创建重建状态查询 API**

新建 `splat3d-web/src/routes/api/reconstruct/[id]/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { reconstructionJobs } from '../../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createDb(platform!.env.DATABASE_URL);

    const job = await db
        .select()
        .from(reconstructionJobs)
        .where(
            and(
                eq(reconstructionJobs.id, params.id),
                eq(reconstructionJobs.userId, locals.user.id)
            )
        );

    if (job.length === 0) {
        return json({ error: 'Job not found' }, { status: 404 });
    }

    return json({ job: job[0] });
};
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/api/reconstruct/
git commit -m "feat: 添加 AI 重建任务 API（创建/列表/状态查询）"
```

---

### Task 11.3: 重建页面

**文件:**
- 新建: `splat3d-web/src/routes/reconstruct/+page.server.ts`
- 新建: `splat3d-web/src/routes/reconstruct/+page.svelte`
- 新建: `splat3d-web/src/lib/components/ReconstructionUpload.svelte`

- [ ] **Step 1: 创建重建页面服务端**

新建 `splat3d-web/src/routes/reconstruct/+page.server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { reconstructionJobs } from '../../../drizzle/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getPlanLimits } from '$lib/server/plan-limits';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform }) => {
    if (!locals.user) {
        redirect(302, '/login');
    }

    const db = createDb(platform!.env.DATABASE_URL);
    const limits = getPlanLimits(locals.user.plan);

    // 本月已用次数
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(reconstructionJobs)
        .where(
            and(
                eq(reconstructionJobs.userId, locals.user.id),
                sql`${reconstructionJobs.createdAt} >= ${monthStart.toISOString()}`
            )
        );

    const jobs = await db
        .select()
        .from(reconstructionJobs)
        .where(eq(reconstructionJobs.userId, locals.user.id))
        .orderBy(sql`${reconstructionJobs.createdAt} DESC`)
        .limit(10);

    return {
        plan: locals.user.plan,
        maxReconstructions: limits.maxReconstructions,
        usedReconstructions: monthlyCount[0].count,
        jobs
    };
};
```

- [ ] **Step 2: 创建照片上传组件**

新建 `splat3d-web/src/lib/components/ReconstructionUpload.svelte`：

```svelte
<script lang="ts">
    interface Props {
        disabled: boolean;
    }
    let { disabled }: Props = $props();

    let files: FileList | null = $state(null);
    let uploading = $state(false);
    let error = $state('');
    let success = $state('');

    async function handleSubmit() {
        if (!files || files.length < 3) {
            error = 'Please select at least 3 photos.';
            return;
        }

        uploading = true;
        error = '';
        success = '';

        const formData = new FormData();
        for (const file of files) {
            formData.append('photos', file);
        }

        const res = await fetch('/api/reconstruct', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            success = `Reconstruction started! Job ID: ${data.jobId}`;
            files = null;
        } else {
            error = data.error || 'Failed to start reconstruction';
        }

        uploading = false;
    }
</script>

<div class="card bg-base-200">
    <div class="card-body">
        <h2 class="card-title">New Reconstruction</h2>
        <p class="text-sm text-base-content/70">
            Upload 3-200 photos of your scene. Our AI will generate a 3D Gaussian Splat model.
        </p>

        {#if error}
            <div class="alert alert-error text-sm mt-2">
                <span>{error}</span>
            </div>
        {/if}

        {#if success}
            <div class="alert alert-success text-sm mt-2">
                <span>{success}</span>
            </div>
        {/if}

        <div class="form-control mt-4">
            <input
                type="file"
                accept="image/*"
                multiple
                class="file-input file-input-bordered w-full"
                onchange={(e) => files = (e.target as HTMLInputElement).files}
                {disabled}
            />
            {#if files}
                <label class="label">
                    <span class="label-text-alt">{files.length} photos selected</span>
                </label>
            {/if}
        </div>

        <div class="card-actions mt-4">
            <button
                class="btn btn-primary"
                onclick={handleSubmit}
                disabled={disabled || uploading || !files || files.length < 3}
            >
                {uploading ? 'Uploading...' : 'Start Reconstruction'}
            </button>
        </div>
    </div>
</div>
```

- [ ] **Step 3: 创建重建页面**

新建 `splat3d-web/src/routes/reconstruct/+page.svelte`：

```svelte
<script lang="ts">
    import ReconstructionUpload from '$lib/components/ReconstructionUpload.svelte';
    import UpgradePrompt from '$lib/components/UpgradePrompt.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const canReconstruct = data.maxReconstructions > 0 && data.usedReconstructions < data.maxReconstructions;

    const statusBadge = (status: string) => {
        switch (status) {
            case 'completed': return 'badge-success';
            case 'failed': return 'badge-error';
            case 'processing': return 'badge-info';
            default: return 'badge-warning';
        }
    };
</script>

<svelte:head>
    <title>AI Reconstruction - Splat3D</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-3xl">
    <h1 class="text-2xl font-bold mb-2">AI 3D Reconstruction</h1>
    <p class="text-base-content/60 mb-8">
        Upload photos and let our AI create a 3D Gaussian Splat model.
    </p>

    {#if data.maxReconstructions === 0}
        <UpgradePrompt message="AI reconstruction is available on Pro and Business plans." />
    {:else}
        <div class="stats shadow mb-6">
            <div class="stat">
                <div class="stat-title">Monthly Usage</div>
                <div class="stat-value text-lg">{data.usedReconstructions} / {data.maxReconstructions}</div>
                <div class="stat-desc">Resets on the 1st of each month</div>
            </div>
        </div>

        <div class="mb-8">
            <ReconstructionUpload disabled={!canReconstruct} />
        </div>

        {#if !canReconstruct}
            <div class="alert alert-warning mb-6">
                <span>Monthly reconstruction limit reached.</span>
            </div>
        {/if}
    {/if}

    <!-- 历史任务列表 -->
    {#if data.jobs.length > 0}
        <h2 class="text-xl font-semibold mb-4">Recent Jobs</h2>
        <div class="overflow-x-auto">
            <table class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Photos</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.jobs as job}
                        <tr>
                            <td>{new Date(job.createdAt).toLocaleDateString()}</td>
                            <td>{job.photoCount}</td>
                            <td>
                                <span class="badge {statusBadge(job.status)} badge-sm">
                                    {job.status}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>
```

- [ ] **Step 4: 更新导航栏添加 Reconstruct 链接**

在 `splat3d-web/src/lib/components/Navbar.svelte` 中已登录用户的菜单添加 Reconstruct 链接。

找到：
```svelte
{#if user}
    <li><a href="/dashboard">Dashboard</a></li>
{/if}
```

替换为：
```svelte
{#if user}
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/reconstruct">AI Reconstruct</a></li>
{/if}
```

- [ ] **Step 5: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/reconstruct/ src/lib/components/ReconstructionUpload.svelte src/lib/components/Navbar.svelte
git commit -m "feat: 添加 AI 重建页面（照片上传、任务列表、限额控制）"
```

---

### Task 12.1: 构建验证

- [ ] **Step 1: 构建商业外壳**

```bash
cd D:/project/splat3d-web
npm run build
```

预期：构建成功，所有新路由正确编译。

- [ ] **Step 2: 构建编辑器**

```bash
cd D:/project/supersplat
npm install && npm run build
```

预期：Rollup 构建成功。

---

## 自审查对照

| 设计规格要求 | 对应 Task | 状态 |
|-------------|----------|------|
| 水印系统 | Task 10.1, 10.2 | 已覆盖 |
| 免费/Pro 功能门控 | Task 9.1, 9.2, 9.3 | 已覆盖 |
| 使用量限额 | Task 9.1, 9.2, 9.3, 11.2 | 已覆盖 |
| 存储统计 | Task 9.3, 9.4, 9.5 | 已覆盖 |
| 照片上传→重建管线 | Task 11.1, 11.2, 11.3 | 前端+API 已覆盖 |
| Hetzner VPS + GLOMAP SfM | — | 需要实际 VPS 部署，非代码任务 |
