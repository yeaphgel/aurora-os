# Aurora OS 费曼学习法 PBL 教程

这份教程是给编程门外汉看的。目标不是让你马上成为程序员，而是让你能看懂 Aurora OS 这个项目在做什么、为什么要这样拆、每个文件大概负责什么。

## 0. 费曼学习法怎么用在这个项目里

费曼学习法的核心是四步：

1. 用小学生能听懂的话解释一个概念。
2. 找出自己讲不清楚的地方。
3. 回到材料里补洞。
4. 再用更简单的话讲一次。

你学 Aurora OS 时，不要先背代码。先把每个模块讲成生活里的流程。

一句话解释 Aurora OS：

> Aurora OS 像一个品牌海报生产流水线：先读品牌要求，再写生成说明，让图片模型生成图，再把 logo 和产品放上去，最后检查是否合格，不合格就返工。

## 1. PBL 项目目标

PBL 是 Project-Based Learning，也就是“用做项目来学习”。

你的学习目标：

- 看懂一个 TypeScript 项目的基本结构。
- 理解什么是 contract-first development。
- 理解为什么要有 mock adapter。
- 理解单图 pipeline 和多图 pipeline 的关系。
- 理解 QA-driven regeneration 是什么。
- 能运行测试，并知道测试通过代表什么。

最终作品：

- 你能向别人解释 Aurora OS 的 M0 到 M5。
- 你能运行 `npm run validate`。
- 你能指出一张图从 input 到 export 经过了哪些步骤。

## 2. 生活类比：把 Aurora OS 想成一家海报工厂

想象你开了一家海报工厂。

客户给你：

- 品牌名字。
- 品牌语气。
- 不能出现的词。
- logo。
- 产品图。
- 想做几张海报。

你的工厂有几道工序：

1. 接单：读取品牌信息和需求。
2. 写工单：把需求变成清楚的图片生成 brief。
3. 找画师：让 Image-2 生成底图。现在项目里用 mock 画师，不调用真实网络。
4. 贴 logo 和产品：确定性 overlay。
5. 质检：QA checker 检查尺寸、logo、产品、禁用词、品牌语气等。
6. 返工：如果 QA 不通过，根据问题修改 brief 再试。
7. 摆到展柜：gallery preview。
8. 打包交付：export package。

这就是 Aurora OS。

## 3. M0 到 M5 用白话解释

### M0：搭建工厂

只做项目地基：

- `package.json`
- TypeScript 配置
- 测试工具
- `src`
- `tests`

不做业务逻辑。

### M1：先定合同

合同就是 `src/contracts`。

它规定：

- 有哪些 status。
- 有哪些 error code。
- pipeline result 长什么样。
- generation item 长什么样。
- export metadata 长什么样。

为什么重要？

因为多人写代码时，如果每个人都自己写一个 `"success"`、`"done"`、`"ok"`，项目很快就乱了。合同先定，大家都按同一张图纸施工。

### M2：跑通单张图

M2 是第一条完整流水线：

```text
input -> brief -> mock image -> overlay -> QA -> pipeline result
```

重点是“一张图能从头跑到尾”。

### M3：不合格就返工

如果 QA 发现问题，比如：

- logo 边距不对。
- 尺寸不对。
- 出现禁用词。

系统不会立刻放弃，而是把 QA issue 变成新的 brief 约束，再重试。

如果重试次数用完，还不合格，就进入 `needs_human`，意思是“需要人来处理”。

### M4：预览和导出

M4 不做复杂设计编辑器，只做两个东西：

- Gallery preview：告诉界面应该展示什么。
- Export：把 metadata、QA、brief、overlay 信息和 mock 图片文件打包写出来。

### M5：四张图一起跑

M5 支持一次生成 4 张图。

关键规则：

- 4 张图每一张都有自己的 retryCount。
- 一张失败不能阻塞其他三张。
- 多图不能复制一套新逻辑，必须复用单图 item runner。
- 如果有的通过、有的失败，run status 是 `partial_failed`。

## 4. 看代码地图

```text
src/contracts
```

这里是合同。先看这里。

```text
src/pipeline
```

这里是流水线。核心模块：

- `brief-builder.ts`：写工单。
- `mock-image-2-adapter.ts`：假图片模型。
- `overlay-engine.ts`：贴 logo 和产品。
- `qa-checker.ts`：质检。
- `regeneration-adjuster.ts`：根据质检问题改工单。
- `single-image-runner.ts`：跑单张图。
- `multi-image-runner.ts`：跑四张图，但复用单张图逻辑。

