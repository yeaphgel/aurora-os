import { describe, expect, it } from "vitest";
import {
  PIPELINE_ERROR_CODE,
  QA_ISSUE_CODE,
  type AuroraImagePipelineInput,
  type Image2AdapterV3,
  type Image2GenerationRequestV3,
} from "../src/contracts/index.js";
import { sampleBrandContext, sampleLogoAsset, sampleProductAsset } from "../src/fixtures/index.js";
import { buildImageBriefV3, runSingleImagePipelineV3 } from "../src/index.js";

const now = () => "2026-05-20T00:00:00.000Z";

function makeInput(overrides: Partial<AuroraImagePipelineInput> = {}): AuroraImagePipelineInput {
  return {
    brandId: sampleBrandContext.brandId,
    campaignName: "M7 creative fusion",
    contentIntent: "Underwater smartphone ecosystem for focused ocean creators",
    generationCount: 1,
    channelFormat: "portrait",
    brandContext: {
      ...sampleBrandContext,
      brandName: "DIVEVOLK",
      mustInclude: ["DIVEVOLK", "SeaTouch 4 Max Plus"],
      historicalPreferences: {
        approvedExamples: [],
        rejectedExamples: ["asset://rejected/divevolk-clean-but-flat.png"],
        notes: ["Avoid empty blue water, tiny typography, and product pasted over the background."],
      },
    },
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
    ...overrides,
  };
}

