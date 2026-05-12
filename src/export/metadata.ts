import {
  GENERATION_ITEM_STATUS,
  type ExportMetadata,
  type ExportMetadataItem,
  type GenerationItem,
  type PipelineResult,
} from "../contracts/index.js";

export function buildExportMetadata(result: PipelineResult, mode: ExportMetadata["mode"] = "mock"): ExportMetadata {
  return {
    runId: result.run.runId,
    project: "Aurora OS",
    engine: "image-2",
    mode,
    generationCount: result.run.count,
    status: result.run.status,
    createdAt: result.run.createdAt,
    items: result.run.items.map(buildExportMetadataItem),
  };
}

function buildExportMetadataItem(item: GenerationItem): ExportMetadataItem {
  return {
    itemId: item.itemId,
    status: item.status,
    retryCount: item.retryCount,
    ...(item.status === GENERATION_ITEM_STATUS.PASSED && item.finalImage
      ? {
          files: {
            image: `images/${item.itemId}.${item.finalImage.format}`,
            thumbnail: `thumbnails/${item.itemId}-thumb.${item.finalImage.format}`,
          },
        }
      : {}),
    ...(item.issues.length > 0 ? { issues: item.issues } : {}),
  };
}
