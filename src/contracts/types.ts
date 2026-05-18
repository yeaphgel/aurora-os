import type { PipelineError } from "./errors.js";
import type { GenerationItemStatus, QAIssueSeverity, QAStatus, RunStatus } from "./status.js";

export type ChannelFormat = "square" | "portrait" | "landscape" | "custom";

export type AssetFormat = "png" | "jpg" | "jpeg" | "webp";

export interface AssetRef {
  assetId: string;
  uri: string;
  format: AssetFormat;
  role: "logo" | "product" | "reference" | "generated" | "final" | "thumbnail";
  width?: number;
  height?: number;
  mimeType?: string;
}

export type BrandAsset = AssetRef;

export interface BrandContext {
  brandId: string;
  brandName: string;
  tone: string;
  brandColors: string[];
  avoidWords: string[];
  mustInclude: string[];
  visualStyle: string;
  toneRules: {
    voice: string;
    emotion: string;
    formality: "low" | "medium" | "high";
    mustFeelLike: string[];
    mustNotFeelLike: string[];
  };
  stylePreferences: {
    preferredComposition: string[];
    preferredLighting: string;
    preferredTexture: string;
    avoidStyles: string[];
  };
  historicalPreferences: {
    approvedExamples: string[];
    rejectedExamples: string[];
    notes: string[];
  };
  logoRules: {
    position: OverlayPosition;
    safeMarginPx: number;
    minWidthPx: number;
  };
  productRules: {
    position: OverlayPosition;
    maxAreaRatio: number;
  };
}

export interface AuroraImagePipelineInput {
  brandId: string;
  campaignName?: string;
  contentIntent: string;
  generationCount: 1 | 4;
  channelFormat: ChannelFormat;
  brandContext: BrandContext;
  logoAsset: AssetRef;
  productAssets: AssetRef[];
}

export interface ImageBrief {
  briefId: string;
  channelFormat: ChannelFormat;
  size: {
    width: number;
    height: number;
  };
  imageDirection: string;
  copyDirection: string;
  brandToneConstraints: string[];
  styleConstraints: string[];
  preferenceMemory: {
    useApprovedExamplesAsReference: boolean;
    avoidRejectedExamplePatterns: boolean;
  };
  negativeConstraints: string[];
  variantIndex: number;
  variantCount: 1 | 4;
}

export type M6RenderMode = "native_product_reference" | "native_text_logo" | "overlay_fallback";

export type BrandedProductVisualType =
  | "hero_packshot"
  | "cinematic_environment"
  | "lifestyle_identity"
  | "creator_workbench"
  | "technical_precision"
  | "ecosystem_layout"
  | "use_case_proof"
  | "macro_material"
  | "before_after_compare"
  | "brand_symbol_world"
  | "editorial_story_panel"
  | "retail_conversion_card";

export type BrandStoryMode =
  | "problem_solution"
  | "journey_transition"
  | "workflow_steps"
  | "hero_mission"
  | "identity_projection"
  | "upgrade_announcement"
  | "proof_by_context"
  | "ritual_of_use"
  | "anatomy_explainer"
  | "ecosystem_story"
  | "aspirational_world"
  | "comparison_claim";

export type TextEditPolicy = "exact" | "locked_meaning" | "creative";

export interface TextBlockSpec {
  role: "brand" | "product_name" | "headline" | "subhead" | "supporting" | "cta";
  text: string;
  priority: "required" | "recommended" | "optional";
  editPolicy: TextEditPolicy;
}

export interface ProductRenderSpec {
  asset: AssetRef;
  referenceMode: "reference_locked";
  integrationGoal: "scene_integrated";
  preserveDetails: string[];
  maxDistortion: "none" | "minor";
  fallback: "overlay_if_failed" | "fail_if_not_integrated";
}

export interface LogoRenderSpec {
  asset: AssetRef;
  strategy: "native_with_exactness_qa" | "deterministic_required";
  minWidthPx: number;
  safeMarginPx: number;
}

export interface SceneSpec {
  environment: string;
  lighting: string;
  composition: string[];
  mustAvoid: string[];
}

