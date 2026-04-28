# Splat3D Phase 2 实施计划：商业化功能（第 5-8 周）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 在 Phase 1 基础上完成商业化核心功能 —— Stripe 支付集成、一键发布系统、营销站点增强和 SEO 优化，达到 MVP 上线状态。

**架构：** 在现有 SvelteKit 商业外壳（D:\project\splat3d-web）上扩展，新增 Stripe 支付流程、发布管理、公开查看页等功能模块。

**技术栈：** SvelteKit 2 / Stripe SDK / Drizzle ORM / Neon PostgreSQL / Cloudflare (Pages + Workers + R2 + KV)

---

## 文件结构

Phase 2 在 `D:\project\splat3d-web` 中新增/修改的文件：

```
splat3d-web/
├── package.json                                    ← 修改：添加 stripe 依赖
├── wrangler.toml                                   ← 修改：添加 Stripe 环境变量
├── src/
│   ├── app.d.ts                                    ← 修改：添加 Stripe 相关类型
│   ├── lib/
│   │   ├── server/
│   │   │   ├── stripe.ts                           ← 新建：Stripe 客户端工厂
│   │   │   └── publish.ts                          ← 新建：发布工具函数
│   │   └── components/
│   │       └── PublishModal.svelte                 ← 新建：发布模态框
│   └── routes/
│       ├── +page.svelte                            ← 修改：落地页增强
│       ├── pricing/+page.svelte                    ← 修改：连接 Stripe Checkout
│       ├── pricing/+page.server.ts                 ← 新建：定价页服务端逻辑
│       ├── features/+page.svelte                   ← 新建：功能介绍页
│       ├── billing/+page.svelte                    ← 新建：订阅管理页
│       ├── billing/+page.server.ts                 ← 新建：订阅管理服务端
│       ├── view/[slug]/+page.svelte                ← 新建：公开查看页
│       ├── view/[slug]/+page.server.ts             ← 新建：公开查看服务端
│       ├── projects/[id]/+page.svelte              ← 修改：添加发布按钮
│       ├── api/
│       │   ├── billing/
│       │   │   ├── checkout/+server.ts             ← 新建：Stripe Checkout 会话
│       │   │   ├── portal/+server.ts               ← 新建：Stripe Customer Portal
│       │   │   └── webhook/+server.ts              ← 新建：Stripe Webhook
│       │   └── publish/
│       │       ├── +server.ts                      ← 新建：发布/取消发布 API
│       │       └── [id]/views/+server.ts           ← 新建：查看统计 API
│       └── sitemap.xml/+server.ts                  ← 新建：SEO Sitemap
├── drizzle/
│   └── schema.ts                                   ← 修改：添加 publish_views 表
```

---

### Task 5.1: 添加 Stripe 依赖和配置

**文件:**
- 修改: `splat3d-web/package.json`
- 修改: `splat3d-web/wrangler.toml`
- 修改: `splat3d-web/src/app.d.ts`
- 新建: `splat3d-web/src/lib/server/stripe.ts`

- [ ] **Step 1: 添加 stripe 依赖**

在 `splat3d-web/package.json` 的 `dependencies` 中添加：

```json
"stripe": "^17.0.0"
```

然后运行：

```bash
cd D:/project/splat3d-web
npm install stripe@^17.0.0
```

- [ ] **Step 2: 更新 wrangler.toml 添加 Stripe 环境变量**

在 `splat3d-web/wrangler.toml` 的 `[vars]` 部分添加：

```toml
STRIPE_PUBLISHABLE_KEY = "pk_test_placeholder"
```

注意：`STRIPE_SECRET_KEY` 和 `STRIPE_WEBHOOK_SECRET` 是敏感信息，需要通过 `wrangler secret put` 设置，不放在 toml 中。

- [ ] **Step 3: 更新 app.d.ts 添加 Stripe 类型**

在 `splat3d-web/src/app.d.ts` 的 `Platform.env` 接口中添加：

```typescript
STRIPE_SECRET_KEY: string;
STRIPE_WEBHOOK_SECRET: string;
STRIPE_PUBLISHABLE_KEY: string;
STRIPE_PRO_PRICE_ID: string;
STRIPE_BUSINESS_PRICE_ID: string;
```

- [ ] **Step 4: 创建 Stripe 客户端工厂**

新建 `splat3d-web/src/lib/server/stripe.ts`：

```typescript
import Stripe from 'stripe';

export function createStripe(secretKey: string): Stripe {
    return new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia',
        httpClient: Stripe.createFetchHttpClient()
    });
}
```

- [ ] **Step 5: 提交**

```bash
cd D:/project/splat3d-web
git add package.json package-lock.json wrangler.toml src/app.d.ts src/lib/server/stripe.ts
git commit -m "feat: 添加 Stripe 依赖和配置"
```

---

### Task 5.2: Stripe Checkout 和 Customer Portal API

**文件:**
- 新建: `splat3d-web/src/routes/api/billing/checkout/+server.ts`
- 新建: `splat3d-web/src/routes/api/billing/portal/+server.ts`

- [ ] **Step 1: 创建 Checkout 会话 API**

