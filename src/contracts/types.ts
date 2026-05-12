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

export interface QAIssue {
  code:
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

