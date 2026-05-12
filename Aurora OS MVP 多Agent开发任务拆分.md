# Aurora OS MVP 多 Agent 开发任务拆分

版本：v0.1  
日期：2026-05-12  
依据：`Aurora OS PRD.md`  
方法：Hermes-first、单图闭环优先、多 Agent 并行开发、gstack QA gate

---

## 1. 开发目标

Aurora OS v1 只交付一个 Hermes-first 品牌内容生成插件：

1. 接收品牌上下文、logo、产品图和内容意图。
2. 构建 Image-2 可用的结构化 brief。
3. 调用 Image-2 生成基础图。
4. 用 deterministic overlay 固定嵌入 logo 和产品图。
5. 执行 QA checker。
6. QA fail 时自动调整 brief 并重新生成。
7. 在 Gallery 中预览结果，并支持导出 PNG、JPG、JSON metadata。

v1 不做发布、日历、A/B、爆款评分、OpenClaw 原生插件、多品牌后台和手动设计编辑器。

---

## 2. 总体开发顺序

### Phase 0：项目骨架与契约

目标：先把所有 agent 共享的接口钉住，避免并行开发互相阻塞。

交付物：

- Hermes plugin entry：`runAuroraImagePipeline(input)`
- TypeScript domain types
- 错误码枚举
- channel format 与尺寸映射
- job/item 状态模型
- sample brand context
- mock asset refs

完成标准：

- 可以在本地调用空 pipeline。
- 输入输出类型与 PRD 一致。
- 所有后续模块只依赖这些契约。

### Phase 1：单图主链路

目标：先跑通一张图的完整闭环。

链路：

`input validation -> brief builder -> image adapter -> overlay -> QA -> result`

完成标准：

- 给定一个有效 brand context、logo、产品图和 content intent，能返回一个 `GeneratedItem`。
- 即使 Image-2 先用 mock adapter，也要保持真实 adapter contract。
- pipeline 能记录每一步失败原因。

### Phase 2：QA-driven regeneration

目标：让 fail 不直接结束，而是进入可追踪的重生成闭环。

完成标准：

- 单图最多 3 轮 QA-driven regeneration。
- issue code 能转换为 brief adjustment。
- 达到上限后返回 `REGENERATION_LIMIT_REACHED`。
- 用户可见失败原因、重试次数和下一步状态。

### Phase 3：Preview Gallery 与 Export

目标：让用户在 Hermes 中能看结果、看 QA 状态、导出素材。

完成标准：

- Gallery 展示缩略图、QA 状态、issue、重试次数、生成时间、导出按钮。
- Export 输出 final image、QA result、brief、overlay metadata。
- 支持 PNG、JPG、JSON metadata。

### Phase 4：多图 pipeline

目标：复用单图 pipeline 支持 `generation_count > 1`。

完成标准：

- `generation_count = 4` 时生成 4 个 variant brief。
- 每个 item 独立执行 Image-2、Overlay、QA、Regeneration。
- 单个 item 失败不阻塞其他 item。
- 全部通过为 `completed`，部分失败为 `partial_failed`。

### Phase 5：硬化、Review、QA、Ship

目标：补齐错误处理、测试、QA gate 和交付检查。

完成标准：

- 单元测试覆盖核心纯函数。
- 集成测试覆盖单图、多图、QA fail regeneration。
- gstack `/review` 无 P0/P1 阻断问题。
- gstack `/qa` 或 `/qa-only` 通过核心验收路径。

---

## 3. 多 Agent 分工

### Agent A：Contract / Runtime Owner

职责：

- 定义 Hermes plugin entry contract。
- 定义 `AuroraImagePipelineInput`、`AuroraImagePipelineResult`、`GeneratedItem`。
- 定义 `BrandContext`、`AssetRef`、`ImageBrief`、`QAResult`、`OverlayMetadata`。
- 定义错误码与状态枚举。
- 提供 sample fixtures。

建议写入范围：

- `src/types/*`
- `src/contracts/*`
- `src/fixtures/*`

依赖：

- 无，优先启动。

验收：

- 类型能被其他模块直接引用。
- 字段覆盖 PRD 6、7、8 章。

### Agent B：Brief Builder Owner

职责：

- 把 brand context、content intent、channel format、generation count 转成 structured brief。
- 支持单图 brief。
- 支持多图 variant brief。
- 支持 QA issue 到 brief adjustment 的转换。

建议写入范围：

- `src/brief/*`
- `tests/brief/*`

依赖：

- Agent A 的 domain types。

验收：

- 输出包含尺寸、image direction、copy direction、tone constraints、style constraints、negative constraints。
- `STYLE_MISMATCH`、`BRAND_TONE_MISMATCH`、`PREFERENCE_CONFLICT` 能生成明确 adjustment。

### Agent C：Image-2 Adapter Owner