新建 `splat3d-web/src/routes/api/billing/checkout/+server.ts`：

```typescript
import { json, redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { createStripe } from '$lib/server/stripe';
import { subscriptions, users } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform, url }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const stripe = createStripe(env.STRIPE_SECRET_KEY);
    const db = createDb(env.DATABASE_URL);

    const formData = await request.formData();
    const plan = formData.get('plan') as string;

    if (plan !== 'pro' && plan !== 'business') {
        return json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = plan === 'pro' ? env.STRIPE_PRO_PRICE_ID : env.STRIPE_BUSINESS_PRICE_ID;

    // 查找或创建 Stripe Customer
    const existingSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, locals.user.id));

    let customerId: string;

    if (existingSub.length > 0 && existingSub[0].stripeCustomerId) {
        customerId = existingSub[0].stripeCustomerId;
    } else {
        const customer = await stripe.customers.create({
            email: locals.user.email,
            metadata: { userId: locals.user.id }
        });
        customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${url.origin}/billing?success=true`,
        cancel_url: `${url.origin}/pricing?canceled=true`,
        metadata: { userId: locals.user.id, plan }
    });

    if (session.url) {
        redirect(303, session.url);
    }

    return json({ error: 'Failed to create checkout session' }, { status: 500 });
};
```

- [ ] **Step 2: 创建 Customer Portal API**

新建 `splat3d-web/src/routes/api/billing/portal/+server.ts`：

```typescript
import { json, redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { createStripe } from '$lib/server/stripe';
import { subscriptions } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, platform, url }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const stripe = createStripe(env.STRIPE_SECRET_KEY);
    const db = createDb(env.DATABASE_URL);

    const existingSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, locals.user.id));

    if (existingSub.length === 0 || !existingSub[0].stripeCustomerId) {
        return json({ error: 'No subscription found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: existingSub[0].stripeCustomerId,
        return_url: `${url.origin}/billing`
    });

    redirect(303, session.url);
};
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/api/billing/
git commit -m "feat: 添加 Stripe Checkout 和 Customer Portal API"
```

---

### Task 5.3: Stripe Webhook 处理

**文件:**
- 新建: `splat3d-web/src/routes/api/billing/webhook/+server.ts`

- [ ] **Step 1: 创建 Webhook 处理 API**

新建 `splat3d-web/src/routes/api/billing/webhook/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { createStripe } from '$lib/server/stripe';
import { subscriptions, users } from '../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
    const env = platform!.env;
    const stripe = createStripe(env.STRIPE_SECRET_KEY);
    const db = createDb(env.DATABASE_URL);

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        return json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const userId = session.metadata?.userId;
            const plan = session.metadata?.plan;
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;

            if (!userId || !plan) break;

            // 获取订阅详情
            const sub = await stripe.subscriptions.retrieve(subscriptionId);

            await db
                .insert(subscriptions)
                .values({
                    userId,
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    plan,
                    status: 'active',
                    currentPeriodStart: new Date(sub.current_period_start * 1000),
                    currentPeriodEnd: new Date(sub.current_period_end * 1000)
                })
                .onConflictDoUpdate({
                    target: subscriptions.userId,
                    set: {
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: subscriptionId,
                        plan,
                        status: 'active',
                        currentPeriodStart: new Date(sub.current_period_start * 1000),
                        currentPeriodEnd: new Date(sub.current_period_end * 1000),
                        updatedAt: new Date()
                    }
                });

            // 更新用户计划
            await db
                .update(users)
                .set({ plan, updatedAt: new Date() })
                .where(eq(users.id, userId));
            break;
        }

        case 'customer.subscription.updated': {
            const sub = event.data.object;
            const subscriptionId = sub.id;

            const status = sub.cancel_at_period_end ? 'canceled' : sub.status === 'active' ? 'active' : 'past_due';

            await db
                .update(subscriptions)
                .set({
                    status,
                    currentPeriodStart: new Date(sub.current_period_start * 1000),
                    currentPeriodEnd: new Date(sub.current_period_end * 1000),
                    updatedAt: new Date()
                })
                .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
            break;
        }

        case 'customer.subscription.deleted': {
            const sub = event.data.object;
            const subscriptionId = sub.id;

            // 查找订阅找到用户
            const subRecord = await db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

            if (subRecord.length > 0) {
                await db
                    .update(subscriptions)
                    .set({ status: 'canceled', updatedAt: new Date() })
                    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

                // 降级到 free
                await db
                    .update(users)
                    .set({ plan: 'free', updatedAt: new Date() })
                    .where(eq(users.id, subRecord[0].userId));
            }
            break;
        }
    }

    return json({ received: true });
};
```

- [ ] **Step 2: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/api/billing/webhook/
git commit -m "feat: 添加 Stripe Webhook 处理（订阅创建/更新/取消）"
```

---

### Task 5.4: 订阅管理页和定价页升级

**文件:**
- 新建: `splat3d-web/src/routes/billing/+page.server.ts`
- 新建: `splat3d-web/src/routes/billing/+page.svelte`
- 新建: `splat3d-web/src/routes/pricing/+page.server.ts`
- 修改: `splat3d-web/src/routes/pricing/+page.svelte`

