import { describe, expect, it } from "vitest";
import {
  PIPELINE_ERROR_CODE,
  QA_ISSUE_CODE,
  type AuroraImagePipelineInput,
  type Image2AdapterV2,
  type Image2GenerationRequestV2,
} from "../src/contracts/index.js";
import { sampleBrandContext, sampleLogoAsset, sampleProductAsset } from "../src/fixtures/index.js";
import { buildImageBriefV2, runSingleImagePipelineV2 } from "../src/index.js";

const now = () => "2026-05-18T00:00:00.000Z";

function makeInput(overrides: Partial<AuroraImagePipelineInput> = {}): AuroraImagePipelineInput {
  return {
    brandId: sampleBrandContext.brandId,
    campaignName: "M6 native visual",
    contentIntent: "Underwater smartphone ecosystem for focused ocean creators",
    generationCount: 1,
    channelFormat: "portrait",
    brandContext: {
      ...sampleBrandContext,
      brandName: "DIVEVOLK",
      mustInclude: ["DIVEVOLK", "SeaTouch 4 Max Plus"],
      historicalPreferences: {
        approvedExamples: [],
        rejectedExamples: ["asset://rejected/divevolk-test-poster.png"],
        notes: ["Avoid product pasted on a flat black canvas."],
      },
    },
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
    ...overrides,
  };
}

describe("M6 native brand visuals", () => {
  it("builds ImageBriefV2 with locked product reference and native product render mode", () => {
    const brief = buildImageBriefV2({
      input: makeInput(),
      variantIndex: 0,
      variantCount: 1,
      briefId: "brief_m6_001",
    });

    expect(brief.schemaVersion).toBe("m6.0");
    expect(brief.renderMode).toBe("native_product_reference");
    expect(brief.visualType).toBe("use_case_proof");
    expect(brief.storyMode).toBe("proof_by_context");
    expect(brief.productSpec.asset.uri).toBe(sampleProductAsset.uri);
    expect(brief.productSpec.referenceMode).toBe("reference_locked");
    expect(brief.promptPayload.userPrompt).toContain("Use the product image as a locked visual reference");
    expect(brief.negativeConstraints).toContain("isolated product pasted on a flat canvas");
  });

  it("requires an injected Hermes Image2AdapterV2 and does not silently use the old overlay pipeline", async () => {
    const result = await runSingleImagePipelineV2(makeInput(), { now });
    const item = result.run.items[0];

    expect(result.run.status).toBe("failed");
    expect(item?.status).toBe("failed");
    expect(item?.error?.code).toBe(PIPELINE_ERROR_CODE.M6_IMAGE_ADAPTER_NOT_CONFIGURED);
    expect(item?.finalImage).toBeUndefined();
    expect(item?.m6.renderMode).toBe("native_product_reference");
  });

  it("passes the product asset to the injected adapter and records M6 metadata", async () => {
    let capturedRequest: Image2GenerationRequestV2 | undefined;
    const adapter: Image2AdapterV2 = {
      generate: async (request) => {
        capturedRequest = request;
        return {
          imageId: "m6_realistic_divevolk_scene",
          uri: "asset://hermes/m6/divevolk-scene.png",
          width: request.brief.size.width,
          height: request.brief.size.height,
          format: "png",
          adapterMode: "hermes_live",
          modelId: "gpt-image-2",
          attemptId: "attempt_001",
          usedProductReference: true,
          usedLogoReference: true,
          usedOverlayFallback: false,
          inputAssetIds: [request.productAsset.assetId, request.logoAsset.assetId],
        };
      },
    };

    const result = await runSingleImagePipelineV2(makeInput(), {
      imageAdapterV2: adapter,
      now,
    });
    const item = result.run.items[0];

    expect(capturedRequest?.productAsset.uri).toBe(sampleProductAsset.uri);
    expect(capturedRequest?.brief.renderMode).toBe("native_product_reference");
    expect(capturedRequest?.referenceAssets.map((asset) => asset.uri)).toContain("asset://rejected/divevolk-test-poster.png");
    expect(item?.image?.adapterMode).toBe("hermes_live");
    expect(item?.image?.usedProductReference).toBe(true);
    expect(item?.m6.nativeProductReferenceUsed).toBe(true);
    expect(item?.m6.overlayFallbackUsed).toBe(false);
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.PRODUCT_INTEGRATION_REVIEW_REQUIRED);
    expect(result.m6.stableApprovalReady).toBe(false);
  });

  it("fails when product reference is missing instead of generating a text-plus-overlay result", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async () => {
        throw new Error("adapter should not be called without product reference");
      },
    };

    const result = await runSingleImagePipelineV2(makeInput({ productAssets: [] }), {
      imageAdapterV2: adapter,
      now,
    });
    const item = result.run.items[0];

    expect(result.run.status).toBe("failed");
    expect(item?.status).toBe("failed");
    expect(item?.error?.code).toBe(PIPELINE_ERROR_CODE.MISSING_PRODUCT_REFERENCE);
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.PRODUCT_REFERENCE_ATTACHED);
  });
});
