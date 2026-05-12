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

export type PipelineStage =
  | "input_validation"
  | "brief_builder"
  | "image_adapter"
  | "overlay"
  | "qa"
  | "regeneration"
  | "export"
  | "unknown";

export interface PipelineError {
  code: PipelineErrorCode;
  stage: PipelineStage;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