```text
src/gallery
```

这里把结果整理成界面能展示的数据。

```text
src/export
```

这里把结果写成导出包。

```text
tests
```

这里是自动检查。它们像工厂验收员，确认每个里程碑真的工作。

## 5. 第一次动手：运行项目

打开终端，进入项目目录：

```bash
cd "D:\BaiduSyncdisk\BaiduSyncdisk\PARA\1. Project 项目\Aurora OS"
```

安装依赖：

```bash
npm install
```

运行验证：

```bash
npm run validate
```

如果看到测试通过，说明：

- TypeScript 类型没有明显错误。
- 所有里程碑测试都通过。

## 6. 费曼练习一：解释 status

请你用自己的话解释：

> 为什么 `partial_failed` 只能是 run 的 status，不能是 item 的 status？

参考答案：

因为 `partial_failed` 的意思是“一批结果里面有的成功、有的失败”。单张图自己不可能“部分失败”。单张图只能是通过、失败、需要人工处理等。只有整批 run 才能说 partial failed。

## 7. 费曼练习二：解释 mock adapter

问题：

> 为什么现在不用真实 Image-2？

参考答案：

因为项目要先验证流水线是否正确。如果一开始就调用真实模型，测试会变慢、变贵、变不稳定。mock adapter 像一个假画师，它稳定地返回固定结果，方便我们测试后面的 overlay、QA、retry、export。

## 8. 费曼练习三：解释 QA-driven regeneration

问题：

> QA fail 后系统做了什么？

参考答案：

它不会只是说失败，而是读失败原因。例如 logo 安全边距不对，就把“保留 logo 安全边距”加入新的 brief，再重新生成。这样失败原因会变成下一次尝试的改进方向。

## 9. PBL 任务清单

### 任务 A：画出流水线

用纸画出：

```text
Brand Context -> Brief -> Image -> Overlay -> QA -> Retry or Pass -> Gallery -> Export
```

然后用自己的话讲一遍。

### 任务 B：找到合同

打开：

```text
src/contracts/types.ts
```

找到：

- `GenerationRun`
- `GenerationItem`
- `PipelineResult`
- `ExportMetadata`

不用完全看懂 TypeScript，只要知道这些是“数据长什么样”的规定。

### 任务 C：找到单图 runner

打开：

```text
src/pipeline/single-image-runner.ts
```

找这两个函数：

- `runSingleImagePipeline`
- `runGenerationItem`

用白话解释：

- 前者包装整个单图 run。
- 后者真正跑一个 item，所以多图也能复用它。

### 任务 D：找到多图 runner

打开：

```text
src/pipeline/multi-image-runner.ts
```

观察它如何跑 4 个 `runGenerationItem`。

你要能解释：

> 多图 runner 为什么不重新写一套生成逻辑？

参考答案：

因为重新写一套会产生重复逻辑。以后改 QA 或 retry 时，可能只改了一边，另一边就坏了。复用单 item runner 可以让单图和多图行为一致。

### 任务 E：跑测试

运行：

```bash
npm run validate
```

然后找到这些测试文件：

- `tests/m2-single-image-pipeline.test.ts`
- `tests/m3-regeneration-loop.test.ts`
- `tests/m4-gallery-export.test.ts`
- `tests/m5-multi-image-hardening.test.ts`

每个文件只读测试名字，先不用读细节。

## 10. 你应该能讲出来的版本

当别人问你 Aurora OS 是什么，你可以这样说：

> Aurora OS 是一个品牌图片生成流水线。它先用品牌资料生成 brief，再用 mock Image-2 生成图片，然后确定性地加 logo 和产品，接着用 QA 检查尺寸、品牌词、禁用词、风格等。如果失败，就根据 QA issue 改 brief 后重试。单图跑通后，多图复用同一个 item runner，所以四张图可以独立成功或失败。最后结果可以变成 gallery preview 和 export package。

这就是费曼学习法的目标：你能用简单话讲清楚。

## 11. 下一步学习路线

如果你想继续学编程，按这个顺序：

1. 学会看 `package.json`：它告诉你项目怎么运行。
2. 学会看 `src/contracts/types.ts`：它告诉你数据长什么样。
3. 学会看测试名字：它告诉你系统应该做什么。
4. 再慢慢看实现文件：理解每一步如何做。
5. 最后尝试改一个小规则，比如把默认 retry 次数从 3 改成 2，并观察测试是否失败。

不要一开始就硬读所有代码。先理解故事，再理解数据，最后理解代码。
