# Aurora OS 品牌资料初始化手册

本手册用于把零散、不连续的品牌资料整理成 Aurora OS 可用的品牌上下文。它适合在品牌资料还不完整时启动项目：先收集最少必要信息，生成一版可用的 `BrandContext` 草案，再在后续使用中逐步补全。

本手册面向 Codex / Claude Code / 其他代码代理使用。代理在处理 Aurora OS 的品牌初始化、品牌资料更新、图片生成准备、内容 brief 生成前，应优先读取本手册。

## 1. 使用目标

Aurora OS 是 Hermes-first brand content generation plugin base。品牌资料初始化的目标不是一次性完成完整品牌手册，而是把用户提供的官网、截图、文档、口头描述、参考图、产品图、Logo 等资料，整理成当前流水线可以使用的结构化输入。

当前 Aurora OS 的核心品牌输入为：

```ts
BrandContext {
  brandId
  brandName
  tone
  brandColors
  avoidWords
  mustInclude
  visualStyle
  toneRules
  stylePreferences
  historicalPreferences
  logoRules
  productRules
}
```

只要资料达到最低可用标准，就可以先生成一版品牌资料草案。资料不足时，不要阻塞用户；应标注推断项、缺失项和下一轮最值得补充的资料。

## 2. 最小资料收集要求

用户不需要一次性提供完整品牌资料。只要提供以下任意 3-5 项，就可以启动 Aurora OS 品牌初始化：

- 品牌名称
- 官网、产品页、店铺、社媒主页或公开介绍链接
- 产品或服务的一句话说明
- 目标用户或使用场景
- 主要卖点、核心功能或差异化优势
- Logo 文件、Logo 截图或品牌标识说明
- 产品图、包装图、App 截图、界面图或实物图
- 喜欢的视觉参考图、广告图、海报或竞品案例
- 不喜欢的视觉参考图、广告图、海报或竞品案例
- 必须出现的词、口号、品牌名写法或合规声明
- 禁用词、禁用表达、禁用风格或容易误导的说法

如果用户只给了官网或资料链接，应先从可访问资料中提取基础信息，再询问少量补充问题。每次最多提出 3 个高价值问题。

## 3. 资料完整度评分

每次输出品牌资料时，必须给出资料完整度。完整度不是品牌成熟度，而是 Aurora OS 当前生成流程所需资料的可用程度。

输出格式：

```text
资料完整度：45%
[█████░░░░░] 45%
```

评分建议：

| 模块 | 权重 | 达标标准 |
| --- | ---: | --- |
| 品牌基础信息 | 20% | 有品牌名、品牌简介、官网或来源说明 |
| 产品与用户信息 | 20% | 有产品/服务说明、目标用户、使用场景、核心卖点 |
| 语气与文案规则 | 15% | 有 tone、voice、mustInclude、avoidWords 或表达边界 |
| 视觉风格规则 | 20% | 有颜色、风格关键词、构图、光线、质感、禁用风格 |
| Logo 与产品素材 | 15% | 有 Logo 规则、产品素材、素材位置或可替代说明 |
| 历史偏好样本 | 10% | 有 approved/rejected examples 或明确偏好备注 |

评分规则：

- 用户明确提供的信息优先计分。
- 从官网、图片、文档中合理提取的信息可以计分，但必须标注来源或说明为「从资料推断」。
- 没有依据的审美判断不能高计分。
- 资料缺失时可以使用保守默认值，但默认值不应让完整度虚高。
- 完整度未达到 100% 时，必须输出下一步补充建议。

## 4. Aurora OS 字段映射规则

将用户资料整理为 `BrandContext` 时，按以下规则映射。

### 4.1 brandId

稳定、机器可读的品牌 ID。建议使用小写英文、数字和下划线。

示例：

```text
aurora_sample_brand
```

如果用户没有提供英文名，可根据品牌中文名生成拼音或简短英文代号，并标注为推断。

### 4.2 brandName

品牌正式展示名称。必须尽量保留用户提供的大小写、空格、中英文写法。

如果存在多个写法，应记录：

- 主写法
- 可接受写法
- 禁止写法

### 4.3 tone

品牌整体语气。优先从用户资料中提取；不足时使用保守描述。

常见值：

- premium
- professional
- friendly
- calm
- innovative
- playful
- expert
- minimalist

### 4.4 brandColors

品牌主色、辅助色和基础色。格式使用 HEX。

如果没有明确色值：

- 可从 Logo、官网截图、产品图中提取近似色。
- 不确定时使用少量保守颜色。
- 必须标注「推断色值」。

### 4.5 avoidWords

禁用词、风险表达、夸大承诺、合规敏感词。

如果用户未提供，应先加入通用保守项，例如：

```text
guaranteed, best, no risk, cure, forbidden, overclaim
```

中文品牌可补充：

```text
绝对, 第一, 保证, 零风险, 治愈, 永久有效
```

### 4.6 mustInclude

必须出现在文案或画面 brief 中的词。通常包括：

- 品牌名
- 产品名
- 核心口号
- 活动名
- 合规声明

资料不足时，至少包含 `brandName`。

### 4.7 visualStyle

品牌主视觉风格，使用简短关键词或短语。

示例：

```text
minimal
premium editorial
clean studio
technical and precise
warm lifestyle
```

### 4.8 toneRules

用于约束文案和整体感受。

字段说明：

- `voice`: 表达方式，例如 professional、direct、warm、expert。
- `emotion`: 情绪感受，例如 calm、confident、energetic、trustworthy。
- `formality`: 正式程度，只能是 `low`、`medium`、`high`。
- `mustFeelLike`: 必须让人感受到的关键词。
- `mustNotFeelLike`: 必须避免的感受。

### 4.9 stylePreferences

