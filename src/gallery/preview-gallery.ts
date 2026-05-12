import {
  GENERATION_ITEM_STATUS,
  type GalleryPreview,
  type GalleryPreviewItem,
  type GenerationItem,
  type PipelineResult,
} from "../contracts/index.js";

export function buildGalleryPreview(result: PipelineResult): GalleryPreview {
  return {
    runId: result.run.runId,
    status: result.run.status,
    summary: result.run.summary,
    items: result.run.items.map((item) => buildGalleryPreviewItem(item, result.run.updatedAt)),
    createdAt: result.run.createdAt,
    updatedAt: result.run.updatedAt,
  };
}

function buildGalleryPreviewItem(item: GenerationItem, fallbackGeneratedAt: string): GalleryPreviewItem {
  return {
    itemId: item.itemId,
    index: item.index,
    status: item.status,
    ...(item.finalImage?.uri === undefined ? {} : { finalImageUri: item.finalImage.uri }),
    ...(item.finalImage?.uri === undefined ? {} : { thumbnailUri: makeThumbnailUri(item) }),
    ...(item.qa?.status === undefined ? {} : { qaStatus: item.qa.status }),
    issues: item.issues,
    retryCount: item.retryCount,
    maxRetries: item.maxRetries,
    autoRegenerated: item.retryCount > 0,
    generatedAt: item.qa?.checkedAt ?? fallbackGeneratedAt,
    canExport: item.status === GENERATION_ITEM_STATUS.PASSED && item.finalImage !== undefined,
  };
}

function makeThumbnailUri(item: GenerationItem): string {
  const finalImageUri = item.finalImage?.uri;
  if (!finalImageUri) return "";

  return `${finalImageUri}${finalImageUri.includes("?") ? "&" : "?"}thumbnail=true`;
}
