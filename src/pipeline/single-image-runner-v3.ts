import {
  GENERATION_ITEM_STATUS,
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  QA_STATUS,
  RUN_STATUS,
  type AssetRef,
  type AuroraImagePipelineInput,
  type GeneratedImageV3,
  type ImageBriefV3,
  type M7GenerationItem,
  type M7GenerationRun,
  type M7PipelineResult,
  type PipelineError,
  type PipelineIdFactory,
  type QAResult,
  type SingleImagePipelineV3Dependencies,
} from "../contracts/index.js";
import { defaultBriefBuilderV3 } from "./brief-builder-v3.js";
import { createPipelineError, normalizePipelineError } from "./errors.js";
import { checkM7CreativeQA } from "./m7-qa-checker.js";
import { defaultPipelineIdFactory } from "./single-image-runner.js";

const M7_MAX_RETRIES = 0;

export async function runSingleImagePipelineV3(
  input: AuroraImagePipelineInput,
  dependencies: SingleImagePipelineV3Dependencies,
): Promise<M7PipelineResult> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const idFactory = dependencies.idFactory ?? defaultPipelineIdFactory;
  const briefBuilder = dependencies.briefBuilderV3 ?? defaultBriefBuilderV3;
  const createdAt = now();
  const productAsset = input.productAssets[0];

  const inputError = validateV3Input(input, productAsset, Boolean(dependencies.imageAdapterV3));
  const brief = briefBuilder.build({
    input: productAsset ? input : { ...input, productAssets: [placeholderProductAsset()] },
    variantIndex: 0,
    variantCount: 1,
    briefId: idFactory.briefId(input, 0),
  });

  if (inputError || !dependencies.imageAdapterV3 || !productAsset) {
    const qa = checkM7CreativeQA({
      brief,
      productAsset,
      checkedAt: now(),
    });

    return makeM7PipelineResult(input, idFactory, createdAt, now(), [
      makeM7Item({
        input,
        idFactory,
        brief,
        status: GENERATION_ITEM_STATUS.FAILED,
        retryCount: 0,
        qa,
        error: inputError,
      }),
    ]);
  }

  try {
    const image = await dependencies.imageAdapterV3.generate({
      brandContext: input.brandContext,
      brief,
      logoAsset: input.logoAsset,
      productAsset,
      referenceAssets: collectReferenceAssets(input),
      attempt: 0,
    });

    const qa = checkM7CreativeQA({
      brief,
      image,
      productAsset,
      checkedAt: now(),
    });

    return makeM7PipelineResult(input, idFactory, createdAt, now(), [
      makeM7Item({
        input,
        idFactory,
        brief,
        status: qa.status === QA_STATUS.PASS ? GENERATION_ITEM_STATUS.PASSED : GENERATION_ITEM_STATUS.NEEDS_HUMAN,
        retryCount: 0,
        image,
        finalImage: image,
        qa,
      }),
    ]);
  } catch (error) {
    const pipelineError = normalizePipelineError(error, PIPELINE_STAGE.IMAGE_ADAPTER);
    const qa = checkM7CreativeQA({
      brief,
      productAsset,
      checkedAt: now(),
    });

    return makeM7PipelineResult(input, idFactory, createdAt, now(), [
      makeM7Item({
        input,
        idFactory,
        brief,
        status: GENERATION_ITEM_STATUS.FAILED,
        retryCount: 0,
        qa,
        error: pipelineError,
      }),
    ]);
  }
}

function validateV3Input(
  input: AuroraImagePipelineInput,
  productAsset: AssetRef | undefined,
  hasAdapter: boolean,
): PipelineError | undefined {
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
      "Logo asset is required for M7 image generation.",
      false,
    );
  }

  if (!productAsset?.uri || productAsset.role !== "product") {
    return createPipelineError(
      PIPELINE_ERROR_CODE.MISSING_PRODUCT_REFERENCE,
      PIPELINE_STAGE.INPUT_VALIDATION,
      "Product reference asset is required for M7 native product fusion.",
      false,
    );
  }

  if (!hasAdapter) {
    return createPipelineError(
      PIPELINE_ERROR_CODE.M6_IMAGE_ADAPTER_NOT_CONFIGURED,
      PIPELINE_STAGE.IMAGE_ADAPTER,
      "M7 requires an injected Image2AdapterV3 from Hermes.",
      false,
    );
  }

  return undefined;
}

