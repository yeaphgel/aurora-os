import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import {
  GENERATION_ITEM_STATUS,
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  type ExportAssetWriter,
  type ExportImageFormat,
  type ExportImageWriteRequest,
  type ExportManifest,
  type ExportPackageRequest,
  type ExportPackageResult,
  type GenerationItem,
} from "../contracts/index.js";
import { createPipelineError } from "../pipeline/errors.js";
import { buildExportMetadata } from "./metadata.js";

const DEFAULT_EXPORT_FORMATS: ExportImageFormat[] = ["png", "jpg"];

export async function writeExportPackage(request: ExportPackageRequest): Promise<ExportPackageResult> {
  const formats = request.formats ?? DEFAULT_EXPORT_FORMATS;
  const assetWriter = request.assetWriter ?? defaultExportAssetWriter;
  const files: string[] = [];

  await mkdir(request.outputDir, { recursive: true });

  const metadata = buildExportMetadata(request.result, request.mode ?? "mock");
  await writeJson(join(request.outputDir, "metadata.json"), metadata, files, request.outputDir);

  const qaReport = request.result.run.items.map((item) => ({
    itemId: item.itemId,
    status: item.status,
    qa: item.qa,
    issues: item.issues,
    retryCount: item.retryCount,
    maxRetries: item.maxRetries,
  }));
  await writeJson(join(request.outputDir, "qa-report.json"), qaReport, files, request.outputDir);

  const briefs = request.result.run.items.map((item) => ({
    itemId: item.itemId,
    brief: item.brief,
  }));
  await writeJson(join(request.outputDir, "briefs.json"), briefs, files, request.outputDir);

  const overlays = request.result.run.items.map((item) => ({
    itemId: item.itemId,
    overlayMetadata: item.overlayMetadata,
  }));
  await writeJson(join(request.outputDir, "overlay-metadata.json"), overlays, files, request.outputDir);

  for (const item of request.result.run.items) {
    if (!isExportable(item)) continue;

    for (const format of formats) {
      const imagePath = join(request.outputDir, "images", `${item.itemId}.${format}`);
      await mkdir(dirname(imagePath), { recursive: true });
      const writtenPath = await assetWriter.writeImage({ item, format, targetPath: imagePath });
      files.push(toPackagePath(request.outputDir, writtenPath));
    }
  }

  const manifest: ExportManifest = {
    version: "1.0.0",
    runId: request.result.run.runId,
    files: [...files, "manifest.json"],
  };
  await writeJson(join(request.outputDir, "manifest.json"), manifest, files, request.outputDir, false);

  return {
    metadata,
    manifest,
    files: manifest.files,
  };
}

export const defaultExportAssetWriter: ExportAssetWriter = {
  async writeImage(request: ExportImageWriteRequest): Promise<string> {
    const finalImage = request.item.finalImage;
    if (!finalImage) {
      throw createPipelineError(
        PIPELINE_ERROR_CODE.EXPORT_FAILED,
        PIPELINE_STAGE.EXPORT,
        "Cannot export an item without a final image.",
        false,
      );
    }

    const payload = [
      `Aurora OS mock ${request.format.toUpperCase()} export`,
      `itemId=${request.item.itemId}`,
      `source=${finalImage.uri}`,
      `width=${finalImage.width}`,
      `height=${finalImage.height}`,
    ].join("\n");

    await writeFile(request.targetPath, payload, "utf8");
    return request.targetPath;
  },
};

function isExportable(item: GenerationItem): boolean {
  return item.status === GENERATION_ITEM_STATUS.PASSED && item.finalImage !== undefined;
}

async function writeJson(
  path: string,
  value: unknown,
  files: string[],
  outputDir: string,
  track = true,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  if (track) files.push(toPackagePath(outputDir, path));
}

function toPackagePath(outputDir: string, path: string): string {
  return relative(outputDir, path).replace(/\\/g, "/");
}
