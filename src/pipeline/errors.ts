import {
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  type PipelineError,
  type PipelineErrorCode,
  type PipelineStage,
} from "../contracts/index.js";

export function createPipelineError(
  code: PipelineErrorCode,
  stage: PipelineStage,
  message: string,
  retryable: boolean,
  cause?: unknown,
): PipelineError {
  return {
    code,
    stage,
    message,
    retryable,
    ...(cause === undefined ? {} : { cause }),
  };
}

export function normalizePipelineError(error: unknown, fallbackStage: PipelineStage): PipelineError {
  if (isPipelineError(error)) return error;

  return createPipelineError(
    PIPELINE_ERROR_CODE.UNKNOWN_PIPELINE_ERROR,
    fallbackStage,
    "An unknown pipeline error occurred.",
    false,
    error,
  );
}

function isPipelineError(error: unknown): error is PipelineError {
  if (!error || typeof error !== "object") return false;

  const candidate = error as Partial<PipelineError>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.stage === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.retryable === "boolean"
  );
}

export const nonRetryableUnknownError = (cause: unknown): PipelineError =>
  createPipelineError(
    PIPELINE_ERROR_CODE.UNKNOWN_PIPELINE_ERROR,
    PIPELINE_STAGE.UNKNOWN,
    "An unknown pipeline error occurred.",
    false,
    cause,
  );
