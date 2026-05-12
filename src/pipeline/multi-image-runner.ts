import {
  GENERATION_ITEM_STATUS,
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  type AuroraImagePipelineInput,
  type GenerationItem,
  type PipelineIdFactory,
  type PipelineResult,
  type SingleImagePipelineDependencies,
} from "../contracts/index.js";
import { defaultBriefBuilder } from "./brief-builder.js";
import { createPipelineError } from "./errors.js";
import {
  DEFAULT_MULTI_IMAGE_MAX_RETRIES,
  defaultPipelineIdFactory,
  makePipelineResult,
  runGenerationItem,
} from "./single-image-runner.js";

const MULTI_IMAGE_COUNT = 4;

export async function runMultiImagePipeline(
  input: AuroraImagePipelineInput,
  dependencies: SingleImagePipelineDependencies,
): Promise<PipelineResult> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const idFactory = dependencies.idFactory ?? defaultPipelineIdFactory;
  const maxRetries = dependencies.maxRetries ?? DEFAULT_MULTI_IMAGE_MAX_RETRIES;
  const createdAt = now();

  const inputError = validateMultiImageInput(input);
  if (inputError) {
    const items = makeFailedInputItems(input, idFactory, maxRetries, inputError);
    return makePipelineResult(input, idFactory, MULTI_IMAGE_COUNT, createdAt, now(), items);
  }

  const items = await Promise.all(
    [0, 1, 2, 3].map((variantIndex) =>
      runGenerationItem(input, dependencies, {
        variantIndex,
        variantCount: MULTI_IMAGE_COUNT,
        maxRetries,
      }),
    ),
  );

  return makePipelineResult(input, idFactory, MULTI_IMAGE_COUNT, createdAt, now(), items);
}

function validateMultiImageInput(input: AuroraImagePipelineInput): ReturnType<typeof createPipelineError> | undefined {
  if (input.generationCount !== MULTI_IMAGE_COUNT) {
    return createPipelineError(
      PIPELINE_ERROR_CODE.INVALID_BRAND_CONTEXT,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Multi-image runner only accepts generationCount: 4.",
      false,
    );
  }

  return undefined;
}

function makeFailedInputItems(
  input: AuroraImagePipelineInput,
  idFactory: PipelineIdFactory,
  maxRetries: number,
  error: ReturnType<typeof createPipelineError>,
): GenerationItem[] {
  const briefBuilder = defaultBriefBuilder;

  return [0, 1, 2, 3].map((index) => {
    const brief = briefBuilder.build({
      input,
      variantIndex: index,
      variantCount: MULTI_IMAGE_COUNT,
      briefId: idFactory.briefId(input, index),
    });

    return {
      itemId: idFactory.itemId(input, index),
      index,
      status: GENERATION_ITEM_STATUS.FAILED,
      briefId: brief.briefId,
      brief,
      retryCount: 0,
      maxRetries,
      issues: [],
      error,
    };
  });
}
