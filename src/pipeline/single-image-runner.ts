import {
  GENERATION_ITEM_STATUS,
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  RUN_STATUS,
  deriveRunStatus,
  deriveRunSummary,
  type AuroraImagePipelineInput,
  type GeneratedImage,
  type GenerationItem,
  type GenerationRun,
  type ImageBrief,
  type OverlayMetadata,
  type PipelineError,
  type PipelineIdFactory,
  type PipelineResult,
  type QAResult,
  type SingleImagePipelineDependencies,
} from "../contracts/index.js";
import { defaultBriefBuilder } from "./brief-builder.js";
import { createPipelineError, normalizePipelineError } from "./errors.js";
import { deterministicOverlayEngine, makeOverlaySpec } from "./overlay-engine.js";
import { createDeterministicQAChecker } from "./qa-checker.js";
import { defaultRegenerationAdjuster } from "./regeneration-adjuster.js";

export const DEFAULT_SINGLE_IMAGE_MAX_RETRIES = 3;
export const DEFAULT_MULTI_IMAGE_MAX_RETRIES = 2;

export async function runSingleImagePipeline(
  input: AuroraImagePipelineInput,
  dependencies: SingleImagePipelineDependencies,
): Promise<PipelineResult> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const idFactory = dependencies.idFactory ?? defaultPipelineIdFactory;
  const maxRetries = dependencies.maxRetries ?? DEFAULT_SINGLE_IMAGE_MAX_RETRIES;
  const createdAt = now();

  const inputError = validateSingleImageInput(input);
  if (inputError) {
    const brief = (dependencies.briefBuilder ?? defaultBriefBuilder).build({
      input,
      variantIndex: 0,
      variantCount: 1,
      briefId: idFactory.briefId(input, 0),
    });

    return makePipelineResult(input, idFactory, 1, createdAt, now(), [
      makeItem({
        input,
        idFactory,
        index: 0,
        brief,
        status: GENERATION_ITEM_STATUS.FAILED,
        retryCount: 0,
        maxRetries,
        error: inputError,
      }),
    ]);
  }

  const item = await runGenerationItem(input, dependencies, {
    variantIndex: 0,
    variantCount: 1,
    maxRetries,
  });

  return makePipelineResult(input, idFactory, 1, createdAt, now(), [item]);
}

export async function runGenerationItem(
  input: AuroraImagePipelineInput,
  dependencies: SingleImagePipelineDependencies,
  options: {
    variantIndex: number;
    variantCount: 1 | 4;
    maxRetries: number;
  },
): Promise<GenerationItem> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const idFactory = dependencies.idFactory ?? defaultPipelineIdFactory;
  const briefBuilder = dependencies.briefBuilder ?? defaultBriefBuilder;
  const regenerationAdjuster = dependencies.regenerationAdjuster ?? defaultRegenerationAdjuster;
  const overlayEngine = dependencies.overlayEngine ?? deterministicOverlayEngine;
  const qaChecker = dependencies.qaChecker ?? createDeterministicQAChecker(now);
  let currentBrief = briefBuilder.build({
    input,
    variantIndex: options.variantIndex,
    variantCount: options.variantCount,
    briefId: idFactory.briefId(input, options.variantIndex),
  });

  const inputError = validateGenerationItemInput(input);
  if (inputError) {
    return makeItem({
      input,
      idFactory,
      index: options.variantIndex,
      brief: currentBrief,
      status: GENERATION_ITEM_STATUS.FAILED,
      retryCount: 0,
      maxRetries: options.maxRetries,
      error: inputError,
    });
  }

  const productAsset = input.productAssets[0];
  if (!productAsset) {
    throw createPipelineError(
      PIPELINE_ERROR_CODE.MISSING_ASSET,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Product asset is required for image generation.",
      false,
    );
  }

  let retryCount = 0;
  let lastImage: GeneratedImage | undefined;
  let lastFinalImage: GeneratedImage | undefined;
  let lastOverlayMetadata: OverlayMetadata | undefined;
  let lastQA: QAResult | undefined;

  for (;;) {
    const attempt = retryCount;

    try {
      const image = await dependencies.imageAdapter.generate({
        brandContext: input.brandContext,
        brief: currentBrief,
        logoAsset: input.logoAsset,
        productAsset,
        attempt,
      });
      lastImage = image;

      const overlayResult = await overlayEngine.apply({
        baseImage: image,
        spec: makeOverlaySpec({
          outputSize: currentBrief.size,
          logoAsset: input.logoAsset,
          productAsset,
          brandContext: input.brandContext,
        }),
        attempt,
        finalImageId: idFactory.finalImageId(image),
      });
      lastFinalImage = overlayResult.finalImage;
      lastOverlayMetadata = overlayResult.metadata;

      const qa = qaChecker.check({
        brandContext: input.brandContext,
        brief: currentBrief,
        baseImage: image,
        finalImage: overlayResult.finalImage,
        overlayMetadata: overlayResult.metadata,
      });
      lastQA = qa;

      if (qa.status !== QA_STATUS.FAIL) {
        return makeItem({
          input,
          idFactory,
          index: options.variantIndex,
          brief: currentBrief,
          status: GENERATION_ITEM_STATUS.PASSED,
          retryCount,
          maxRetries: options.maxRetries,
          image,
          finalImage: overlayResult.finalImage,
          overlayMetadata: overlayResult.metadata,
          qa,
        });
      }

      if (
        retryCount < options.maxRetries &&
        qa.issues.some((issue) => issue.severity === QA_ISSUE_SEVERITY.HARD_FAIL)
      ) {
        currentBrief = regenerationAdjuster.adjust({
          input,
          failedBrief: currentBrief,
          qa,
          retryCount,
          nextAttempt: retryCount + 1,
        });
        retryCount += 1;
        continue;
      }

      return makeItem({
        input,
        idFactory,
        index: options.variantIndex,
        brief: currentBrief,
        status: GENERATION_ITEM_STATUS.NEEDS_HUMAN,
        retryCount,
        maxRetries: options.maxRetries,
        image,
        finalImage: overlayResult.finalImage,
        overlayMetadata: overlayResult.metadata,
        qa,
        error: createPipelineError(
          PIPELINE_ERROR_CODE.RETRY_LIMIT_REACHED,
          PIPELINE_STAGE.REGENERATION,
          "Automatic regeneration limit reached.",
          false,
        ),
      });
    } catch (error) {
      const pipelineError = normalizePipelineError(error, PIPELINE_STAGE.UNKNOWN);
      if (pipelineError.retryable && retryCount < options.maxRetries) {
        retryCount += 1;
        continue;
      }

      return makeItem({
        input,
        idFactory,
        index: options.variantIndex,
        brief: currentBrief,
        status:
          pipelineError.code === PIPELINE_ERROR_CODE.RETRY_LIMIT_REACHED
            ? GENERATION_ITEM_STATUS.NEEDS_HUMAN
            : GENERATION_ITEM_STATUS.FAILED,
        retryCount,
        maxRetries: options.maxRetries,
        image: lastImage,
        finalImage: lastFinalImage,
        overlayMetadata: lastOverlayMetadata,
        qa: lastQA,
        error: pipelineError,
      });
    }
  }
}