describe("M7 creative product fusion", () => {
  it("builds ImageBriefV3 with cinematic product ad controls", () => {
    const brief = buildImageBriefV3({
      input: makeInput(),
      variantIndex: 0,
      variantCount: 1,
      briefId: "brief_m7_001",
    });

    expect(brief.schemaVersion).toBe("m7.0");
    expect(brief.posterArchetype).toBe("cinematic_product_ad");
    expect(brief.compositionPlan.productWidthRatioRange).toEqual({ min: 0.55, max: 0.75 });
    expect(brief.compositionPlan.maxTopEmptySpaceRatio).toBe(0.22);
    expect(brief.compositionPlan.forbidHorizonBandThroughProduct).toBe(true);
    expect(brief.typographyPlan.headline.text).toBe("Touch the future");
    expect(brief.typographyPlan.headline.minHeightRatio).toBe(0.07);
    expect(brief.typographyPlan.productName.text).toBe("SeaTouch 4 Max+");
    expect(brief.productFusionPlan.requireSceneContact).toBe(true);
    expect(brief.productFusionPlan.allowProductOverlayFallback).toBe(false);
    expect(brief.assetPriorityPlan.secondaryAssets).toBe("suppress");
    expect(brief.logoOverlayPlan.logo.asset.assetId).toBe(sampleLogoAsset.assetId);
    expect(brief.promptPayload.image2Prompt).toContain("55% to 75% of canvas width");
    expect(brief.promptPayload.image2Prompt).toContain("water caustics");
    expect(brief.promptPayload.image2Prompt).toContain("Touch the future");
    expect(brief.promptPayload.image2Prompt).toContain("Suppress secondary accessories");
    expect(brief.promptPayload.image2Prompt).not.toContain(sampleLogoAsset.assetId);
  });

  it("passes M7 brief to injected Hermes adapter and records M7 metadata", async () => {
    let capturedRequest: Image2GenerationRequestV3 | undefined;
    const adapter: Image2AdapterV3 = {
      generate: async (request) => {
        capturedRequest = request;
        return {
          imageId: "m7_divevolk_cinematic_ad",
          uri: "asset://hermes/m7/divevolk-cinematic-ad.png",
          width: request.brief.size.width,
          height: request.brief.size.height,
          format: "png",
          adapterMode: "hermes_live",
          usedProductReference: true,
          usedLogoReference: false,
          usedOverlayFallback: false,
          inputAssetIds: [request.productAsset.assetId],
          modelInvocation: {
            provider: "hermes",
            modelId: "gpt-image-2",
            requestId: "req_m7_001",
            usedImageInputs: [request.productAsset.assetId],
            usedProductAssetId: request.productAsset.assetId,
            generatedAt: now(),
          },
          productLayout: {
            canvas: request.brief.size,
            productBounds: { x: 180, y: 560, width: 820, height: 620 },
            productCoverage: 0.38,
            pasteArtifactDetected: false,
            lightingMismatchDetected: false,
            textPanelCoverage: 0.14,
            textOccludesProduct: false,
            unauthorizedBrandMarksDetected: false,
          },
          logoOverlay: {
            applied: true,
            assetId: request.logoAsset.assetId,
            strategy: "deterministic_overlay",
            reservedZoneClean: true,
            contrastOk: true,
          },
          textValidation: {
            ocrChecked: true,
            mismatches: [],
          },
          m7Quality: {
            headlineHeightRatio: 0.08,
            productNameHeightRatio: 0.04,
            topEmptySpaceRatio: 0.15,
            productSceneContactDetected: true,
            horizonBandCutsProduct: false,
            secondaryAssetDistracts: false,
            logoDominatesLayout: false,
          },
        };
      },
    };

    const result = await runSingleImagePipelineV3(makeInput(), { imageAdapterV3: adapter, now });
    const item = result.run.items[0];

    expect(capturedRequest?.brief.schemaVersion).toBe("m7.0");
    expect(capturedRequest?.brief.promptPayload.image2Prompt).toContain("high-end cinematic underwater product advertisement");
    expect(capturedRequest?.productAsset.uri).toBe(sampleProductAsset.uri);
    expect(item?.m7.schemaVersion).toBe("m7.0");
    expect(item?.m7.posterArchetype).toBe("cinematic_product_ad");
    expect(item?.m7.overlayFallbackUsed).toBe(false);
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.PRODUCT_INTEGRATION_REVIEW_REQUIRED);
    expect(item?.issues.map((issue) => issue.code)).not.toContain(QA_ISSUE_CODE.TEXT_TOO_SMALL);
    expect(item?.issues.map((issue) => issue.code)).not.toContain(QA_ISSUE_CODE.PRODUCT_SCENE_CONTACT_MISSING);
    expect(result.m7.stableApprovalReady).toBe(false);
  });

  it("hard-fails when M7 typography is too small and product lacks scene contact", async () => {
    const adapter: Image2AdapterV3 = {
      generate: async (request) => ({
        imageId: "m7_bad_creative",
        uri: "asset://hermes/m7/bad-creative.png",
        width: request.brief.size.width,
        height: request.brief.size.height,
        format: "png",
        adapterMode: "hermes_live",
        usedProductReference: true,
        usedLogoReference: false,
        usedOverlayFallback: false,
        inputAssetIds: [request.productAsset.assetId],
        modelInvocation: {
          provider: "hermes",
          modelId: "gpt-image-2",
          requestId: "req_m7_002",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
        productLayout: {
          canvas: request.brief.size,
          productBounds: { x: 180, y: 700, width: 760, height: 520 },
          productCoverage: 0.28,
          pasteArtifactDetected: false,
          lightingMismatchDetected: false,
          textPanelCoverage: 0.05,
          textOccludesProduct: false,
          unauthorizedBrandMarksDetected: false,
        },
        logoOverlay: {
          applied: true,
          assetId: request.logoAsset.assetId,
          strategy: "deterministic_overlay",
          reservedZoneClean: true,
        },
        textValidation: {
          ocrChecked: true,
          mismatches: [],
        },
        m7Quality: {
          headlineHeightRatio: 0.02,
          productNameHeightRatio: 0.02,
          topEmptySpaceRatio: 0.42,
          productSceneContactDetected: false,
          horizonBandCutsProduct: true,
          secondaryAssetDistracts: true,
          logoDominatesLayout: true,
        },
      }),
    };

    const result = await runSingleImagePipelineV3(makeInput(), { imageAdapterV3: adapter, now });
    const issueCodes = result.run.items[0]?.issues.map((issue) => issue.code);

    expect(issueCodes).toContain(QA_ISSUE_CODE.TEXT_TOO_SMALL);
    expect(issueCodes).toContain(QA_ISSUE_CODE.COMPOSITION_EMPTY_TOP);
    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_SCENE_CONTACT_MISSING);
    expect(issueCodes).toContain(QA_ISSUE_CODE.HORIZON_BAND_CUTS_PRODUCT);
    expect(issueCodes).toContain(QA_ISSUE_CODE.SECONDARY_ASSET_DISTRACTS);
    expect(issueCodes).toContain(QA_ISSUE_CODE.LOGO_DOMINATES_LAYOUT);
    expect(result.m7.stableApprovalReady).toBe(false);
  });

  it("requires an injected M7 adapter and product reference", async () => {
    const missingAdapter = await runSingleImagePipelineV3(makeInput(), { now });
    expect(missingAdapter.run.items[0]?.error?.code).toBe(PIPELINE_ERROR_CODE.M6_IMAGE_ADAPTER_NOT_CONFIGURED);

    const adapter: Image2AdapterV3 = {
      generate: async () => {
        throw new Error("adapter should not run without product reference");
      },
    };
    const missingProduct = await runSingleImagePipelineV3(makeInput({ productAssets: [] }), { imageAdapterV3: adapter, now });
    expect(missingProduct.run.items[0]?.error?.code).toBe(PIPELINE_ERROR_CODE.MISSING_PRODUCT_REFERENCE);
  });
});