export interface VisualQAPolicy {
  requireProductReferenceAttached: boolean;
  requireNativeProductReference: boolean;
  requireProductNotOverlayOnly: boolean;
  requireHumanIntegrationReview: boolean;
}

export interface ImageBriefV2 {
  briefId: string;
  schemaVersion: "m6.0";
  channelFormat: ChannelFormat;
  size: {
    width: number;
    height: number;
  };
  renderMode: M6RenderMode;
  creativeIntent: string;
  visualType: BrandedProductVisualType;
  storyMode: BrandStoryMode;
  layoutSpec: {
    safeMarginPx: number;
    textPlacement: "minimal_top" | "minimal_bottom" | "integrated";
    productPlacement: "scene_center" | "scene_foreground" | "environmental";
  };
  textBlocks: TextBlockSpec[];
  logoSpec: LogoRenderSpec;
  productSpec: ProductRenderSpec;
  sceneSpec: SceneSpec;
  referencePolicy: {
    useBrandApprovedExamples: boolean;
    avoidBrandRejectedExamples: boolean;
    useGlobalPremiumReferences: boolean;
  };
  qaPolicy: VisualQAPolicy;
  promptPayload: {
    systemPrompt: string;
    userPrompt: string;
    negativePrompt: string;
  };
  negativeConstraints: string[];
  variantIndex: number;
  variantCount: 1 | 4;
}

export interface BriefBuilderV2Request {
  input: AuroraImagePipelineInput;
  variantIndex: number;
  variantCount: 1 | 4;
  briefId: string;
}

export interface BriefBuilderV2 {
  build(request: BriefBuilderV2Request): ImageBriefV2;
}

export interface BriefBuilderRequest {
  input: AuroraImagePipelineInput;
  variantIndex: number;
  variantCount: 1 | 4;
  briefId: string;
}

export interface BriefBuilder {
  build(request: BriefBuilderRequest): ImageBrief;
}

export type OverlayPosition =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | "center";

export interface OverlaySpec {
  outputSize: {
    width: number;
    height: number;
  };
  logo: {
    asset: AssetRef;
    position: OverlayPosition;
    safeMarginPx: number;
    minWidthPx: number;
    required: boolean;
  };
  product: {
    asset: AssetRef;
    position: OverlayPosition;
    maxAreaRatio: number;
    required: boolean;
  };
}

export interface OverlayMetadata {
  logoApplied: boolean;
  logoPosition: OverlayPosition;
  logoSafeMarginPx: number;
  productApplied: boolean;
  productPosition: OverlayPosition;
  outputSize: {
    width: number;
    height: number;
  };
}

export type QAIssueCode =
  | "HAS_IMAGE_OUTPUT"
  | "HAS_REQUIRED_BRAND_NAME"
  | "HAS_LOGO_IF_REQUIRED"
  | "LOGO_SAFE_MARGIN"
  | "PRODUCT_VISIBLE_IF_REQUIRED"
  | "SIZE_MISMATCH"
  | "FORBIDDEN_WORD_DETECTED"
  | "BRAND_TONE_MISMATCH"
  | "STYLE_MISMATCH"
  | "PREFERENCE_CONFLICT"
  | "PRODUCT_REFERENCE_ATTACHED"
  | "NATIVE_PRODUCT_REFERENCE_USED"
  | "PRODUCT_NOT_OVERLAY_ONLY"
  | "PRODUCT_INTEGRATION_REVIEW_REQUIRED"
  | "NO_UNKNOWN_ERROR";