用于约束图片生成方向。

字段说明：

- `preferredComposition`: 构图偏好，例如 centered product、white space、close-up detail。
- `preferredLighting`: 光线偏好，例如 soft studio lighting、natural daylight。
- `preferredTexture`: 质感偏好，例如 clean matte、premium metal、paper grain。
- `avoidStyles`: 禁用视觉风格，例如 cyberpunk、cartoon、cheap sale poster。

### 4.10 historicalPreferences

用于积累用户的历史偏好。

字段说明：

- `approvedExamples`: 用户认可的图片、海报、广告或资产链接。
- `rejectedExamples`: 用户否定的图片、海报、广告或资产链接。
- `notes`: 从历史反馈中提炼出的偏好规则。

如果没有历史样本，保持空数组，不要编造。

### 4.11 logoRules

Logo 叠加规则。

默认值：

```ts
logoRules: {
  position: "bottom_right",
  safeMarginPx: 48,
  minWidthPx: 120,
}
```

如果用户提供品牌规范，应以品牌规范为准。

### 4.12 productRules

产品叠加规则。

默认值：

```ts
productRules: {
  position: "center",
  maxAreaRatio: 0.45,
}
```

如果品牌不是实体产品，可以把产品素材理解为 App 截图、服务界面、人物肖像、场景图或核心视觉物。

## 5. 资料不足时的默认策略

资料不足时，代理不得停止工作。应采用以下策略：

1. 明确区分「用户确认」和「AI 推断」。
2. 使用保守默认值，避免夸张、过度营销、强风格化。
3. 不编造官网没有出现的硬性事实。
4. 不编造用户没有提供的品牌历史、奖项、客户、合作方。
5. 对未知字段使用空数组、默认规则或低风险通用描述。
6. 每轮最多追问 3 个问题。
7. 优先追问对生成质量影响最大的缺失项。

推荐追问顺序：

1. 你希望品牌给人的第一感受是什么？
2. 是否有 Logo、产品图、官网或参考图可以提供？
3. 有哪些词、风格或表达是绝对不要出现的？

## 6. 每次输出格式

每次初始化或更新品牌资料时，按以下格式输出。

~~~md
# 品牌资料初始化结果

资料完整度：__%
[__________] __%

## 已确认资料

- 品牌名称：
- 官网/资料来源：
- 产品/服务：
- 目标用户：
- 核心卖点：
- 必须包含：
- 禁止使用：

## AI 推断资料

- 推断语气：
- 推断视觉风格：
- 推断颜色：
- 推断构图/光线/质感：

## 缺失资料

- 
- 
- 

## Aurora OS BrandContext 草案

```ts
const brandContext = {
  brandId: "",
  brandName: "",
  tone: "",
  brandColors: [],
  avoidWords: [],
  mustInclude: [],
  visualStyle: "",
  toneRules: {
    voice: "",
    emotion: "",
    formality: "medium",
    mustFeelLike: [],
    mustNotFeelLike: [],
  },
  stylePreferences: {
    preferredComposition: [],
    preferredLighting: "",
    preferredTexture: "",
    avoidStyles: [],
  },
  historicalPreferences: {
    approvedExamples: [],
    rejectedExamples: [],
    notes: [],
  },
  logoRules: {
    position: "bottom_right",
    safeMarginPx: 48,
    minWidthPx: 120,
  },
  productRules: {
    position: "center",
    maxAreaRatio: 0.45,
  },
};
```

## 下一步最值得补充的 3 项资料

1. 
2. 
3. 
~~~

## 7. 建议的资料存放方式

为了让品牌资料可以逐步积累，建议每个品牌建立独立目录：

```text
_private/brands/{brandId}/
  brand-intake.md
  brand-context.draft.ts
  assets/
    logo/
    product/
    references/
    approved/
    rejected/
```

说明：

- `brand-intake.md` 记录用户原始输入和整理后的品牌资料。
- `brand-context.draft.ts` 保存 Aurora OS 可用的 `BrandContext` 草案。
- `assets/logo/` 保存 Logo。
- `assets/product/` 保存产品图、包装图、App 截图或服务界面。
- `assets/references/` 保存普通参考图。
- `assets/approved/` 保存用户认可的样本。
- `assets/rejected/` 保存用户明确否定的样本。

如果当前任务只是讨论方案或初始化文档，不需要创建品牌目录。只有当用户提供了某个具体品牌资料时，再创建对应目录。

## 8. 给 Codex / Claude Code 的执行指令

当用户要求「初始化品牌」「整理品牌资料」「根据官网生成品牌资料」「为 Aurora OS 准备品牌资产」时，代理应执行：

1. 读取本手册。
2. 收集用户已提供的资料。
3. 如果用户给了官网或链接，提取品牌名、产品说明、视觉线索、语气线索和禁用风险。
4. 输出资料完整度进度条。
5. 区分已确认资料和 AI 推断资料。
6. 生成 Aurora OS `BrandContext` 草案。
7. 给出 3 个以内的下一步补充问题。
8. 除非用户明确要求，不修改 Aurora OS 核心代码。

## 9. 完成度判断

资料完整度达到 60% 时，可以用于初版图片生成。

资料完整度达到 80% 时，可以用于较稳定的品牌内容批量生成。

资料完整度达到 100% 时，应具备：

- 明确品牌名与品牌说明
- 明确产品/服务和目标用户
- 明确语气、视觉风格、颜色、禁用项
- 可用 Logo 或 Logo 替代说明
- 可用产品素材或核心视觉素材
- 至少 1 个 approved 或 rejected 偏好样本
- 明确的 `BrandContext` 字段

在达到 100% 前，代理应持续把新增资料合并进现有品牌档案，而不是每次从零开始。