function validateSingleImageInput(input: AuroraImagePipelineInput): PipelineError | undefined {
  if (input.generationCount !== 1) {
    return createPipelineError(
      PIPELINE_ERROR_CODE.INVALID_BRAND_CONTEXT,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Single-image runner only accepts generationCount: 1.",
      false,
    );
  }

  return validateGenerationItemInput(input);
}

function validateGenerationItemInput(input: AuroraImagePipelineInput): PipelineError | undefined {
  if (!input.brandContext.brandId || !input.brandContext.brandName || input.brandContext.brandId !== input.brandId) {
    return createPipelineError(
      PIPELINE_ERROR_CODE.INVALID_BRAND_CONTEXT,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Brand context must include a matching brandId and brandName.",
      false,
    );
  }

  if (!input.logoAsset.uri || input.logoAsset.role !== "logo") {
    return createPipelineError(
      PIPELINE_ERROR_CODE.MISSING_ASSET,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Logo asset is required for image generation.",
      false,
    );
  }

  const productAsset = input.productAssets[0];
  if (!productAsset?.uri || productAsset.role !== "product") {
    return createPipelineError(
      PIPELINE_ERROR_CODE.MISSING_ASSET,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Product asset is required for image generation.",
      false,
    );
  }

  return undefined;
}

function makeItem(request: {
  input: AuroraImagePipelineInput;
  idFactory: PipelineIdFactory;
  index: number;
  brief: ImageBrief;
  status: GenerationItem["status"];
  retryCount: number;
  maxRetries: number;
  image?: GeneratedImage | undefined;
  finalImage?: GeneratedImage | undefined;
  overlayMetadata?: OverlayMetadata | undefined;
  qa?: QAResult | undefined;
  error?: PipelineError | undefined;
}): GenerationItem {
  return {
    itemId: request.idFactory.itemId(request.input, request.index),
    index: request.index,
    status: request.status,
    briefId: request.brief.briefId,
    brief: request.brief,
    ...(request.image === undefined ? {} : { image: request.image }),
    ...(request.finalImage === undefined ? {} : { finalImage: request.finalImage }),
    ...(request.overlayMetadata === undefined ? {} : { overlayMetadata: request.overlayMetadata }),
    ...(request.qa === undefined ? {} : { qa: request.qa }),
    retryCount: request.retryCount,
    maxRetries: request.maxRetries,
    issues: request.qa?.issues ?? [],
    ...(request.error === undefined ? {} : { error: request.error }),
  };
}

export function makePipelineResult(
  input: AuroraImagePipelineInput,
  idFactory: PipelineIdFactory,
  count: 1 | 4,
  createdAt: string,
  updatedAt: string,
  items: GenerationItem[],
): PipelineResult {
  const runSeed = {
    runId: idFactory.runId(input),
    count,
    status: RUN_STATUS.QUEUED,
    items,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      retrying: 0,
      needsHuman: 0,
    },
    createdAt,
    updatedAt,
  } satisfies GenerationRun;

  return {
    jobId: idFactory.jobId(input),
    run: {
      ...runSeed,
      summary: deriveRunSummary(runSeed),
      status: deriveRunStatus(runSeed),
    },
  };
}

export const defaultPipelineIdFactory: PipelineIdFactory = {
  jobId: (input) => `job_${safeId(input.brandId)}`,
  runId: (input) => `run_${safeId(input.brandId)}_${input.generationCount === 4 ? "multi" : "single"}`,
  itemId: (input, index) => `item_${safeId(input.brandId)}_${String(index + 1).padStart(3, "0")}`,
  briefId: (input, index) => `brief_${safeId(input.brandId)}_${String(index + 1).padStart(3, "0")}`,
  finalImageId: (baseImage) => `final_${baseImage.imageId}`,
};

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown";
}