export const QA_ISSUE_CODE = {
  HAS_IMAGE_OUTPUT: "HAS_IMAGE_OUTPUT",
  HAS_REQUIRED_BRAND_NAME: "HAS_REQUIRED_BRAND_NAME",
  HAS_LOGO_IF_REQUIRED: "HAS_LOGO_IF_REQUIRED",
  LOGO_SAFE_MARGIN: "LOGO_SAFE_MARGIN",
  PRODUCT_VISIBLE_IF_REQUIRED: "PRODUCT_VISIBLE_IF_REQUIRED",
  SIZE_MISMATCH: "SIZE_MISMATCH",
  FORBIDDEN_WORD_DETECTED: "FORBIDDEN_WORD_DETECTED",
  BRAND_TONE_MISMATCH: "BRAND_TONE_MISMATCH",
  STYLE_MISMATCH: "STYLE_MISMATCH",
  PREFERENCE_CONFLICT: "PREFERENCE_CONFLICT",
  PRODUCT_REFERENCE_ATTACHED: "PRODUCT_REFERENCE_ATTACHED",
  NATIVE_PRODUCT_REFERENCE_USED: "NATIVE_PRODUCT_REFERENCE_USED",
  PRODUCT_NOT_OVERLAY_ONLY: "PRODUCT_NOT_OVERLAY_ONLY",
  PRODUCT_INTEGRATION_REVIEW_REQUIRED: "PRODUCT_INTEGRATION_REVIEW_REQUIRED",
  NO_UNKNOWN_ERROR: "NO_UNKNOWN_ERROR",
} as const satisfies Record<string, QAIssueCode>;

export interface QAIssue {
  code: QAIssueCode;
  severity: QAIssueSeverity;
  message: string;
  regenerationHint?: string;
}

export interface QAResult {
  status: QAStatus;
  issues: QAIssue[];
  checkedAt: string;
}

export interface GeneratedImage {
  imageId: string;
  uri: string;
  width: number;
  height: number;
  format: AssetFormat;
}

export interface GeneratedImageV2 extends GeneratedImage {
  adapterMode: "hermes_live" | "mock";
  modelId?: string;
  attemptId?: string;
  usedProductReference: boolean;
  usedLogoReference: boolean;
  usedOverlayFallback: boolean;
  inputAssetIds: string[];
}

export interface Image2GenerationRequest {
  brandContext: BrandContext;
  brief: ImageBrief;
  logoAsset: AssetRef;
  productAsset: AssetRef;
  attempt: number;
}

export interface Image2Adapter {
  generate(request: Image2GenerationRequest): Promise<GeneratedImage>;
}

export interface Image2GenerationRequestV2 {
  brandContext: BrandContext;
  brief: ImageBriefV2;
  logoAsset: AssetRef;
  productAsset: AssetRef;
  referenceAssets: AssetRef[];
  attempt: number;
}

export interface Image2AdapterV2 {
  generate(request: Image2GenerationRequestV2): Promise<GeneratedImageV2>;
}

export interface MockImage2AdapterOptions {
  images?: GeneratedImage[];
  rejectAttempts?: number[];
  timeoutAttempts?: number[];
  uriPrefix?: string;
  format?: AssetFormat;
}

export interface OverlayEngineRequest {
  baseImage: GeneratedImage;
  spec: OverlaySpec;
  attempt: number;
  finalImageId: string;
}

export interface OverlayEngineResult {
  finalImage: GeneratedImage;
  metadata: OverlayMetadata;
}

export interface OverlayEngine {
  apply(request: OverlayEngineRequest): OverlayEngineResult | Promise<OverlayEngineResult>;
}

export interface QACheckerRequest {
  brandContext: BrandContext;
  brief: ImageBrief;
  baseImage: GeneratedImage;
  finalImage: GeneratedImage;
  overlayMetadata: OverlayMetadata;
}

export interface QAChecker {
  check(request: QACheckerRequest): QAResult;
}

export interface BriefRegenerationAdjustmentRequest {
  input: AuroraImagePipelineInput;
  failedBrief: ImageBrief;
  qa: QAResult;
  retryCount: number;
  nextAttempt: number;
}

export interface BriefRegenerationAdjuster {
  adjust(request: BriefRegenerationAdjustmentRequest): ImageBrief;
}

export interface PipelineIdFactory {
  jobId(input: AuroraImagePipelineInput): string;
  runId(input: AuroraImagePipelineInput): string;
  itemId(input: AuroraImagePipelineInput, index: number): string;
  briefId(input: AuroraImagePipelineInput, index: number): string;
  finalImageId(baseImage: GeneratedImage): string;
}