function makeM7Item(request: {
  input: AuroraImagePipelineInput;
  idFactory: PipelineIdFactory;
  brief: ImageBriefV3;
  status: M7GenerationItem["status"];
  retryCount: number;
  image?: GeneratedImageV3 | undefined;
  finalImage?: GeneratedImageV3 | undefined;
  qa?: QAResult | undefined;
  error?: PipelineError | undefined;
}): M7GenerationItem {
  const image = request.image;

  return {
    itemId: request.idFactory.itemId(request.input, 0),
    index: 0,
    status: request.status,
    briefId: request.brief.briefId,
    brief: request.brief,
    ...(image === undefined ? {} : { image }),
    ...(request.finalImage === undefined ? {} : { finalImage: request.finalImage }),
    ...(request.qa === undefined ? {} : { qa: request.qa }),
    retryCount: request.retryCount,
    maxRetries: M7_MAX_RETRIES,
    issues: request.qa?.issues ?? [],
    ...(request.error === undefined ? {} : { error: request.error }),
    m7: {
      schemaVersion: "m7.0",
      posterArchetype: request.brief.posterArchetype,
      productReferenceAttached: Boolean(request.brief.productSpec.asset.uri),
      nativeProductReferenceUsed: request.brief.renderMode === "native_product_reference" && Boolean(image?.usedProductReference),
      overlayFallbackUsed: Boolean(image?.usedOverlayFallback),
      textStrategy: request.brief.textStrategy,
      logoStrategy: request.brief.logoStrategy,
    },
  };
}

function makeM7PipelineResult(
  input: AuroraImagePipelineInput,
  idFactory: PipelineIdFactory,
  createdAt: string,
  updatedAt: string,
  items: M7GenerationItem[],
): M7PipelineResult {
  const run: M7GenerationRun = {
    runId: `${idFactory.runId(input)}_m7`,
    count: 1,
    status: deriveM7RunStatus(items),
    items,
    summary: deriveM7RunSummary(items),
    createdAt,
    updatedAt,
  };

  return {
    jobId: `${idFactory.jobId(input)}_m7`,
    run,
    m7: {
      schemaVersion: "m7.0",
      adapterBoundary: "injected",
      stableApprovalReady: items.every((item) => item.status === GENERATION_ITEM_STATUS.PASSED),
    },
  };
}

function deriveM7RunSummary(items: M7GenerationItem[]): M7GenerationRun["summary"] {
  return items.reduce<M7GenerationRun["summary"]>(
    (summary, item) => {
      summary.total += 1;
      if (item.status === "passed") summary.passed += 1;
      if (item.status === "failed") summary.failed += 1;
      if (item.status === "retrying") summary.retrying += 1;
      if (item.status === "needs_human") summary.needsHuman += 1;
      return summary;
    },
    { total: 0, passed: 0, failed: 0, retrying: 0, needsHuman: 0 },
  );
}

function deriveM7RunStatus(items: M7GenerationItem[]): M7GenerationRun["status"] {
  if (items.every((item) => item.status === "passed")) return RUN_STATUS.COMPLETED;
  if (items.some((item) => item.status === "passed")) return RUN_STATUS.PARTIAL_FAILED;
  return RUN_STATUS.FAILED;
}

function collectReferenceAssets(input: AuroraImagePipelineInput): AssetRef[] {
  return [
    ...input.brandContext.historicalPreferences.approvedExamples.map((uri, index) => ({
      assetId: `approved_reference_${index + 1}`,
      uri,
      format: inferAssetFormat(uri),
      role: "reference" as const,
    })),
    ...input.brandContext.historicalPreferences.rejectedExamples.map((uri, index) => ({
      assetId: `rejected_reference_${index + 1}`,
      uri,
      format: inferAssetFormat(uri),
      role: "reference" as const,
    })),
  ];
}

function inferAssetFormat(uri: string): AssetRef["format"] {
  const cleanUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();
  if (cleanUri.endsWith(".jpg")) return "jpg";
  if (cleanUri.endsWith(".jpeg")) return "jpeg";
  if (cleanUri.endsWith(".webp")) return "webp";
  return "png";
}

function placeholderProductAsset(): AssetRef {
  return {
    assetId: "missing_product_reference",
    uri: "",
    format: "png",
    role: "product",
  };
}
