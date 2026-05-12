import type {
  ExportManifest,
  ExportMetadata,
  GeneratedImage,
  GenerationItem,
  GenerationRun,
  ImageBrief,
  OverlayMetadata,
  QAResult,
} from "../contracts/index.js";
import { deriveRunStatus, deriveRunSummary } from "../contracts/index.js";

const createdAt = "2026-05-12T00:00:00.000Z";
const updatedAt = "2026-05-12T00:01:00.000Z";

export function makeBrief(index = 0, variantCount: 1 | 4 = 1): ImageBrief {
  return {
    briefId: `brief_${String(index + 1).padStart(3, "0")}`,
    channelFormat: "portrait",
    size: {
      width: 1242,
      height: 1660,
    },
    imageDirection: "minimal product poster",
    copyDirection: "highlight one product benefit",
    brandToneConstraints: ["professional but approachable", "premium, calm, not exaggerated"],
    styleConstraints: ["minimal composition", "clean product focus", "avoid cluttered promotional design"],
    preferenceMemory: {
      useApprovedExamplesAsReference: true,
      avoidRejectedExamplePatterns: true,
    },
    negativeConstraints: ["do not alter logo", "do not invent product packaging", "avoid cluttered background"],
    variantIndex: index,
    variantCount,
  };
}

function makeGeneratedImage(itemIndex: number, kind: "base" | "final" = "final"): GeneratedImage {
  return {
    imageId: `${kind}_image_${String(itemIndex + 1).padStart(3, "0")}`,
    uri: `asset://${kind}-image-${String(itemIndex + 1).padStart(3, "0")}.png`,
    width: 1242,
    height: 1660,
    format: "png",
  };
}

function makeOverlayMetadata(): OverlayMetadata {
  return {
    logoApplied: true,
    logoPosition: "bottom_right",
    logoSafeMarginPx: 48,
    productApplied: true,
    productPosition: "center",
    outputSize: {
      width: 1242,
      height: 1660,
    },
  };
}

function passQA(): QAResult {
  return {
    status: "pass",
    issues: [],
    checkedAt: "2026-05-12T00:00:30.000Z",
  };
}

function failedQA(): QAResult {
  return {
    status: "fail",
    checkedAt: "2026-05-12T00:00:30.000Z",
    issues: [
      {
        code: "LOGO_SAFE_MARGIN",
        severity: "hard_fail",
        message: "Logo violates the configured safe margin.",
        regenerationHint: "Re-apply deterministic overlay with the configured safe margin before QA.",
      },
    ],
  };
}

export function makePassedItem(index = 0, variantCount: 1 | 4 = 1): GenerationItem {
  const brief = makeBrief(index, variantCount);

  return {
    itemId: `item_${String(index + 1).padStart(3, "0")}`,
    index,
    status: "passed",
    briefId: brief.briefId,
    brief,
    image: makeGeneratedImage(index, "base"),
    finalImage: makeGeneratedImage(index, "final"),
    overlayMetadata: makeOverlayMetadata(),
    qa: passQA(),
    retryCount: 0,
    maxRetries: variantCount === 1 ? 3 : 2,
    issues: [],
  };
}

export function makeFailedItem(index = 0, retryCount = 1, variantCount: 1 | 4 = 1): GenerationItem {
  const brief = makeBrief(index, variantCount);
  const qa = failedQA();

  return {
    itemId: `item_${String(index + 1).padStart(3, "0")}`,
    index,
    status: "failed",
    briefId: brief.briefId,
    brief,
    image: makeGeneratedImage(index, "base"),
    qa,
    retryCount,
    maxRetries: variantCount === 1 ? 3 : 2,
    issues: qa.issues,
    error: {
      code: "QA_FAILED",
      stage: "qa",
      message: "QA returned hard_fail issues.",
      retryable: true,
    },
  };
}

export function makeNeedsHumanItem(index = 0, variantCount: 1 | 4 = 1): GenerationItem {
  const failed = makeFailedItem(index, variantCount === 1 ? 3 : 2, variantCount);

  return {
    ...failed,
    status: "needs_human",
    error: {
      code: "RETRY_LIMIT_REACHED",
      stage: "regeneration",
      message: "Automatic regeneration limit reached.",
      retryable: false,
    },
  };
}

function makeRun(runId: string, count: 1 | 4, items: GenerationItem[]): GenerationRun {
  const run = {
    runId,
    count,
    status: "queued",
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
    ...run,
    summary: deriveRunSummary(run),
    status: deriveRunStatus(run),
  };
}

export const singleImageSuccessRun = makeRun("run_single_success", 1, [makePassedItem()]);

export const singleImageQAFailedRun = makeRun("run_single_qa_failed", 1, [makeFailedItem()]);

export const singleImageRetryExhaustedRun = makeRun("run_single_retry_exhausted", 1, [makeNeedsHumanItem()]);

export const fourImageSuccessRun = makeRun("run_four_success", 4, [
  makePassedItem(0, 4),
  makePassedItem(1, 4),
  makePassedItem(2, 4),
  makePassedItem(3, 4),
]);

export const fourImagePartialFailedRun = makeRun("run_four_partial_failed", 4, [
  makePassedItem(0, 4),
  makeFailedItem(1, 2, 4),
  makePassedItem(2, 4),
  makePassedItem(3, 4),
]);

export const exportMetadataSuccess: ExportMetadata = {
  runId: fourImagePartialFailedRun.runId,
  project: "Aurora OS",
  engine: "image-2",
  mode: "mock",
  generationCount: fourImagePartialFailedRun.count,
  status: fourImagePartialFailedRun.status,
  createdAt,
  items: fourImagePartialFailedRun.items.map((item) => ({
    itemId: item.itemId,
    status: item.status,
    retryCount: item.retryCount,
    ...(item.status === "passed"
      ? {
          files: {
            image: `images/${item.itemId}.png`,
            thumbnail: `thumbnails/${item.itemId}-thumb.png`,
          },
        }
      : {}),
    ...(item.issues.length > 0 ? { issues: item.issues } : {}),
  })),
};

export const exportManifestSuccess: ExportManifest = {
  version: "1.0.0",
  runId: exportMetadataSuccess.runId,
  files: [
    "metadata.json",
    "brand-context.json",
    "qa-report.json",
    "images/item_001.png",
    "thumbnails/item_001-thumb.png",
    "images/item_003.png",
    "thumbnails/item_003-thumb.png",
    "images/item_004.png",
    "thumbnails/item_004-thumb.png",
  ],
};
