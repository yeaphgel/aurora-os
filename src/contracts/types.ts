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
  overlayEngine?: OverlayEngine;
  qaChecker?: QAChecker;
  now?: () => string;
  idFactory?: PipelineIdFactory;
  maxRetries?: number;
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
