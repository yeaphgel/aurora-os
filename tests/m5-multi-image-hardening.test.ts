import { describe, expect, it } from "vitest";
import {
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  validateGenerationRun,
  type AuroraImagePipelineInput,
  type GeneratedImage,
  type Image2Adapter,
  type QAChecker,
  type QACheckerRequest,
} from "../src/contracts/index.js";
import { sampleBrandContext, sampleLogoAsset, sampleProductAsset } from "../src/fixtures/index.js";
import { checkDeterministicQA, createMockImage2Adapter, runMultiImagePipeline } from "../src/index.js";

const now = () => "2026-05-13T00:00:00.000Z";

function makeInput(): AuroraImagePipelineInput {
  return {
    brandId: sampleBrandContext.brandId,
    campaignName: "M5 multi image",
    contentIntent: "Create premium product posters for Aurora.",
    generationCount: 4,
    channelFormat: "portrait",
    brandContext: sampleBrandContext,
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
  };
}

describe("M5 multi-image pipeline and QA hardening", () => {
  it("runs four image items through the shared single-item runner", async () => {
    const result = await runMultiImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      now,
    });

    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.count).toBe(4);
    expect(result.run.status).toBe("completed");
    expect(result.run.summary).toEqual({ total: 4, passed: 4, failed: 0, retrying: 0, needsHuman: 0 });
    expect(result.run.items.map((item) => item.index)).toEqual([0, 1, 2, 3]);
    expect(result.run.items.map((item) => item.brief.variantCount)).toEqual([4, 4, 4, 4]);
    expect(result.run.items.every((item) => item.maxRetries === 2)).toBe(true);
  });

  it("keeps item regeneration independent and derives partial_failed at run level", async () => {
    const checksByVariant = new Map<number, number>();
    const qaChecker: QAChecker = {
      check: (request) => {
        const variantIndex = request.brief.variantIndex;
        const checks = (checksByVariant.get(variantIndex) ?? 0) + 1;
        checksByVariant.set(variantIndex, checks);

        if (variantIndex === 1) {
          return {
            status: QA_STATUS.FAIL,
            checkedAt: now(),
            issues: [
              {
                code: QA_ISSUE_CODE.STYLE_MISMATCH,
                severity: QA_ISSUE_SEVERITY.HARD_FAIL,
                message: "Variant conflicts with visual style.",
                regenerationHint: "Regenerate with the configured visual style.",
              },
            ],
          };
        }

        if (variantIndex === 2 && checks === 1) {
          return {
            status: QA_STATUS.FAIL,
            checkedAt: now(),
            issues: [
              {
                code: QA_ISSUE_CODE.LOGO_SAFE_MARGIN,
                severity: QA_ISSUE_SEVERITY.HARD_FAIL,
                message: "Variant needs logo safe margin adjustment.",
                regenerationHint: "Reserve safe-margin space.",
              },
            ],
          };
        }

        return {
          status: QA_STATUS.PASS,
          checkedAt: now(),
          issues: [],
        };
      },
    };

    const result = await runMultiImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      qaChecker,
      now,
    });

    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("partial_failed");
    expect(result.run.summary).toEqual({ total: 4, passed: 3, failed: 0, retrying: 0, needsHuman: 1 });
    expect(result.run.items[1]?.status).toBe("needs_human");
    expect(result.run.items[1]?.retryCount).toBe(2);
    expect(result.run.items[2]?.status).toBe("passed");
    expect(result.run.items[2]?.retryCount).toBe(1);
    expect(checksByVariant).toEqual(
      new Map([
        [0, 1],
        [1, 3],
        [2, 2],
        [3, 1],
      ]),
    );
  });

  it("does not let one rejected item block other items", async () => {
    const imageAdapter: Image2Adapter = {
      generate: async (request) => {
        if (request.brief.variantIndex === 3) {
          throw {
            code: "IMAGE_ADAPTER_REJECTED",
            stage: "image_adapter",
            message: "Variant rejected by mock adapter.",
            retryable: false,
          };
        }

        return createMockImage2Adapter().generate(request);
      },
    };

    const result = await runMultiImagePipeline(makeInput(), {
      imageAdapter,
      now,
    });

    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("partial_failed");
    expect(result.run.items.filter((item) => item.status === "passed")).toHaveLength(3);
    expect(result.run.items[3]?.status).toBe("failed");
    expect(result.run.items[3]?.retryCount).toBe(0);
  });

  it("keeps deterministic QA checks named and contract-shaped", () => {
    const request = makeQARequest({
      finalImage: { imageId: "missing", uri: "", width: 100, height: 100, format: "png" },
      overlayMetadata: {
        logoApplied: false,
        logoPosition: "top_left",
        logoSafeMarginPx: 0,
        productApplied: false,
        productPosition: "bottom_left",
        outputSize: { width: 100, height: 100 },
      },
      imageDirection: "cartoon forbidden visual with no required brand cue",
      copyDirection: "overclaim copy",
      brandToneConstraints: ["voice: flat"],
      styleConstraints: ["composition: centered product"],
    });

    const qa = checkDeterministicQA(request, now());
    const codes = qa.issues.map((issue) => issue.code);

    expect(qa.status).toBe(QA_STATUS.FAIL);
    expect(codes).toContain(QA_ISSUE_CODE.HAS_IMAGE_OUTPUT);
    expect(codes).toContain(QA_ISSUE_CODE.HAS_REQUIRED_BRAND_NAME);
    expect(codes).toContain(QA_ISSUE_CODE.HAS_LOGO_IF_REQUIRED);
    expect(codes).toContain(QA_ISSUE_CODE.LOGO_SAFE_MARGIN);
    expect(codes).toContain(QA_ISSUE_CODE.PRODUCT_VISIBLE_IF_REQUIRED);
    expect(codes).toContain(QA_ISSUE_CODE.SIZE_MISMATCH);
    expect(codes).toContain(QA_ISSUE_CODE.FORBIDDEN_WORD_DETECTED);
    expect(codes).toContain(QA_ISSUE_CODE.BRAND_TONE_MISMATCH);
    expect(codes).toContain(QA_ISSUE_CODE.STYLE_MISMATCH);
    expect(codes).toContain(QA_ISSUE_CODE.PREFERENCE_CONFLICT);
  });
});

function makeQARequest(overrides: {
  finalImage: GeneratedImage;
  overlayMetadata: QACheckerRequest["overlayMetadata"];
  imageDirection: string;
  copyDirection: string;
  brandToneConstraints: string[];
  styleConstraints: string[];
}): QACheckerRequest {
  return {
    brandContext: sampleBrandContext,
    brief: {
      briefId: "brief_qa_hardening",
      channelFormat: "portrait",
      size: { width: 1242, height: 1660 },
      imageDirection: overrides.imageDirection,
      copyDirection: overrides.copyDirection,
      brandToneConstraints: overrides.brandToneConstraints,
      styleConstraints: overrides.styleConstraints,
      preferenceMemory: {
        useApprovedExamplesAsReference: true,
        avoidRejectedExamplePatterns: true,
      },
      negativeConstraints: [],
      variantIndex: 0,
      variantCount: 1,
    },
    baseImage: {
      imageId: "base",
      uri: "asset://base.png",
      width: 1242,
      height: 1660,
      format: "png",
    },
    finalImage: overrides.finalImage,
    overlayMetadata: overrides.overlayMetadata,
  };
}