职责：

- 定义 Image-2 adapter interface。
- 实现 mock adapter。
- 实现真实 adapter 的 request builder 与错误映射。
- 支持 Image-2 request failed 最多 2 次 retry。
- 支持 empty result 最多 1 次 retry。

建议写入范围：

- `src/image2/*`
- `tests/image2/*`

依赖：

- Agent A types。
- Agent B brief output。

验收：

- adapter 不负责最终嵌入 logo 和产品图。
- 失败能映射为 `IMAGE2_REQUEST_FAILED`、`IMAGE2_TIMEOUT`、`IMAGE2_EMPTY_RESULT`。

### Agent D：Deterministic Overlay Owner

职责：

- 按 logo rules 放置 logo。
- 按 product rules 放置产品图。
- 输出 final image 与 overlay metadata。
- 校验输出尺寸。

建议写入范围：

- `src/overlay/*`
- `tests/overlay/*`

依赖：

- Agent A types。

验收：

- logo 不交给图像模型决定。
- product 不交给图像模型重绘。
- overlay 失败直接返回 `OVERLAY_FAILED`，不自动重试。

### Agent E：QA Checker Owner

职责：

- 实现基础 QA：文件可打开、尺寸、logo metadata、product metadata。
- 实现文本 QA：禁用词、必需词。
- 实现品牌 QA：品牌色、tone rules、style preferences、historical preferences 的 MVP 判定。
- 输出可操作 issue 和 regeneration hint。

建议写入范围：

- `src/qa/*`
- `tests/qa/*`

依赖：

- Agent A types。
- Agent D overlay metadata。

验收：

- 能返回 `pass`、`warning`、`fail`。
- 必须覆盖 `LOGO_MISSING`、`PRODUCT_MISSING`、`SIZE_MISMATCH`、`FORBIDDEN_WORD_DETECTED`、`BRAND_TONE_MISMATCH`、`STYLE_MISMATCH`、`PREFERENCE_CONFLICT`。

### Agent F：Pipeline Orchestrator Owner

职责：

- 编排单图 pipeline。
- 编排多图 pipeline。
- 实现 QA-driven regeneration loop。
- 汇总 job status 与 qa summary。
- 保证 partial success。

建议写入范围：

- `src/pipeline/*`
- `tests/pipeline/*`

依赖：

- Agent A、B、C、D、E。

验收：

- 单图最多 3 轮 regeneration。
- 多图每个 item 最多 2 轮 regeneration。
- 单 item fail 不阻塞其他 item。
- 返回结构符合 PRD。

### Agent G：Gallery / Export Owner

职责：

- 实现 Hermes 插件展示层。
- Gallery 展示结果、QA 状态、issue、重试次数、是否自动重生成、生成时间。
- Export PNG、JPG、JSON metadata。

建议写入范围：

- `src/ui/*`
- `src/export/*`
- `tests/export/*`

依赖：

- Agent A result types。
- Agent F pipeline result。

验收：

- 用户能完成生成、预览、导出闭环。
- 导出包包含 final image、QA result、brief、overlay metadata。

### Agent H：QA / Review Owner

职责：

- 编写测试矩阵。
- 运行自动化测试。
- 使用 gstack `/review` 做代码审查。
- 使用 gstack `/qa` 做端到端 QA。
- 汇总阻断问题并派回对应 owner。

建议写入范围：

- `tests/e2e/*`
- `qa-reports/*`
- 不直接改业务代码，除非问题很小且 owner 同意。

依赖：

- 所有功能 owner 的集成结果。

验收：

- 生成 QA 报告。
- P0/P1 问题关闭。
- 验收路径通过。

---

## 4. 并行与串行依赖

第一批并行：

- Agent A：contract/types
- Agent B：brief builder 草案，可先依赖临时 types
- Agent C：adapter interface + mock
- Agent D：overlay prototype
- Agent E：QA issue schema + 基础 QA 草案

第二批并行：

- Agent F：单图 orchestration
- Agent B：regeneration adjustment
- Agent C：retry/error mapping
- Agent D：真实 overlay metadata
- Agent E：品牌 QA 扩展

第三批并行：

- Agent F：多图 orchestration
- Agent G：Gallery
- Agent G：Export
- Agent H：测试矩阵和 QA 脚本

最后串行：

1. 集成主链路。
2. 修复类型和契约不一致。
3. 跑单元测试和集成测试。
4. gstack `/review`。
5. 修复 review 问题。
6. gstack `/qa`。
7. 修复 QA 问题。
8. gstack `/ship`。

---

## 5. gstack 开发方法

### 5.1 开发 kickoff

使用 `/autoplan` 或人工 kickoff 明确：

- 本轮只做 Hermes-first MVP。
- 先单图，后多图。
- Image-2 可先 mock，但 contract 不能 mock 掉。
- Overlay 与 QA 是核心，不是后补。

