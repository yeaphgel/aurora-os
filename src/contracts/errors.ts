export const PIPELINE_ERROR_CODES = [
  "INVALID_BRAND_CONTEXT",
  "MISSING_ASSET",
  "UNSUPPORTED_ASSET_FORMAT",
  "IMAGE_ADAPTER_TIMEOUT",
  "IMAGE_ADAPTER_REJECTED",
  "OVERLAY_FAILED",
  "QA_FAILED",
  "RETRY_LIMIT_REACHED",
  "EXPORT_FAILED",
  "UNKNOWN_PIPELINE_ERROR",
] as const;

export type PipelineErrorCode = (typeof PIPELINE_ERROR_CODES)[number];

export const PIPELINE_ERROR_CODE = {
  INVALID_BRAND_CONTEXT: "INVALID_BRAND_CONTEXT",
  MISSING_ASSET: "MISSING_ASSET",
  UNSUPPORTED_ASSET_FORMAT: "UNSUPPORTED_ASSET_FORMAT",
  IMAGE_ADAPTER_TIMEOUT: "IMAGE_ADAPTER_TIMEOUT",
  IMAGE_ADAPTER_REJECTED: "IMAGE_ADAPTER_REJECTED",
  OVERLAY_FAILED: "OVERLAY_FAILED",
  QA_FAILED: "QA_FAILED",
  RETRY_LIMIT_REACHED: "RETRY_LIMIT_REACHED",
  EXPORT_FAILED: "EXPORT_FAILED",
  UNKNOWN_PIPELINE_ERROR: "UNKNOWN_PIPELINE_ERROR",
} as const satisfies Record<string, PipelineErrorCode>;

export type PipelineStage =
  | "input_validation"
  | "brief_builder"
  | "image_adapter"
  | "overlay"
  | "qa"
  | "regeneration"
  | "export"
  | "unknown";

export const PIPELINE_STAGE = {
  INPUT_VALIDATION: "input_validation",
  BRIEF_BUILDER: "brief_builder",
  IMAGE_ADAPTER: "image_adapter",
  OVERLAY: "overlay",
  QA: "qa",
  REGENERATION: "regeneration",
  EXPORT: "export",
  UNKNOWN: "unknown",
} as const satisfies Record<string, PipelineStage>;

export interface PipelineError {
  code: PipelineErrorCode;
  stage: PipelineStage;
  message: string;
  retryable: boolean;
  cause?: unknown;
}