export interface SingleImagePipelineDependencies {
  imageAdapter: Image2Adapter;
  briefBuilder?: BriefBuilder;
  regenerationAdjuster?: BriefRegenerationAdjuster;
  overlayEngine?: OverlayEngine;
  qaChecker?: QAChecker;
  now?: () => string;
  idFactory?: PipelineIdFactory;
  maxRetries?: number;
}

export interface SingleImagePipelineV2Dependencies {
  imageAdapterV2?: Image2AdapterV2;
  briefBuilderV2?: BriefBuilderV2;
  now?: () => string;
  idFactory?: PipelineIdFactory;
}

export interface GenerationItem {
  itemId: string;
  index: number;
  status: GenerationItemStatus;
  briefId: string;
  brief: ImageBrief;
  image?: GeneratedImage;
  finalImage?: GeneratedImage;
  overlayMetadata?: OverlayMetadata;
  qa?: QAResult;
  retryCount: number;
  maxRetries: number;
  issues: QAIssue[];
  error?: PipelineError;
}

export interface GenerationRunSummary {
  total: number;
  passed: number;
  failed: number;
  retrying: number;
  needsHuman: number;
}

export interface GenerationRun {
  runId: string;
  count: 1 | 4;
  status: RunStatus;
  items: GenerationItem[];
  summary: GenerationRunSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineResult {
  jobId: string;
  run: GenerationRun;
}

export interface M6GenerationItem {
  itemId: string;
  index: number;
  status: GenerationItemStatus;
  briefId: string;
  brief: ImageBriefV2;
  image?: GeneratedImageV2;
  finalImage?: GeneratedImageV2;
  qa?: QAResult;
  retryCount: number;
  maxRetries: number;
  issues: QAIssue[];
  error?: PipelineError;
  m6: {
    renderMode: M6RenderMode;
    visualType: BrandedProductVisualType;
    storyMode: BrandStoryMode;
    productReferenceAttached: boolean;
    nativeProductReferenceUsed: boolean;
    overlayFallbackUsed: boolean;
  };
}

export interface M6GenerationRun {
  runId: string;
  count: 1;
  status: RunStatus;
  items: M6GenerationItem[];
  summary: GenerationRunSummary;
  createdAt: string;
  updatedAt: string;
}

export interface M6PipelineResult {
  jobId: string;
  run: M6GenerationRun;
  m6: {
    schemaVersion: "m6.0";
    adapterBoundary: "injected";
    stableApprovalReady: boolean;
  };
}

export interface GalleryPreviewItem {
  itemId: string;
  index: number;
  status: GenerationItemStatus;
  thumbnailUri?: string;
  finalImageUri?: string;
  qaStatus?: QAStatus;
  issues: QAIssue[];
  retryCount: number;
  maxRetries: number;
  autoRegenerated: boolean;
  generatedAt: string;
  canExport: boolean;
}

export interface GalleryPreview {
  runId: string;
  status: RunStatus;
  summary: GenerationRunSummary;
  items: GalleryPreviewItem[];
  createdAt: string;
  updatedAt: string;
}

export type ExportImageFormat = Extract<AssetFormat, "png" | "jpg">;

export interface ExportMetadataItem {
  itemId: string;
  status: GenerationItemStatus;
  retryCount: number;
  files?: {
    image?: string;
    thumbnail?: string;
  };
  issues?: QAIssue[];
}

export interface ExportMetadata {
  runId: string;
  project: "Aurora OS";
  engine: "image-2";
  mode: "mock" | "live";
  generationCount: 1 | 4;
  status: RunStatus;
  createdAt: string;
  items: ExportMetadataItem[];
}

export interface ExportManifest {
  version: "1.0.0";
  runId: string;
  files: string[];
}

export interface ExportImageWriteRequest {
  item: GenerationItem;
  format: ExportImageFormat;
  targetPath: string;
}

export interface ExportAssetWriter {
  writeImage(request: ExportImageWriteRequest): Promise<string>;
}

export interface ExportPackageRequest {
  result: PipelineResult;
  outputDir: string;
  formats?: ExportImageFormat[];
  mode?: ExportMetadata["mode"];
  assetWriter?: ExportAssetWriter;
}

export interface ExportPackageResult {
  metadata: ExportMetadata;
  manifest: ExportManifest;
  files: string[];
}