### 5.2 分配 agent

每个 agent 必须拿到：

- 自己负责的模块。
- 可写文件范围。
- 依赖的 contract。
- 不允许改动的模块。
- 验收标准。

推荐 prompt 模板：

```text
你负责 Aurora OS Hermes-first MVP 的 [模块名]。
只修改 [文件范围]。
不要重构其他 agent 的代码。
必须遵守 Aurora OS PRD.md。
交付：实现代码、单元测试、简短说明。
完成前运行相关测试。
```

### 5.3 日常协作规则

- Contract 先合入，其他 agent 只围绕 contract 开发。
- 所有模块暴露窄接口，不跨层读取内部状态。
- Mock adapter 只用于本地和测试，不污染真实 Image-2 contract。
- QA issue code 必须稳定，regeneration 依赖 issue code。
- 多图 pipeline 不新建独立业务逻辑，只复用单图 item runner。

### 5.4 Review gate

集成后执行 gstack `/review`。

重点检查：

- PRD 范围是否漂移。
- 是否把 logo/product 嵌入交给 Image-2。
- QA fail 是否真的进入 regeneration。
- 多图 item 是否互不阻塞。
- 错误码是否命名清晰。
- 是否有缺失测试。

### 5.5 QA gate

执行 gstack `/qa`，如果只需要报告不改代码，执行 `/qa-only`。

QA 必测路径：

1. 单图成功生成。
2. 单图 QA fail 后 regeneration 成功。
3. 单图 regeneration 达到上限。
4. 多图 4 张全部成功。
5. 多图部分失败，job status 为 `partial_failed`。
6. logo 缺失返回 `LOGO_MISSING`。
7. 产品图缺失返回 `PRODUCT_MISSING`。
8. 尺寸错误返回 `SIZE_MISMATCH`。
9. 禁用词返回 `FORBIDDEN_WORD_DETECTED`。
10. Gallery 能展示状态与 issue。
11. Export 包含 image、QA、brief、overlay metadata。

### 5.6 Ship gate

执行 gstack `/ship` 前必须满足：

- 自动化测试通过。
- `/review` 无 P0/P1。
- `/qa` 核心路径通过。
- 未引入 v1 明确 deferred 的功能。
- 文档记录已知限制。

---

## 6. 测试矩阵

### Unit Tests

- Brand context validation
- channel format size mapping
- brief builder
- variant brief generation
- QA issue to brief adjustment
- Image-2 retry policy
- overlay rule calculation
- QA issue generation
- qa summary aggregation

### Integration Tests

- single image pass
- single image QA fail then pass
- single image regeneration limit reached
- image adapter request failed retry
- overlay failed direct fail
- multi image all pass
- multi image partial failed
- export metadata complete

### UI / Hermes QA

- plugin opens
- form accepts brand context and assets
- generation count 1
- generation count 4
- Gallery renders thumbnails and statuses
- failed item displays issue and retry count
- export button produces expected files

---

## 7. 里程碑建议

### M1：Contract Freeze

范围：

- types
- contract
- error codes
- sample fixtures

退出条件：

- 所有 agent 可以基于 contract 并行。

### M2：Single Image Vertical Slice

范围：

- brief
- mock Image-2
- overlay
- basic QA
- pipeline result

退出条件：

- 单图闭环跑通。

### M3：Regeneration Loop

范围：

- QA issue adjustment
- retry limits
- human intervention states

退出条件：

- QA fail 可自动调整 brief 并重试。

### M4：Gallery + Export

范围：

- preview
- QA status display
- export files

退出条件：

- Hermes 内完成生成、预览、导出。

### M5：Multi Image + QA Hardening

范围：

- 4 张批量生成
- independent item regeneration
- partial failed
- gstack QA

退出条件：

- PRD 验收标准通过。

---

## 8. 当前最高风险

1. QA 过度抽象：必须先做可判定的 named checks，再谈品牌一致性。
2. Image-2 能力不确定：adapter 必须隔离真实模型，保留 mock 和错误映射。
3. Overlay 复杂度低估：logo/product 位置、尺寸、安全边距和透明图处理要尽早验证。
4. 多图过早开发：必须等单图 item runner 稳定后复用，不要另写一套流程。
5. v1 范围膨胀：发布、日历、A/B、OpenClaw 都应拒绝进入当前里程碑。

---

## 9. 推荐第一轮 Agent 派发

第一轮只派 5 个 agent：

1. Agent A：Contract / Runtime
2. Agent B：Brief Builder
3. Agent C：Image-2 Adapter Mock + Interface
4. Agent D：Overlay
5. Agent E：QA Checker Skeleton

暂时不要启动 Gallery、多图、Export。等 M2 单图 vertical slice 可运行后，再启动 Agent F/G/H。

