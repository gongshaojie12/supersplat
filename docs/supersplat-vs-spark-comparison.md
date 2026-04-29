# SuperSplat vs Spark 深度对比分析

> 分析日期：2026-04-29
>
> SuperSplat 版本：v2.24.5（PlayCanvas 团队）
> Spark 版本：v2.0.0（World Labs）

---

## 目录

1. [本质定位](#1-本质定位)
2. [技术栈对比](#2-技术栈对比)
3. [渲染能力对比](#3-渲染能力对比)
4. [编辑能力对比](#4-编辑能力对比)
5. [格式支持对比](#5-格式支持对比)
6. [性能对比](#6-性能对比)
7. [架构设计对比](#7-架构设计对比)
8. [生态与社区](#8-生态与社区)
9. [各自的核心长处](#9-各自的核心长处)
10. [各自的短板](#10-各自的短板)
11. [Splat3D 商业化的选型建议](#11-splat3d-商业化的选型建议)

---

## 1. 本质定位

这是两个项目最根本的区别，决定了后续所有对比的语境。

| 维度 | SuperSplat | Spark |
|------|-----------|-------|
| **一句话定义** | 面向终端用户的 3D Gaussian Splat **编辑器** | 面向开发者的 3D Gaussian Splat **渲染库** |
| **开发团队** | PlayCanvas 团队 | World Labs（AI 3D 公司） |
| **打开后看到什么** | 完整的编辑器界面（菜单、工具栏、面板、视口） | 什么都没有，需要写代码才能渲染 |
| **目标用户** | 3D 艺术家、内容创作者、非程序员 | 前端开发者、Three.js 用户 |
| **类比** | 相当于 Photoshop | 相当于 Canvas 2D API |
| **许可证** | MIT | MIT |
| **仓库活跃度** | 活跃维护，持续发布 | 非常活跃，583 次提交，多次日更 |

**关键结论**：两者不是竞品关系，而是互补关系。SuperSplat 是一个可以直接使用的产品，Spark 是一个需要二次开发的基础设施。

---

## 2. 技术栈对比

### 2.1 核心技术

| 技术维度 | SuperSplat | Spark |
|---------|-----------|-------|
| **渲染引擎** | PlayCanvas Engine v2.18 | THREE.js v0.180 |
| **编程语言** | TypeScript | TypeScript + Rust (WebAssembly) |
| **构建工具** | Rollup | Vite 6.x |
| **UI 框架** | PCUI v6.1.3（PlayCanvas 自研组件库） | 无（headless 库） |
| **样式系统** | SCSS + 自定义主题 | 无 UI，示例用 lil-gui |
| **GPU API** | WebGL2（硬编码） | WebGL2 |
| **国际化** | i18next（20 种语言） | 无 |
| **代码质量** | ESLint | Biome 1.9.4 |
| **包管理** | npm | npm |
| **Node 要求** | >= 20.19.0 | 未指定 |

### 2.2 依赖生态

**SuperSplat 依赖链：**
```
PlayCanvas Engine → PCUI → i18next → splat-transform → sass/postcss
```
- 深度绑定 PlayCanvas 生态
- splat-transform 库处理所有格式 I/O
- PCUI 提供全部 UI 组件

**Spark 依赖链：**
```
THREE.js → Rust/WASM (spark-rs, spark-worker-rs, spark-lib) → fflate
```
- 深度绑定 THREE.js 生态
- Rust/WASM 处理排序和解码等计算密集任务
- fflate 处理压缩格式的解压

### 2.3 输出产物

| | SuperSplat | Spark |
|---|-----------|-------|
| **产物类型** | 静态网站（HTML + JS + CSS） | npm 库包 |
| **输出目录** | `dist/` | `dist/spark.module.js` + `dist/spark.cjs.js` |
| **使用方式** | 直接部署到 Web 服务器 | `npm install spark` 后在代码中 import |
| **CDN 可用** | 部署后即可 | 支持 ES Module / CommonJS / UMD |

---

## 3. 渲染能力对比

### 3.1 基础渲染

| 能力 | SuperSplat | Spark | 说明 |
|------|-----------|-------|------|
| Gaussian Splat 渲染 | ✅ | ✅ | 两者都支持标准 3DGS 渲染 |
| 透明度混合 | ✅ 预乘 Alpha | ✅ 预乘 Alpha | 实现方式相同 |
| 深度排序 | ✅ AABB 角点排序 | ✅ WASM 排序 | Spark 的 Rust 排序更快 |
| Frustum 裁剪 | ✅ | ✅ GPU 端 | Spark 在 GPU shader 中完成 |
| 球谐函数 (SH) | ✅ 最多 3 阶 | ✅ | 都支持视角依赖的颜色 |

### 3.2 高级渲染

| 能力 | SuperSplat | Spark | 说明 |
|------|-----------|-------|------|
| LOD 分级渲染 | ❌ | ✅ 自动 LOD | Spark 可按距离动态降级质量 |
| 渐进式加载 | ❌ 一次性加载 | ✅ SplatPager 流式 | Spark 可分块逐步加载大场景 |
| WebXR (VR/AR) | ❌ | ✅ 完整支持 | Spark 支持 VR/AR + 手部追踪 |
| Portal 传送门 | ❌ | ✅ SparkPortals | 可以做传送门特效 |
| 景深效果 | ❌ | ✅ | 类摄影的焦外模糊 |
| 2D Gaussian 模式 | ❌ | ✅ | 支持 2DGS 变体 |
| 注视点渲染 | ❌ | ✅ Foveated | XR 场景中心高清、边缘降质 |
| 骨骼动画 | ❌ | ✅ SplatSkinning | 可以给 Splat 绑骨骼做动画 |
| Shader 图系统 | ❌ | ✅ Dyno | 节点式 GPU Shader 动态编排 |
| 程序化生成 | ❌ | ✅ | 可生成网格、文字、图片 Splat |
| 多场景合并 | 有限 | ✅ 多 SplatMesh | 每个 Mesh 独立变换和动画 |
| 随机排序模式 | ❌ | ✅ Stochastic | 可跳过排序换取极致性能 |
| 对数深度缓冲 | ❌ | ✅ | 大场景远近物体精度更好 |

### 3.3 渲染管线对比

**SuperSplat 渲染管线：**
```
场景数据 → Morton 重排序 → PlayCanvas GSplat 组件 → WebGL2 渲染
    ↓
状态纹理 (R8) → Vertex Shader 过滤 → 选中/删除/锁定 控制
    ↓
Gizmo 层 / 叠加层 / Picker 层（多 Pass）
```

**Spark 渲染管线：**
```
场景数据 → Rust/WASM 排序 → 排序索引纹理 → WebGL2 实例渲染
    ↓
纹理数组 (2048x2048) → Vertex Shader 解码 → 四边形实例化
    ↓
Fragment Shader → Gaussian 核心计算 → Alpha 混合 → 输出
    ↓
可选：LOD 降级 / Foveated / Portal 裁剪 / Dyno 自定义 Shader
```

**核心差异**：Spark 的排序在 Rust/WASM 中完成，性能显著优于 SuperSplat 的 JavaScript 排序。Spark 的纹理存储方案（2048x2048 数组纹理）也更适合大规模场景。

---

## 4. 编辑能力对比

这是两者差距最大的维度。

### 4.1 选择工具

| 工具 | SuperSplat | Spark |
|------|-----------|-------|
| 矩形框选 | ✅ | ❌ |
| 画笔选择（圆形笔刷） | ✅ | ❌ |
| 多边形选择 | ✅ | ❌ |
| 套索选择（自由绘制） | ✅ | ❌ |
| 3D 球体选择 | ✅ | ❌ |
| 3D 盒子选择 | ✅ | ❌ |
| 洪水填充选择 | ✅ | ❌ |
| 吸管取色 | ✅ | ❌ |
| 全选/反选/取消选择 | ✅ | ❌ |

SuperSplat 提供 **8 种选择工具**，覆盖 2D 和 3D 场景中的所有选择需求。Spark 没有任何选择工具。

### 4.2 变换操作

| 操作 | SuperSplat | Spark |
|------|-----------|-------|
| 移动 Gizmo | ✅ 3 轴 + 平面 | ❌ |
| 旋转 Gizmo | ✅ 3 轴 | ❌ |
| 缩放 Gizmo | ✅ 均匀/非均匀 | ❌ |
| 数值精确输入 | ✅ Transform 面板 | ❌ |
| 测量工具 | ✅ 距离/角度 | ❌ |
| 批量变换 | ✅ 对选中 Splat 组 | ❌ |

### 4.3 编辑操作

| 操作 | SuperSplat | Spark |
|------|-----------|-------|
| 删除选中 Splat | ✅ | ❌ |
| 撤销/重做 | ✅ 完整操作历史 | ❌ |
| 隐藏/显示 | ✅ | ❌ |
| 锁定 | ✅ | ❌ |
| 颜色调整（色温/饱和度/亮度） | ✅ 完整面板 | ⚠️ SplatEdit（有限） |
| 透明度调整 | ✅ | ⚠️ SplatEdit |
| 位移编辑 | ❌ | ✅ SplatEdit SDF |
| 重命名 | ✅ | ❌ |
| 数据直方图分析 | ✅ | ❌ |

### 4.4 Spark 的 SplatEdit 系统

Spark 不是完全没有编辑能力，但方式截然不同：

```
SuperSplat 的编辑方式：用户用鼠标选中一些 Splat → 对选中 Splat 做操作
Spark 的 SplatEdit：开发者定义 SDF 形状 → 形状范围内的 Splat 被自动修改
```

Spark 的 SplatEdit 支持的 SDF 形状：
- Sphere（球体）
- Box（立方体）
- Plane（平面）
- Ellipsoid（椭球）
- Cylinder（圆柱）
- Capsule（胶囊）
- Infinite Cone（无限锥体）
- All（全部）

混合模式：MULTIPLY、SET_RGB、ADD_RGBA

这适合做**程序化特效**（如溶解、波纹），但不适合做**精细编辑**（如删除浮动噪点）。

### 4.5 相机与导航

| 功能 | SuperSplat | Spark |
|------|-----------|-------|
| 轨道模式 | ✅ | ✅ SparkControls |
| 飞行模式 | ✅ | ✅ FPS 式 |
| 平移 | ✅ | ✅ |
| 缩放 | ✅ | ✅ |
| 聚焦选中物 | ✅ F 键 | ❌ |
| 焦点拾取 | ✅ 双击设置 | ❌ |
| 视图立方体 | ✅ | ❌ |
| 相机动画 | ✅ 时间轴 + 关键帧 | ❌ |
| 手柄/游戏手柄 | ❌ | ✅ Gamepad API |
| 触摸/移动端 | 有限 | ✅ 多点触控 |
| WebXR 控制器 | ❌ | ✅ |

### 4.6 导出功能

| 功能 | SuperSplat | Spark |
|------|-----------|-------|
| 导出 PLY | ✅ | ❌ |
| 导出压缩 PLY | ✅ | ❌ |
| 导出 .splat | ✅ | ❌ |
| 导出 SOG | ✅（需 WebGPU） | ❌ |
| 导出独立 HTML 查看器 | ✅ | ❌ |
| 导出 ZIP 查看器包 | ✅ | ❌ |
| 截图导出 (PNG) | ✅ | ❌ |
| 视频导出 | ✅ H.264/H.265/VP9/AV1 | ❌ |
| 格式：MP4/WebM/MOV/MKV | ✅ | ❌ |

---

## 5. 格式支持对比

### 5.1 导入格式

| 格式 | 说明 | SuperSplat | Spark |
|------|------|-----------|-------|
| `.ply` | 标准 3DGS PLY | ✅ | ✅ |
| `.compressed.ply` | PlayCanvas 压缩 PLY | ✅ | ❌ |
| `.splat` | antimatter15 二进制格式 | ✅ | ✅ |
| `.spz` | Niantic Scaniverse 压缩格式 | ✅ | ✅ (v2/v3) |
| `.sog` | PlayCanvas 场景格式 | ✅ | ✅ |
| `.ksplat` | KGaussianSplats 格式 | ✅ | ✅ |
| `.lcc` | 无损色彩映射压缩 | ✅ | ❌ |
| `.rad` | Radiance 格式 | ❌ | ✅ |
| `.tsplat` | Spark 内部格式 | ❌ | ✅ |
| `.csplat` | 协方差编码格式 | ❌ | ✅ |
| `.asplat` | 反 Splat 格式 | ❌ | ✅ |
| COLMAP `.txt` | 相机位姿文件 | ✅ | ❌ |
| PLY 序列帧 | 动画 PLY 序列 | ✅ 自动检测 | ❌ |

### 5.2 导出格式

| 格式 | SuperSplat | Spark |
|------|-----------|-------|
| PLY | ✅ 完整属性 | ❌ |
| 压缩 PLY | ✅ 量化 + 分块 | ❌ |
| .splat | ✅ | ❌ |
| SOG | ✅ WebP 压缩 | ❌ |
| HTML 查看器 | ✅ 自包含 | ❌ |
| ZIP 包 | ✅ | ❌ |
| PNG 截图 | ✅ | ❌ |
| 视频 | ✅ 多编码/容器 | ❌ |

**结论**：SuperSplat 是完整的格式转换工具，可导入导出多种格式。Spark 只做导入和渲染。

### 5.3 压缩技术

**SuperSplat 压缩 PLY 细节：**
- 256 个 Splat 为一个 Chunk
- 位置：11/10/11 bit 量化（归一化到 Chunk 边界）
- 旋转：2/10/10/10 bit 四元数打包
- 缩放：11/10/11 bit 归一化
- 颜色：8/8/8/8 bit RGBA
- SH 系数：uint8 存储，8x 量化
- Morton 重排序优化缓存命中

**Spark 存储方案：**
- 2048x2048 数组纹理存储 Splat 数据
- 打包编码：center(3) + scales(3) + quaternion(4) + rgba(4) = 14 float/splat
- 排序索引独立纹理
- 支持 Float16 精度（默认）和 Float32（高精度模式）
- 可选扩展 Splat 纹理（ExtSplats）

---

## 6. 性能对比

### 6.1 排序性能

| 方面 | SuperSplat | Spark |
|------|-----------|-------|
| 排序实现 | JavaScript（主线程） | Rust/WASM（Web Worker） |
| 排序精度 | Float32 | Float16（默认）/ Float32（可选） |
| 增量更新 | ❌ 全量排序 | ✅ 增量排序 |
| 随机排序 | ❌ | ✅ Stochastic 模式 |

Rust/WASM 的排序速度通常是纯 JavaScript 的 **3-5 倍**，在 100 万+ Splat 的场景中差异更加明显。

### 6.2 加载性能

| 方面 | SuperSplat | Spark |
|------|-----------|-------|
| 加载方式 | 一次性加载全部 | 渐进式流加载 (SplatPager) |
| 首次可见时间 | 需等全部加载完 | 加载部分即可显示 |
| 大场景体验 | 长时间白屏等待 | 逐步清晰 |
| 进度反馈 | ✅ 进度条 | ✅ onProgress 回调 |

### 6.3 渲染性能

| 方面 | SuperSplat | Spark |
|------|-----------|-------|
| LOD | ❌ 固定质量 | ✅ 自动降级 |
| 像素半径限制 | 固定 | ✅ minPixelRadius / maxPixelRadius 可配 |
| Alpha 阈值裁剪 | ❌ | ✅ 可配置 |
| Frustum 裁剪 | 引擎级 | ✅ GPU Shader 级 |
| 多 Pass 开销 | 高（Picker + Gizmo + 叠加） | 低（单 Pass 渲染） |

**注意**：SuperSplat 的多 Pass 渲染是编辑功能的必然代价（选择、Gizmo、高亮需要额外渲染通道），不属于性能缺陷。

### 6.4 内存使用

| 方面 | SuperSplat | Spark |
|------|-----------|-------|
| 状态跟踪 | R8 纹理（每 Splat 1 字节） | 无状态跟踪 |
| 变换索引 | R16U 纹理（每 Splat 2 字节） | 无 |
| 额外开销 | 编辑历史、选择掩码、直方图数据 | 仅渲染数据 |

SuperSplat 因编辑功能需要更多内存，但这是功能复杂度带来的合理开销。

---

## 7. 架构设计对比

### 7.1 SuperSplat 架构

```
src/
├── main.ts / index.ts          ← 入口
├── editor.ts                   ← 编辑器核心
├── scene.ts                    ← 场景管理（图层、元素、排序）
├── splat.ts                    ← Splat 数据封装（状态、材质）
├── selection.ts                ← 多选系统
├── edit-ops.ts                 ← 声明式编辑操作（全部实现 do/undo）
├── edit-history.ts             ← 异步操作队列 + 撤销/重做
├── camera.ts                   ← 相机控制
├── camera-poses.ts             ← 相机位姿动画
├── render.ts                   ← 离屏渲染（截图/视频）
├── events.ts                   ← 发布/订阅事件系统
├── iframe-api.ts               ← iframe 嵌入通信协议
├── tools/                      ← 8 种选择工具
├── controllers.ts              ← 输入控制器
├── data-processor/             ← 数据处理（边界计算、交集检测、Morton 排序）
├── io/                         ← 格式 I/O（统一通过 splat-transform）
├── shaders/                    ← 自定义着色器
└── ui/                         ← PCUI 界面（菜单、面板、工具栏、弹窗）
    ├── scss/                   ← 样式
    ├── localization.ts         ← 20 种语言
    └── *.ts                    ← 各 UI 组件
```

**设计模式**：事件驱动 + 声明式编辑操作 + MVC 分离

### 7.2 Spark 架构

```
src/
├── index.ts                    ← 入口（导出所有公共 API）
├── SplatMesh.ts (43KB)         ← 核心公共 API（THREE.Object3D 子类）
├── SparkRenderer.ts (67KB)     ← 渲染引擎（排序、累积、LOD）
├── SplatLoader.ts              ← THREE.Loader 实现（自动格式检测）
├── PackedSplats.ts             ← GPU 纹理存储（2048x2048 数组）
├── SplatPager.ts               ← 流式 LOD 加载系统
├── SplatAccumulator.ts         ← 多 Splat 累积器
├── SplatEdit.ts                ← SDF 编辑系统
├── SplatSkinning.ts            ← 骨骼动画
├── SparkControls.ts            ← FPS 式综合输入（键鼠/手柄/触摸/XR）
├── SparkPortals.ts             ← Portal 传送门渲染
├── SparkXr.ts                  ← WebXR 集成
├── XrHands.ts                  ← 手部追踪
├── Dyno/                       ← Shader 图系统
│   ├── DynoGraph.ts            ← 图定义
│   ├── DynoNode.ts             ← 节点定义
│   └── DynoUniform.ts          ← Uniform 管理
├── shaders/                    ← GLSL 着色器
│   ├── splatVertex.glsl        ← 顶点着色器
│   ├── splatFragment.glsl      ← 片段着色器
│   └── splatDefines.glsl (2048 行) ← 编解码函数库
├── formats/                    ← 格式解析器
│   ├── ply.ts
│   ├── spz.ts
│   ├── ksplat.ts
│   └── pcsogs.ts
├── generators/                 ← 程序化 Splat 生成器
├── worker.ts                   ← Web Worker（排序/解码）
└── rust/                       ← Rust/WASM 模块
    ├── spark-rs/               ← 光线投射 + Splat 处理
    ├── spark-worker-rs/        ← Worker 端处理
    └── spark-lib/              ← 共享格式解码库
```

**设计模式**：面向对象（THREE.js 继承体系） + Web Worker 异构计算 + Rust/WASM 高性能核心

### 7.3 架构差异总结

| 维度 | SuperSplat | Spark |
|------|-----------|-------|
| 关注点 | 编辑体验优先 | 渲染性能优先 |
| 可扩展性 | 通过事件系统 + 工具注册 | 通过 THREE.js 继承 + 回调 |
| 嵌入方式 | iframe + postMessage | npm import + 代码集成 |
| 计算密集任务 | 主线程 JavaScript | Web Worker + Rust/WASM |
| 状态管理 | GPU 纹理 + 编辑历史 | 无状态（纯渲染） |

---

## 8. 生态与社区

### 8.1 文档与示例

| | SuperSplat | Spark |
|---|-----------|-------|
| 文档 | 较少，主要是 README | 完整 API 文档（mkdocs） |
| 示例数量 | 编辑器本身就是示例 | **40+ 个示例**（特效/交互/XR/动画） |
| 迁移指南 | 无 | 有（0.1 → 2.0） |
| 社区资源指南 | 无 | 有 |

### 8.2 Spark 示例目录（精选）

Spark 的示例展示了丰富的应用场景：

| 示例 | 说明 |
|------|------|
| hello-world | 最小可运行渲染 |
| editor | 简易编辑器演示 |
| painter | 交互式 Splat 绘画 |
| dissolve | 溶解特效 |
| flow | 流动特效 |
| ripples | 波纹特效 |
| transitions | 场景过渡动画 |
| portal | 传送门效果 |
| depth-of-field | 景深模糊 |
| webxr | VR/AR 渲染 |
| hand-tracking | 手部追踪交互 |
| particles | 粒子模拟 |
| lod | LOD 分级演示 |
| streaming | 流式加载 |
| raycasting | 光线投射交互 |
| skeletal | 骨骼动画 |
| procedural | 程序化生成 |

### 8.3 生态整合

| | SuperSplat | Spark |
|---|-----------|-------|
| 所属引擎生态 | PlayCanvas（较小众） | THREE.js（Web 3D 最大生态） |
| npm 包 | 非 npm 包（独立应用） | 标准 npm 包 |
| 与其他库组合 | 困难（PlayCanvas 封闭） | 容易（标准 THREE.js 对象） |
| React/Svelte 集成 | iframe 方式 | 直接 import 使用 |
| Next.js/Nuxt 兼容 | 不适用 | ✅ 有 webpack 兼容处理 |

---

## 9. 各自的核心长处

### 9.1 SuperSplat 的核心长处

1. **完整的编辑器体验**
   - 8 种选择工具覆盖所有编辑场景
   - 完整的变换 Gizmo（移动/旋转/缩放）
   - 撤销/重做历史
   - 数据直方图分析和过滤
   - 这些功能如果从零实现需要数月开发

2. **格式转换能力**
   - 导入 9+ 种格式，导出 6+ 种格式
   - 内置压缩 PLY 导出（量化 + 分块 + Morton 排序）
   - 导出独立 HTML 查看器和视频

3. **多语言支持**
   - 20 种语言覆盖全球主要市场
   - i18next 成熟方案，易于维护

4. **即开即用**
   - 部署为静态站点即可使用
   - 无需任何后端支持
   - PWA 支持离线使用

5. **iframe 嵌入已就绪**
   - 现成的 postMessage API
   - 加载/保存/语言/品牌/水印控制
   - 已经和 Splat3D 商业外壳完成对接

### 9.2 Spark 的核心长处

1. **渲染性能卓越**
   - Rust/WASM 排序（3-5x 快于 JS）
   - 自动 LOD 分级
   - 渐进式流加载
   - 随机排序模式（极致性能场景）

2. **前沿渲染特性**
   - WebXR (VR/AR) + 手部追踪
   - Portal 传送门效果
   - 景深渲染
   - Dyno Shader 图系统
   - 骨骼动画

3. **THREE.js 生态整合**
   - 标准 THREE.Object3D，与任何 THREE.js 代码无缝组合
   - npm 包安装，import 即用
   - 40+ 示例覆盖各种应用场景
   - 与 React Three Fiber 等框架兼容

4. **开发者友好**
   - 完整 TypeScript 类型
   - 清晰的 API 设计
   - Vite 构建，开发体验流畅
   - 完整文档 + 迁移指南

5. **可扩展性强**
   - Dyno Shader 图可以做任意视觉效果
   - SplatAccumulator + Generator 可程序化生成 Splat
   - 回调驱动，外部代码可完全控制渲染行为

---

## 10. 各自的短板

### 10.1 SuperSplat 的短板

1. **渲染性能偏弱**
   - JavaScript 排序，大场景慢
   - 无 LOD 分级
   - 无渐进式加载
   - 多 Pass 渲染增加开销

2. **仅 WebGL2**
   - 没有 WebGPU 渲染路径
   - 无 VR/AR 支持
   - 无高级视觉特效

3. **PlayCanvas 锁定**
   - 深度绑定 PlayCanvas 引擎和 PCUI
   - 难以与其他 3D 库组合使用
   - PlayCanvas 社区相对较小

4. **无 Splat 创建能力**
   - 只能编辑已有 Splat，不能从零创建
   - 没有雕刻/变形工具
   - 无实时重建功能

5. **移动端体验有限**
   - 复杂 UI 在小屏幕上不友好
   - 触摸操作支持较弱

### 10.2 Spark 的短板

1. **没有编辑器 UI**
   - 没有选择工具
   - 没有变换 Gizmo
   - 没有撤销/重做
   - 做编辑器需要从零开发全部 UI

2. **只渲染不导出**
   - 不能导出任何格式
   - 不能保存编辑结果
   - 不能格式转换

3. **没有国际化**
   - 没有多语言支持
   - 作为库这不是问题，但如果要做终端产品需要自己加

4. **嵌入通信需自建**
   - 没有 iframe 通信协议
   - 作为 npm 库直接 import，不需要 iframe
   - 但如果要做 iframe 嵌入需要自己写 postMessage 协议

5. **Rust 构建链复杂**
   - 需要 Rust 工具链和 wasm-pack
   - CI/CD 配置更复杂
   - 调试 WASM 比纯 JS 困难

---

## 11. Splat3D 商业化的选型建议

### 11.1 核心结论

**不应该从 SuperSplat 切换到 Spark。**

原因：Spark 是一个渲染库，不是编辑器。切换意味着需要从零开发编辑器 UI（8 种选择工具、变换 Gizmo、撤销/重做、面板布局、键盘快捷键……），工作量巨大，预计 3-6 个月。而 SuperSplat 已经提供了全部编辑功能，并且已经和 Splat3D 商业外壳完成了 iframe 对接。

### 11.2 推荐策略：两者互补

| 功能场景 | 推荐方案 | 理由 |
|---------|---------|------|
| 编辑器（/projects/[id]） | **继续使用 SuperSplat** | 完整编辑 UI，iframe 对接已完成，无可替代 |
| 公开查看页（/view/[slug]） | **引入 Spark** | 渲染更快，LOD 自动分级，渐进式加载，体验更好 |
| AI 重建结果预览（/reconstruct） | **引入 Spark** | 轻量、流式加载，适合预览大型重建结果 |
| 落地页 3D 展示（/） | **引入 Spark** | 可做交互式 3D 展示，吸引用户 |
| 未来 VR/AR 查看（付费功能） | **使用 Spark** | SuperSplat 不支持 WebXR |

### 11.3 如果引入 Spark 作为查看器

Spark 可以直接集成到 SvelteKit 页面（不需要 iframe），因为它是标准 npm 包：

```bash
cd D:/project/splat3d-web
npm install spark
```

```svelte
<!-- /view/[slug]/+page.svelte -->
<script>
import { onMount } from 'svelte';
import * as THREE from 'three';
import { SplatMesh, SparkRenderer } from 'spark';

onMount(() => {
    const renderer = new SparkRenderer(/* ... */);
    const splat = new SplatMesh({ url: fileUrl });
    scene.add(splat);
});
</script>
```

优势：
- 不需要 iframe，减少一层通信复杂度
- LOD 自动分级，大场景体验好
- 渐进式加载，用户更早看到内容
- 后续可加 WebXR 作为付费功能卖点

### 11.4 长期演进路线

```
当前 (Phase 1-3)
├── 编辑器 = SuperSplat (iframe)
└── 查看器 = 无 / 简单 iframe

近期可优化 (Phase 4)
├── 编辑器 = SuperSplat (iframe，不变)
└── 查看器 = Spark (直接集成，更好的渲染体验)

中期增值 (Phase 5+)
├── 编辑器 = SuperSplat (iframe，不变)
├── 查看器 = Spark + WebXR (VR/AR 查看，付费功能)
└── 展示页 = Spark (交互式 3D 场景，营销用途)
```

### 11.5 最终判断

| 问题 | 答案 |
|------|------|
| 该从 SuperSplat 切换到 Spark 吗？ | **不该**，编辑器功能无法替代 |
| Spark 有用吗？ | **有用**，但用途不同 — 做查看器和展示 |
| 两个可以共存吗？ | **可以**，各司其职，互补使用 |
| 当前优先级？ | 先完成 SuperSplat 编辑器的商业化，查看器优化放到后续阶段 |
