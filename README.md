# Aurora OS

## 中文

Aurora OS 是一个 Hermes-first 的品牌内容生成插件底座。它的目标不是做一个通用设计工具，而是把品牌上下文、单图/多图生成、确定性叠加、QA 检查、预览和导出组织成一条可测试的内容生产流水线。

当前实现已覆盖 M0 到 M5：

- M0 Repo Scaffold：TypeScript 项目、测试配置、目录结构。
- M1 Contract Freeze：共享 contract、status、error code、fixture 和 validator。
- M2 Single Image Vertical Slice：brief builder、mock Image-2 adapter、overlay、QA、单图 pipeline result。
- M3 Regeneration Loop：QA issue 调整 brief、retry limit、needs_human 人工介入状态。
- M4 Gallery + Export：headless gallery preview model、metadata/manifest/QA/brief/overlay 导出包、mock PNG/JPG 文件写入。
- M5 Multi Image + QA Hardening：4 图批量编排、独立 item regeneration、run-level partial_failed、named QA checks。

### 项目边界

已实现：

- contract-first shared types。
- mockable Image-2 adapter boundary。
- deterministic logo/product overlay metadata。
- deterministic QA checker。
- QA-driven regeneration。
- single-image runner。
- multi-image runner that reuses the single-item runner。
- gallery preview view model。
- export metadata and local package writer。

未实现，且当前阶段不应实现：

- real Image-2 network calls。
- publishing integrations。
- content calendar。
- A/B testing。
- OpenClaw-native implementation。
- enterprise multi-brand admin。
- template marketplace。
- manual design editor。

### 安装与验证

```bash
npm install
npm run validate
```

`npm run validate` 会执行：

- `npm run typecheck`
- `npm test`

当前测试覆盖 contracts、M2、M3、M4、M5。通过标准是所有 TypeScript 类型检查和 Vitest 测试都通过。

### 主要目录

```text
src/contracts     Shared contracts, status, error codes, validators
src/fixtures      Deterministic sample brand context and generation runs
src/pipeline      Brief, adapter, overlay, QA, regeneration, single/multi runners
src/gallery       Gallery preview view model
src/export        Export metadata and local package writer
tests             Contract and milestone tests
```

### 最小使用示例

```ts
import {
  createMockImage2Adapter,
  runMultiImagePipeline,
  sampleBrandContext,
  sampleLogoAsset,
  sampleProductAsset,
} from "./src/index.js";

const result = await runMultiImagePipeline(
  {
    brandId: sampleBrandContext.brandId,
    contentIntent: "Create premium product posters for Aurora.",
    generationCount: 4,
    channelFormat: "portrait",
    brandContext: sampleBrandContext,
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
  },
  {
    imageAdapter: createMockImage2Adapter(),
  },
);

console.log(result.run.status);
```

### 核心概念

Pipeline result 是最终输出。它包含一个 generation run。run 的 `status` 是汇总状态，例如 `completed`、`failed`、`partial_failed`。每个 item 的 `status` 才代表单张图自己的真实结果，例如 `passed`、`failed`、`needs_human`。

`partial_failed` 只允许出现在 run-level，不能作为 item-level status。

所有业务模块必须从 `src/contracts` 引入共享类型、status、error code 和 result shape，不能重新定义隐藏字符串状态或错误结构。

## English

Aurora OS is a Hermes-first foundation for a brand content generation plugin. It is not a general-purpose design editor. It organizes brand context, single/multi-image generation, deterministic overlays, QA checks, preview, and export into a testable content pipeline.

The current implementation covers M0 through M5:

- M0 Repo Scaffold: TypeScript project, test setup, and directory structure.
- M1 Contract Freeze: shared contracts, statuses, error codes, fixtures, and validators.
- M2 Single Image Vertical Slice: brief builder, mock Image-2 adapter, overlay, QA, and single-image pipeline result.
- M3 Regeneration Loop: QA issue based brief adjustment, retry limits, and human intervention state.
- M4 Gallery + Export: headless gallery preview model, metadata/manifest/QA/brief/overlay export package, and mock PNG/JPG file writing.
- M5 Multi Image + QA Hardening: four-image orchestration, independent item regeneration, run-level partial failure, and named QA checks.

### Scope

Implemented:

- Contract-first shared types.
- Mockable Image-2 adapter boundary.
- Deterministic logo/product overlay metadata.
- Deterministic QA checker.
- QA-driven regeneration.
- Single-image runner.
- Multi-image runner that reuses the single-item runner.
- Gallery preview view model.
- Export metadata and local package writer.

Not implemented in this milestone:

- Real Image-2 network calls.
- Publishing integrations.
- Content calendar.
- A/B testing.
- OpenClaw-native implementation.
- Enterprise multi-brand admin.
- Template marketplace.
- Manual design editor.

### Install And Validate

```bash
npm install
npm run validate
```

`npm run validate` runs:

- `npm run typecheck`
- `npm test`

The test suite covers contracts, M2, M3, M4, and M5. The project passes when TypeScript type checking and all Vitest tests pass.

### Main Folders

```text
src/contracts     Shared contracts, status, error codes, validators
src/fixtures      Deterministic sample brand context and generation runs
src/pipeline      Brief, adapter, overlay, QA, regeneration, single/multi runners
src/gallery       Gallery preview view model
src/export        Export metadata and local package writer
tests             Contract and milestone tests
```

### Key Idea

The pipeline result is the final output. It contains one generation run. The run `status` is an aggregate state, such as `completed`, `failed`, or `partial_failed`. Each item `status` represents the actual outcome of one generated image, such as `passed`, `failed`, or `needs_human`.

`partial_failed` is only a run-level status. It must not appear as an item-level status.

All business modules must import shared types, statuses, error codes, and result shapes from `src/contracts`. Modules must not redefine hidden string statuses or error shapes.