- [ ] **Step 1: 创建订阅管理服务端**

新建 `splat3d-web/src/routes/billing/+page.server.ts`：

```typescript
import { redirect } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { subscriptions } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
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

    const success = url.searchParams.get('success') === 'true';

    return {
        subscription: sub.length > 0 ? sub[0] : null,
        plan: locals.user.plan,
        success
    };
};
```

- [ ] **Step 2: 创建订阅管理页面**

新建 `splat3d-web/src/routes/billing/+page.svelte`：

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

    {#if data.plan !== 'free'}
        <div class="card bg-base-200 mt-6">
            <div class="card-body">
                <h2 class="card-title">Usage</h2>
                <div class="mt-2 space-y-3">
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span>Storage</span>
                            <span>Used / {data.plan === 'pro' ? '50 GB' : '500 GB'}</span>
                        </div>
                        <progress class="progress progress-primary w-full" value="0" max="100"></progress>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
```

- [ ] **Step 3: 创建定价页服务端**

新建 `splat3d-web/src/routes/pricing/+page.server.ts`：

```typescript
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    return {
        user: locals.user,
        canceled: url.searchParams.get('canceled') === 'true'
    };
};
```

- [ ] **Step 4: 更新定价页连接 Stripe Checkout**

将 `splat3d-web/src/routes/pricing/+page.svelte` 替换为：

```svelte
<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>Pricing - Splat3D</title>
</svelte:head>

