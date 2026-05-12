import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  validateExportMetadata,
  type AuroraImagePipelineInput,
  type QAChecker,
} from "../src/contracts/index.js";
import { sampleBrandContext, sampleLogoAsset, sampleProductAsset } from "../src/fixtures/index.js";
import { buildGalleryPreview, createMockImage2Adapter, runSingleImagePipeline, writeExportPackage } from "../src/index.js";

const now = () => "2026-05-13T00:00:00.000Z";
const tmpRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tmpRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function makeInput(): AuroraImagePipelineInput {
  return {
    brandId: sampleBrandContext.brandId,
    campaignName: "M4 gallery export",
    contentIntent: "Create a premium product poster for Aurora.",
    generationCount: 1,
    channelFormat: "portrait",
    brandContext: sampleBrandContext,
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
  };
}

describe("M4 gallery and export", () => {
  it("builds a preview gallery model with QA and regeneration display state", async () => {
    let checks = 0;
    const qaChecker: QAChecker = {
      check: () => {
        checks += 1;
        return checks === 1
          ? {
              status: QA_STATUS.FAIL,
              checkedAt: now(),
              issues: [
                {
                  code: QA_ISSUE_CODE.LOGO_SAFE_MARGIN,
                  severity: QA_ISSUE_SEVERITY.HARD_FAIL,
                  message: "Logo safe margin failed.",
                  regenerationHint: "Re-apply deterministic overlay.",
                },
              ],
            }
          : {
              status: QA_STATUS.WARNING,
              checkedAt: now(),
              issues: [
                {
                  code: QA_ISSUE_CODE.BRAND_TONE_MISMATCH,
                  severity: QA_ISSUE_SEVERITY.WARNING,
                  message: "Tone could be closer to the brand.",
                },
              ],
            };
      },
    };

    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      qaChecker,
      now,
    });

    const preview = buildGalleryPreview(result);
    const item = preview.items[0];

    expect(preview.runId).toBe(result.run.runId);
    expect(preview.status).toBe("completed");
    expect(item?.qaStatus).toBe(QA_STATUS.WARNING);
    expect(item?.issues[0]?.code).toBe(QA_ISSUE_CODE.BRAND_TONE_MISMATCH);
    expect(item?.retryCount).toBe(1);
    expect(item?.autoRegenerated).toBe(true);
    expect(item?.canExport).toBe(true);
    expect(item?.thumbnailUri).toContain("thumbnail=true");
    expect(item?.generatedAt).toBe(now());
  });

  it("writes an export package with metadata, QA, brief, overlay, manifest, PNG, and JPG files", async () => {
    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      now,
    });
    const outputDir = await mkdtemp(join(tmpdir(), "aurora-export-"));
    tmpRoots.push(outputDir);

    const exported = await writeExportPackage({
      result,
      outputDir,
      formats: ["png", "jpg"],
    });

    expect(validateExportMetadata(exported.metadata)).toEqual([]);
    expect(exported.files).toEqual([
      "metadata.json",
      "qa-report.json",
      "briefs.json",
      "overlay-metadata.json",
      "images/item_brand_001_001.png",
      "images/item_brand_001_001.jpg",
      "manifest.json",
    ]);
    expect(exported.manifest.files).toEqual(exported.files);

    const metadataJson = JSON.parse(await readFile(join(outputDir, "metadata.json"), "utf8")) as unknown;
    expect(metadataJson).toEqual(exported.metadata);

    const png = await readFile(join(outputDir, "images", "item_brand_001_001.png"), "utf8");
    const jpg = await readFile(join(outputDir, "images", "item_brand_001_001.jpg"), "utf8");
    expect(png).toContain("Aurora OS mock PNG export");
    expect(jpg).toContain("Aurora OS mock JPG export");
  });
});