<section class="py-20 bg-base-100">
    <div class="container mx-auto px-4">
        <h1 class="text-4xl font-bold text-center mb-4">Simple Pricing</h1>
        <p class="text-center text-base-content/60 mb-12">Start free, upgrade as you grow</p>

        {#if data.canceled}
            <div class="alert alert-info max-w-md mx-auto mb-8">
                <span>Checkout was canceled. You can try again anytime.</span>
            </div>
        {/if}

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
                        {#if data.user}
                            <span class="btn btn-ghost btn-block btn-disabled">
                                {data.user.plan === 'free' ? 'Current Plan' : '—'}
                            </span>
                        {:else}
                            <a href="/login" class="btn btn-outline btn-block">Get Started</a>
                        {/if}
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
                        {#if data.user?.plan === 'pro'}
                            <span class="btn btn-secondary btn-block btn-disabled">Current Plan</span>
                        {:else}
                            <form method="POST" action="/api/billing/checkout">
                                <input type="hidden" name="plan" value="pro" />
                                <button type="submit" class="btn btn-secondary btn-block">
                                    {data.user ? 'Upgrade to Pro' : 'Start Pro Trial'}
                                </button>
                            </form>
                        {/if}
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
                        {#if data.user?.plan === 'business'}
                            <span class="btn btn-ghost btn-block btn-disabled">Current Plan</span>
                        {:else}
                            <form method="POST" action="/api/billing/checkout">
                                <input type="hidden" name="plan" value="business" />
                                <button type="submit" class="btn btn-outline btn-block">
                                    {data.user ? 'Upgrade to Business' : 'Start Business Trial'}
                                </button>
                            </form>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <p class="text-center text-sm text-base-content/40 mt-8">
            Annual billing: Pro $144/year (save 20%), Business $374/year (save 20%)
        </p>
    </div>
</section>
```

- [ ] **Step 5: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/billing/ src/routes/pricing/
git commit -m "feat: 添加订阅管理页和升级定价页（连接 Stripe Checkout）"
```

---

### Task 6.1: 数据库扩展 — 添加 publish_views 表

**文件:**
- 修改: `splat3d-web/drizzle/schema.ts`

- [ ] **Step 1: 添加 publish_views 表**

在 `splat3d-web/drizzle/schema.ts` 末尾添加：

```typescript
export const publishViews = pgTable('publish_views', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
    country: text('country'),
    referer: text('referer')
});
```

- [ ] **Step 2: 提交**

```bash
cd D:/project/splat3d-web
git add drizzle/schema.ts
git commit -m "feat: 添加 publish_views 表到数据库 schema"
```

---

### Task 6.2: 发布工具函数和发布 API

**文件:**
- 新建: `splat3d-web/src/lib/server/publish.ts`
- 新建: `splat3d-web/src/routes/api/publish/+server.ts`

- [ ] **Step 1: 创建发布工具函数**

新建 `splat3d-web/src/lib/server/publish.ts`：

```typescript
const SLUG_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SLUG_LENGTH = 8;

export function generateSlug(): string {
    let slug = '';
    const array = new Uint8Array(SLUG_LENGTH);
    crypto.getRandomValues(array);
    for (let i = 0; i < SLUG_LENGTH; i++) {
        slug += SLUG_CHARS[array[i] % SLUG_CHARS.length];
    }
    return slug;
}

export function getEmbedCode(origin: string, slug: string): string {
    return `<iframe src="${origin}/view/${slug}" width="800" height="600" frameborder="0" allow="clipboard-read; clipboard-write" allowfullscreen></iframe>`;
}
```

- [ ] **Step 2: 创建发布 API**

新建 `splat3d-web/src/routes/api/publish/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug, getEmbedCode } from '$lib/server/publish';
import type { RequestHandler } from './$types';

// 发布项目
export const POST: RequestHandler = async ({ request, locals, platform, url }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    const { projectId } = await request.json();

    if (!projectId) {
        return json({ error: 'Missing projectId' }, { status: 400 });
    }

    const projectList = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, locals.user.id)));

    if (projectList.length === 0) {
        return json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projectList[0];

    if (!project.fileKey) {
        return json({ error: 'No file uploaded yet' }, { status: 400 });
    }

    // 如果已有 slug 则复用，否则生成新的
    const slug = project.publishSlug || generateSlug();

    await db
        .update(projects)
        .set({
            isPublished: true,
            publishSlug: slug,
            updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

    return json({
        success: true,
        slug,
        viewUrl: `${url.origin}/view/${slug}`,
        embedCode: getEmbedCode(url.origin, slug)
    });
};

// 取消发布
export const DELETE: RequestHandler = async ({ request, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    const { projectId } = await request.json();

    await db
        .update(projects)
        .set({
            isPublished: false,
            updatedAt: new Date()
        })
        .where(and(eq(projects.id, projectId), eq(projects.userId, locals.user.id)));

    return json({ success: true });
};
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/lib/server/publish.ts src/routes/api/publish/
git commit -m "feat: 添加发布工具函数和发布/取消发布 API"
```

---

### Task 6.3: 公开查看页和查看统计

**文件:**
- 新建: `splat3d-web/src/routes/view/[slug]/+page.server.ts`
- 新建: `splat3d-web/src/routes/view/[slug]/+page.svelte`
- 新建: `splat3d-web/src/routes/api/publish/[id]/views/+server.ts`

- [ ] **Step 1: 创建公开查看页服务端**

新建 `splat3d-web/src/routes/view/[slug]/+page.server.ts`：

```typescript
import { error } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects, publishViews } from '../../../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform, request }) => {
    const db = createDb(platform!.env.DATABASE_URL);

    const projectList = await db
        .select()
        .from(projects)
        .where(eq(projects.publishSlug, params.slug));

    if (projectList.length === 0 || !projectList[0].isPublished) {
        error(404, 'Not found');
    }

    const project = projectList[0];

    // 记录查看次数（异步，不阻塞页面渲染）
    const country = request.headers.get('cf-ipcountry') || null;
    const referer = request.headers.get('referer') || null;

    platform!.context.waitUntil(
        (async () => {
            await db.insert(publishViews).values({
                projectId: project.id,
                country,
                referer
            });
            await db
                .update(projects)
                .set({ viewCount: sql`${projects.viewCount} + 1` })
                .where(eq(projects.id, project.id));
        })()
    );

    const editorUrl = platform!.env.PUBLIC_EDITOR_URL || '/editor';

    let fileDownloadUrl: string | null = null;
    if (project.fileKey) {
        fileDownloadUrl = `/api/files/public/${params.slug}`;
    }

    return {
        project: {
            name: project.name,
            description: project.description,
            slug: project.publishSlug
        },
        editorUrl,
        fileDownloadUrl
    };
};
```

- [ ] **Step 2: 创建公开查看页面**

新建 `splat3d-web/src/routes/view/[slug]/+page.svelte`：

```svelte
<script lang="ts">
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    let iframeRef: HTMLIFrameElement | undefined = $state();
    let editorReady = $state(false);

    const MSG_PREFIX = 'splat3d:';

    function handleMessage(event: MessageEvent) {
        const msg = event.data;
        if (msg?.type === `${MSG_PREFIX}ready`) {
            editorReady = true;
            if (data.fileDownloadUrl) {
                iframeRef?.contentWindow?.postMessage({
                    type: `${MSG_PREFIX}load`,
                    url: data.fileDownloadUrl,
                    filename: data.project.name
                }, '*');
            }
        }
    }

    $effect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    });
</script>

<svelte:head>
    <title>{data.project.name} - Splat3D</title>
    <meta name="description" content="{data.project.description || '3D Gaussian Splat viewer'}" />
</svelte:head>

<div class="h-screen flex flex-col">
    <!-- 顶部窄条 -->
    <div class="h-10 bg-base-100 border-b border-base-300 flex items-center px-4">
        <span class="font-semibold flex-1 truncate text-sm">{data.project.name}</span>
        <a href="/" class="text-xs text-base-content/50 hover:text-primary">
            Powered by Splat3D
        </a>
    </div>

    <!-- 编辑器 iframe（只读模式） -->
    <iframe
        bind:this={iframeRef}
        src="{data.editorUrl}?mode=viewer"
        class="w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
        title="{data.project.name} - 3D Viewer"
    ></iframe>
</div>
```

- [ ] **Step 3: 创建公开文件下载 API**

新建 `splat3d-web/src/routes/api/files/public/[slug]/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects } from '../../../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { downloadFromR2 } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    const projectList = await db
        .select()
        .from(projects)
        .where(eq(projects.publishSlug, params.slug));

    if (projectList.length === 0 || !projectList[0].isPublished || !projectList[0].fileKey) {
        return json({ error: 'Not found' }, { status: 404 });
    }

    const r2Object = await downloadFromR2(env.R2_BUCKET, projectList[0].fileKey);
    if (!r2Object) {
        return json({ error: 'File not found' }, { status: 404 });
    }

    return new Response(r2Object.body, {
        headers: {
            'Content-Type': r2Object.httpMetadata?.contentType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=86400'
        }
    });
};
```

- [ ] **Step 4: 创建查看统计 API**

新建 `splat3d-web/src/routes/api/publish/[id]/views/+server.ts`：

```typescript
import { json } from '@sveltejs/kit';
import { createDb } from '$lib/server/db';
import { projects, publishViews } from '../../../../../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, platform }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const env = platform!.env;
    const db = createDb(env.DATABASE_URL);

    // 验证项目归属
    const projectList = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, params.id), eq(projects.userId, locals.user.id)));

    if (projectList.length === 0) {
        return json({ error: 'Project not found' }, { status: 404 });
    }

    const totalViews = projectList[0].viewCount;

    // 最近 30 天按天统计
    const dailyViews = await db
        .select({
            date: sql<string>`DATE(${publishViews.viewedAt})`.as('date'),
            count: sql<number>`COUNT(*)`.as('count')
        })
        .from(publishViews)
        .where(eq(publishViews.projectId, params.id))
        .groupBy(sql`DATE(${publishViews.viewedAt})`)
        .orderBy(desc(sql`DATE(${publishViews.viewedAt})`))
        .limit(30);

    // 按国家统计
    const countryViews = await db
        .select({
            country: publishViews.country,
            count: sql<number>`COUNT(*)`.as('count')
        })
        .from(publishViews)
        .where(eq(publishViews.projectId, params.id))
        .groupBy(publishViews.country)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

    return json({ totalViews, dailyViews, countryViews });
};
```

- [ ] **Step 5: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/view/ src/routes/api/files/public/ src/routes/api/publish/
git commit -m "feat: 添加公开查看页、公开文件下载和查看统计 API"
```

---

### Task 6.4: 编辑器页面添加发布功能

**文件:**
- 新建: `splat3d-web/src/lib/components/PublishModal.svelte`
- 修改: `splat3d-web/src/routes/projects/[id]/+page.svelte`

- [ ] **Step 1: 创建发布模态框组件**

新建 `splat3d-web/src/lib/components/PublishModal.svelte`：

```svelte
<script lang="ts">
    interface Props {
        projectId: string;
        isPublished: boolean;
        publishSlug: string | null;
        onclose: () => void;
    }

    let { projectId, isPublished, publishSlug, onclose }: Props = $props();

    let publishing = $state(false);
    let viewUrl = $state(publishSlug ? `${window.location.origin}/view/${publishSlug}` : '');
    let embedCode = $state('');
    let copied = $state('');

    async function publish() {
        publishing = true;
        const res = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });
        const data = await res.json();
        if (data.success) {
            isPublished = true;
            publishSlug = data.slug;
            viewUrl = data.viewUrl;
            embedCode = data.embedCode;
        }
        publishing = false;
    }

    async function unpublish() {
        publishing = true;
        await fetch('/api/publish', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });
        isPublished = false;
        publishing = false;
    }

    function copyToClipboard(text: string, label: string) {
        navigator.clipboard.writeText(text);
        copied = label;
        setTimeout(() => copied = '', 2000);
    }
</script>

<div class="modal modal-open">
    <div class="modal-box">
        <h3 class="text-lg font-bold">Publish Project</h3>

        {#if isPublished}
            <div class="mt-4 space-y-4">
                <div class="alert alert-success">
                    <span>Your project is live!</span>
                </div>

                <div>
                    <label class="label"><span class="label-text">Share Link</span></label>
                    <div class="join w-full">
                        <input type="text" class="input input-bordered join-item flex-1" value={viewUrl} readonly />
                        <button class="btn join-item" onclick={() => copyToClipboard(viewUrl, 'url')}>
                            {copied === 'url' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div>
                    <label class="label"><span class="label-text">Embed Code</span></label>
                    <div class="join w-full">
                        <input type="text" class="input input-bordered join-item flex-1 font-mono text-xs" value={embedCode} readonly />
                        <button class="btn join-item" onclick={() => copyToClipboard(embedCode, 'embed')}>
                            {copied === 'embed' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <button class="btn btn-error btn-sm" onclick={unpublish} disabled={publishing}>
                    Unpublish
                </button>
            </div>
        {:else}
            <p class="mt-4 text-base-content/70">
                Publishing makes your project accessible via a public link. Anyone with the link can view it.
            </p>
            <div class="modal-action">
                <button class="btn" onclick={onclose}>Cancel</button>
                <button class="btn btn-primary" onclick={publish} disabled={publishing}>
                    {publishing ? 'Publishing...' : 'Publish Now'}
                </button>
            </div>
        {/if}

        {#if isPublished}
            <div class="modal-action">
                <button class="btn" onclick={onclose}>Close</button>
            </div>
        {/if}
    </div>
    <div class="modal-backdrop" onclick={onclose}></div>
</div>
```

- [ ] **Step 2: 更新编辑器页面添加发布按钮**

将 `splat3d-web/src/routes/projects/[id]/+page.svelte` 替换为：

```svelte
<script lang="ts">
    import type { PageData } from './$types';
    import PublishModal from '$lib/components/PublishModal.svelte';

    let { data }: { data: PageData } = $props();
    let iframeRef: HTMLIFrameElement | undefined = $state();
    let isDirty = $state(false);
    let editorReady = $state(false);
    let showPublishModal = $state(false);

    const MSG_PREFIX = 'splat3d:';

    function handleMessage(event: MessageEvent) {
        const msg = event.data;
        if (!msg?.type?.startsWith(MSG_PREFIX)) return;

        switch (msg.type) {
            case `${MSG_PREFIX}ready`:
                editorReady = true;
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
        <button class="btn btn-ghost btn-sm" onclick={() => showPublishModal = true} disabled={!editorReady}>
            {data.project.isPublished ? 'Published' : 'Publish'}
        </button>
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

{#if showPublishModal}
    <PublishModal
        projectId={data.project.id}
        isPublished={data.project.isPublished}
        publishSlug={data.project.publishSlug}
        onclose={() => showPublishModal = false}
    />
{/if}
```

- [ ] **Step 3: 提交**

```bash
cd D:/project/splat3d-web
git add src/lib/components/PublishModal.svelte src/routes/projects/
git commit -m "feat: 添加发布模态框和编辑器页面发布功能"
```

---

### Task 7.1: 落地页增强

**文件:**
- 修改: `splat3d-web/src/routes/+page.svelte`

- [ ] **Step 1: 增强落地页**

将 `splat3d-web/src/routes/+page.svelte` 替换为：

```svelte
<svelte:head>
    <title>Splat3D - Create, Edit & Publish 3D Gaussian Splats</title>
    <meta name="description" content="Browser-based platform for 3D Gaussian Splat creation, editing and publishing. No installation required. 20 languages supported." />
    <meta property="og:title" content="Splat3D - 3D Gaussian Splat Platform" />
    <meta property="og:description" content="Create, edit, and publish 3D Gaussian Splats directly from your browser." />
    <meta property="og:type" content="website" />
    <link rel="canonical" href="https://splat3d.com" />
</svelte:head>

<!-- Hero -->
<section class="hero min-h-[80vh] bg-gradient-to-br from-base-100 via-base-200 to-base-100">
    <div class="hero-content text-center">
        <div class="max-w-3xl">
            <h1 class="text-6xl font-bold leading-tight">
                <span class="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    3D Gaussian Splats
                </span>
                <br />
                <span class="text-4xl">Create. Edit. Publish.</span>
            </h1>
            <p class="py-8 text-xl text-base-content/70 max-w-xl mx-auto">
                The browser-based platform for creating, editing and publishing 3D Gaussian Splats.
                Zero installation. Global availability.
            </p>
            <div class="flex gap-4 justify-center flex-wrap">
                <a href="/login" class="btn btn-primary btn-lg">Get Started Free</a>
                <a href="/pricing" class="btn btn-outline btn-lg">View Pricing</a>
            </div>
            <p class="mt-4 text-sm text-base-content/40">No credit card required</p>
        </div>
    </div>
</section>

<!-- Features -->
<section class="py-24 bg-base-100">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-4">Everything You Need</h2>
        <p class="text-center text-base-content/60 mb-16 max-w-lg mx-auto">
            Professional 3D Gaussian Splat tools, accessible from any modern browser
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#9998;</div>
                    <h3 class="card-title">Edit</h3>
                    <p class="text-sm text-base-content/70">Professional-grade editor with selection tools, transformations, and real-time preview.</p>
                </div>
            </div>
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#9729;</div>
                    <h3 class="card-title">Publish</h3>
                    <p class="text-sm text-base-content/70">One-click publishing with shareable links and embeddable viewers for any website.</p>
                </div>
            </div>
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#128274;</div>
                    <h3 class="card-title">Cloud Storage</h3>
                    <p class="text-sm text-base-content/70">Secure cloud storage with automatic backups. Access your projects from anywhere.</p>
                </div>
            </div>
            <div class="card bg-base-200">
                <div class="card-body items-center text-center">
                    <div class="text-4xl mb-4">&#127760;</div>
                    <h3 class="card-title">Global</h3>
                    <p class="text-sm text-base-content/70">Available in 20 languages with edge-deployed infrastructure on 300+ nodes worldwide.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- How It Works -->
<section class="py-24 bg-base-200">
    <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-16">How It Works</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            <div class="text-center">
                <div class="text-5xl font-bold text-primary mb-4">1</div>
                <h3 class="font-semibold text-lg mb-2">Upload</h3>
                <p class="text-sm text-base-content/70">Upload your .ply or .splat files, or start from scratch with our editor.</p>
            </div>
            <div class="text-center">
                <div class="text-5xl font-bold text-primary mb-4">2</div>
                <h3 class="font-semibold text-lg mb-2">Edit</h3>
                <p class="text-sm text-base-content/70">Use professional tools to select, transform, crop, and refine your 3D scene.</p>
            </div>
            <div class="text-center">
                <div class="text-5xl font-bold text-primary mb-4">3</div>
                <h3 class="font-semibold text-lg mb-2">Share</h3>
                <p class="text-sm text-base-content/70">Publish with one click. Share a link or embed the viewer on your website.</p>
            </div>
        </div>
    </div>
</section>

<!-- Pricing Preview -->
<section class="py-24 bg-base-100">
    <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
        <p class="text-base-content/60 mb-8">Start free. Upgrade when you need more.</p>
        <div class="flex gap-8 justify-center flex-wrap">
            <div class="stat bg-base-200 rounded-box">
                <div class="stat-title">Free</div>
                <div class="stat-value text-2xl">$0</div>
                <div class="stat-desc">3 projects, 1 GB</div>
            </div>
            <div class="stat bg-primary text-primary-content rounded-box">
                <div class="stat-title text-primary-content/70">Pro</div>
                <div class="stat-value text-2xl">$15</div>
                <div class="stat-desc text-primary-content/70">Unlimited, 50 GB</div>
            </div>
            <div class="stat bg-base-200 rounded-box">
                <div class="stat-title">Business</div>
                <div class="stat-value text-2xl">$39</div>
                <div class="stat-desc">White label, 500 GB</div>
            </div>
        </div>
        <a href="/pricing" class="btn btn-outline mt-8">View Full Pricing</a>
    </div>
</section>

<!-- CTA -->
<section class="py-24 bg-gradient-to-r from-primary to-secondary text-primary-content">
    <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <p class="text-lg opacity-80 mb-8">Join thousands of creators using Splat3D to bring 3D to the web.</p>
        <a href="/login" class="btn btn-lg bg-white text-primary hover:bg-base-200">Create Free Account</a>
    </div>
</section>
```

- [ ] **Step 2: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/+page.svelte
git commit -m "feat: 增强落地页（How It Works、定价预览、CTA、SEO meta）"
```

---

### Task 7.2: 功能介绍页和 SEO

**文件:**
- 新建: `splat3d-web/src/routes/features/+page.svelte`
- 新建: `splat3d-web/src/routes/sitemap.xml/+server.ts`

- [ ] **Step 1: 创建功能介绍页**

新建 `splat3d-web/src/routes/features/+page.svelte`：

```svelte
<svelte:head>
    <title>Features - Splat3D</title>
    <meta name="description" content="Explore Splat3D features: browser-based 3D Gaussian Splat editing, one-click publishing, cloud storage, and 20 language support." />
</svelte:head>

<section class="py-20 bg-base-100">
    <div class="container mx-auto px-4">
        <h1 class="text-4xl font-bold text-center mb-4">Features</h1>
        <p class="text-center text-base-content/60 mb-16 max-w-lg mx-auto">
            Everything you need to create, edit, and share 3D Gaussian Splats
        </p>

        <div class="space-y-20 max-w-4xl mx-auto">
            <!-- Editor -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                    <h2 class="text-2xl font-bold mb-4">Professional Editor</h2>
                    <ul class="space-y-3 text-base-content/70">
                        <li>&#10003; Real-time 3D Gaussian Splat rendering</li>
                        <li>&#10003; Selection tools (brush, rect, sphere)</li>
                        <li>&#10003; Transform, crop, and delete operations</li>
                        <li>&#10003; Undo/redo with full history</li>
                        <li>&#10003; Export to .ply, .splat, and .spz formats</li>
                    </ul>
                </div>
                <div class="bg-base-200 rounded-box h-64 flex items-center justify-center">
                    <span class="text-6xl opacity-20">&#9998;</span>
                </div>
            </div>

            <!-- Publishing -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div class="order-2 md:order-1 bg-base-200 rounded-box h-64 flex items-center justify-center">
                    <span class="text-6xl opacity-20">&#9729;</span>
                </div>
                <div class="order-1 md:order-2">
                    <h2 class="text-2xl font-bold mb-4">One-Click Publishing</h2>
                    <ul class="space-y-3 text-base-content/70">
                        <li>&#10003; Instant shareable links</li>
                        <li>&#10003; Embeddable viewer for any website</li>
                        <li>&#10003; View analytics (countries, referrers)</li>
                        <li>&#10003; Custom branding (Business plan)</li>
                    </ul>
                </div>
            </div>

            <!-- Cloud -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                    <h2 class="text-2xl font-bold mb-4">Cloud Storage</h2>
                    <ul class="space-y-3 text-base-content/70">
                        <li>&#10003; Secure storage on Cloudflare R2</li>
                        <li>&#10003; Zero egress fees</li>
                        <li>&#10003; Access from any device</li>
                        <li>&#10003; Up to 500 GB (Business plan)</li>
                    </ul>
                </div>
                <div class="bg-base-200 rounded-box h-64 flex items-center justify-center">
                    <span class="text-6xl opacity-20">&#128274;</span>
                </div>
            </div>

            <!-- Global -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div class="order-2 md:order-1 bg-base-200 rounded-box h-64 flex items-center justify-center">
                    <span class="text-6xl opacity-20">&#127760;</span>
                </div>
                <div class="order-1 md:order-2">
                    <h2 class="text-2xl font-bold mb-4">Global & Multilingual</h2>
                    <ul class="space-y-3 text-base-content/70">
                        <li>&#10003; 20 languages supported</li>
                        <li>&#10003; Edge-deployed on 300+ global nodes</li>
                        <li>&#10003; Sub-100ms latency worldwide</li>
                        <li>&#10003; RTL language support (Arabic)</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="text-center mt-20">
            <a href="/login" class="btn btn-primary btn-lg">Try Splat3D Free</a>
        </div>
    </div>
</section>
```

- [ ] **Step 2: 创建 Sitemap**

新建 `splat3d-web/src/routes/sitemap.xml/+server.ts`：

```typescript
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const pages = [
        { path: '/', priority: '1.0', changefreq: 'weekly' },
        { path: '/pricing', priority: '0.8', changefreq: 'monthly' },
        { path: '/features', priority: '0.8', changefreq: 'monthly' },
        { path: '/login', priority: '0.5', changefreq: 'monthly' }
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `    <url>
        <loc>${url.origin}${p.path}</loc>
        <changefreq>${p.changefreq}</changefreq>
        <priority>${p.priority}</priority>
    </url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400'
        }
    });
};
```

- [ ] **Step 3: 更新导航栏添加 Features 链接**

在 `splat3d-web/src/lib/components/Navbar.svelte` 的菜单中，在 Pricing 链接后添加 Features 链接：

将现有的：
```svelte
<li><a href="/pricing">Pricing</a></li>
```

改为：
```svelte
<li><a href="/features">Features</a></li>
<li><a href="/pricing">Pricing</a></li>
```

同时在导航栏已登录用户的下拉菜单中，在 Dashboard 前添加 Billing 链接：

将现有的：
```svelte
<li><a href="/dashboard">Dashboard</a></li>
<li><a href="/api/auth/logout">Logout</a></li>
```

改为：
```svelte
<li><a href="/dashboard">Dashboard</a></li>
<li><a href="/billing">Billing</a></li>
<li><a href="/api/auth/logout">Logout</a></li>
```

- [ ] **Step 4: 更新页脚添加新链接**

在 `splat3d-web/src/lib/components/Footer.svelte` 中，更新导航链接：

将现有的：
```svelte
<nav class="grid grid-flow-col gap-4">
    <a href="/pricing" class="link link-hover">Pricing</a>
    <a href="https://github.com/playcanvas/supersplat" target="_blank" class="link link-hover">Open Source</a>
</nav>
```

改为：
```svelte
<nav class="grid grid-flow-col gap-4">
    <a href="/features" class="link link-hover">Features</a>
    <a href="/pricing" class="link link-hover">Pricing</a>
    <a href="https://github.com/playcanvas/supersplat" target="_blank" class="link link-hover">Open Source</a>
</nav>
```

- [ ] **Step 5: 提交**

```bash
cd D:/project/splat3d-web
git add src/routes/features/ src/routes/sitemap.xml/ src/lib/components/Navbar.svelte src/lib/components/Footer.svelte
git commit -m "feat: 添加功能介绍页、Sitemap 和导航更新"
```

---

### Task 8.1: 构建验证

- [ ] **Step 1: 构建商业外壳**

```bash
cd D:/project/splat3d-web
npm run build
```

预期：SvelteKit + Cloudflare adapter 构建成功，无类型错误。

- [ ] **Step 2: 验证所有路由**

确认构建输出包含以下路由：
- `/` - 落地页
- `/pricing` - 定价页
- `/features` - 功能介绍页
- `/login` - 登录页
- `/dashboard` - 仪表板
- `/billing` - 订阅管理
- `/projects/[id]` - 编辑器页面
- `/view/[slug]` - 公开查看页
- `/api/billing/checkout` - Stripe Checkout
- `/api/billing/portal` - Stripe Portal
- `/api/billing/webhook` - Stripe Webhook
- `/api/publish` - 发布 API
- `/api/publish/[id]/views` - 查看统计
- `/api/files/public/[slug]` - 公开文件下载
- `/sitemap.xml` - Sitemap

---

## 自审查对照

| 设计规格要求 | 对应 Task | 状态 |
|-------------|----------|------|
| Stripe 集成 | Task 5.1, 5.2, 5.3 | 已覆盖 |
| 订阅管理 + Stripe Customer Portal | Task 5.4 | 已覆盖 |
| 定价页连接 Stripe | Task 5.4 | 已覆盖 |
| 一键发布 | Task 6.2, 6.4 | 已覆盖 |
| 公开查看页 (view/[slug]) | Task 6.3 | 已覆盖 |
| 嵌入代码生成 | Task 6.2, 6.4 | 已覆盖 |
| 查看统计 | Task 6.3 | 已覆盖 |
| publish_views 表 | Task 6.1 | 已覆盖 |
| 落地页增强 | Task 7.1 | 已覆盖 |
| 功能介绍页 | Task 7.2 | 已覆盖 |
| SEO (meta + sitemap) | Task 7.1, 7.2 | 已覆盖 |
| 导航栏更新 | Task 7.2 | 已覆盖 |
