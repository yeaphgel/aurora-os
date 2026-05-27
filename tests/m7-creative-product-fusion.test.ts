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
    expect(brief.textStrategy).toBe("native_main_text_with_micro_overlay");
    expect(brief.posterArchetype).toBe("cinematic_product_ad");
    expect(brief.compositionPlan.productWidthRatioRange).toEqual({ min: 0.55, max: 0.75 });
    expect(brief.compositionPlan.maxTopEmptySpaceRatio).toBe(0.22);
    expect(brief.compositionPlan.forbidHorizonBandThroughProduct).toBe(true);
    expect(brief.typographyPlan.textStrategy).toBe("native_main_text_with_micro_overlay");
    expect(brief.typographyPlan.nativeComposition.placement).toBe("scene_adaptive");
    expect(brief.typographyPlan.microCopyOverlay.strategy).toBe("deterministic_overlay");
    expect(brief.typographyPlan.microCopyOverlay.maxHeightRatio).toBe(0.018);
    expect(brief.typographyPlan.headline.text).toBe("Touch the future");
    expect(brief.typographyPlan.headline.minHeightRatio).toBe(0.07);
    expect(brief.typographyPlan.productName.text).toBe("SeaTouch 4 Max+");
    expect(brief.productFusionPlan.requireSceneContact).toBe(true);
    expect(brief.productFusionPlan.allowProductOverlayFallback).toBe(false);
    expect(brief.assetPriorityPlan.secondaryAssets).toBe("suppress");
    expect(brief.logoOverlayPlan.logo.asset.assetId).toBe(sampleLogoAsset.assetId);
    expect(brief.promptPayload.image2Prompt).toContain("55% to 75% of canvas width");
    expect(brief.promptPayload.image2Prompt).toContain("Generate exactly one main product instance");
    expect(brief.promptPayload.image2Prompt).toContain("exactly three text blocks");
    expect(brief.promptPayload.image2Prompt).toContain("Do not generate any other text");
    expect(brief.promptPayload.image2Prompt).toContain("very small supporting copy is handled later by deterministic overlay only");
    expect(brief.promptPayload.overlayInstruction).toContain("Only optional micro supporting copy may be deterministic overlay");
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
            ocrItems: [
              {
                text: "Touch the future",
                bounds: { x: 80, y: 120, width: 760, height: 133 },
                heightRatio: 0.08,
                authorized: true,
                role: "headline",
              },
              {
                text: "SeaTouch 4 Max+",
                bounds: { x: 80, y: 270, width: 460, height: 66 },
                heightRatio: 0.04,
                authorized: true,
                role: "product_name",
              },
              {
                text: "Underwater smartphone ecosystem for focused ocean creators",
                bounds: { x: 80, y: 350, width: 820, height: 38 },
                heightRatio: 0.023,
                authorized: true,
                role: "subhead",
              },
            ],
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
            productInstanceCount: 1,
            productEdgeIntegrated: true,
            foregroundPasteArtifactDetected: false,
            unauthorizedTextDetected: false,
            textBoxOverlapDetected: false,
            tinyTextDetected: false,
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
          ocrItems: [
            {
              text: "Touch the future",
              bounds: { x: 80, y: 120, width: 220, height: 33 },
              heightRatio: 0.02,
              authorized: true,
              role: "headline",
            },
          ],
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
          productInstanceCount: 2,
          productEdgeIntegrated: false,
          foregroundPasteArtifactDetected: true,
          unauthorizedTextDetected: false,
          textBoxOverlapDetected: false,
          tinyTextDetected: false,
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
    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_INSTANCE_DUPLICATED);
    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_EDGE_NOT_INTEGRATED);
    expect(issueCodes).toContain(QA_ISSUE_CODE.FOREGROUND_PRODUCT_PASTE_ARTIFACT);
    expect(result.m7.stableApprovalReady).toBe(false);
  });

  it("hard-fails when M7.1 OCR and visual evidence is missing", async () => {
    const adapter: Image2AdapterV3 = {
      generate: async (request) => ({
        imageId: "m7_missing_evidence",
        uri: "asset://hermes/m7/missing-evidence.png",
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
          requestId: "req_m7_missing_evidence",
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
        },
        textValidation: {
          ocrChecked: true,
          mismatches: [],
        },
      }),
    };

    const result = await runSingleImagePipelineV3(makeInput(), { imageAdapterV3: adapter, now });
    expect(result.run.items[0]?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.VISUAL_QA_EVIDENCE_MISSING);
  });

  it("hard-fails unauthorized text, overlapping text, and tiny OCR text", async () => {
    const adapter: Image2AdapterV3 = {
      generate: async (request) => ({
        imageId: "m7_bad_text_evidence",
        uri: "asset://hermes/m7/bad-text-evidence.png",
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
          requestId: "req_m7_bad_text",
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
        },
        textValidation: {
          ocrChecked: true,
          ocrItems: [
            {
              text: "Touch the future",
              bounds: { x: 80, y: 120, width: 760, height: 133 },
              heightRatio: 0.08,
              authorized: true,
              role: "headline",
              overlapsWith: ["SeaTouch 4 Max+"],
            },
            {
              text: "DIVEVOLKOCEAN-TECH",
              bounds: { x: 80, y: 105, width: 160, height: 20 },
              heightRatio: 0.012,
              authorized: false,
            },
          ],
          mismatches: [],
        },
        m7Quality: {
          headlineHeightRatio: 0.08,
          productNameHeightRatio: 0.04,
          topEmptySpaceRatio: 0.12,
          productSceneContactDetected: true,
          horizonBandCutsProduct: false,
          secondaryAssetDistracts: false,
          logoDominatesLayout: false,
          productInstanceCount: 1,
          productEdgeIntegrated: true,
          foregroundPasteArtifactDetected: false,
          unauthorizedTextDetected: true,
          textBoxOverlapDetected: true,
          tinyTextDetected: true,
        },
      }),
    };

    const result = await runSingleImagePipelineV3(makeInput(), { imageAdapterV3: adapter, now });
    const issueCodes = result.run.items[0]?.issues.map((issue) => issue.code);

    expect(issueCodes).toContain(QA_ISSUE_CODE.UNAUTHORIZED_TEXT_DETECTED);
    expect(issueCodes).toContain(QA_ISSUE_CODE.TEXT_BOX_OVERLAP);
    expect(issueCodes).toContain(QA_ISSUE_CODE.TEXT_TOO_SMALL_ANY);
  });

  it("allows tiny deterministic supporting copy while keeping main typography native", async () => {
    const adapter: Image2AdapterV3 = {
      generate: async (request) => ({
        imageId: "m7_micro_copy_overlay_ok",
        uri: "asset://hermes/m7/micro-copy-overlay-ok.png",
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
          requestId: "req_m7_micro_copy_ok",
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
          textPanelCoverage: 0.15,
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
          ocrItems: [
            {
              text: "Touch the future",
              bounds: { x: 80, y: 120, width: 760, height: 133 },
              heightRatio: 0.08,
              authorized: true,
              role: "headline",
              renderSource: "native_image2_typography",
            },
            {
              text: "SeaTouch 4 Max+",
              bounds: { x: 80, y: 270, width: 460, height: 66 },
              heightRatio: 0.04,
              authorized: true,
              role: "product_name",
              renderSource: "native_image2_typography",
            },
            {
              text: "Underwater smartphone ecosystem for focused ocean creators",
              bounds: { x: 80, y: 350, width: 820, height: 38 },
              heightRatio: 0.023,
              authorized: true,
              role: "subhead",
              renderSource: "native_image2_typography",
            },
            {
              text: "Full touchscreen underwater",
              bounds: { x: 80, y: 1530, width: 280, height: 20 },
              heightRatio: 0.012,
              authorized: true,
              role: "supporting",
              renderSource: "deterministic_overlay",
            },
          ],
          mismatches: [],
        },
        m7Quality: {
          headlineHeightRatio: 0.08,
          productNameHeightRatio: 0.04,
          topEmptySpaceRatio: 0.12,
          productSceneContactDetected: true,
          horizonBandCutsProduct: false,
          secondaryAssetDistracts: false,
          logoDominatesLayout: false,
          productInstanceCount: 1,
          productEdgeIntegrated: true,
          foregroundPasteArtifactDetected: false,
          unauthorizedTextDetected: false,
          textBoxOverlapDetected: false,
          tinyTextDetected: false,
        },
      }),
    };

    const result = await runSingleImagePipelineV3(makeInput(), { imageAdapterV3: adapter, now });
    const issueCodes = result.run.items[0]?.issues.map((issue) => issue.code);

    expect(issueCodes).not.toContain(QA_ISSUE_CODE.TEXT_TOO_SMALL_ANY);
    expect(issueCodes).not.toContain(QA_ISSUE_CODE.MICRO_TEXT_OVERLAY_POLICY_VIOLATION);
    expect(result.run.items[0]?.brief.textStrategy).toBe("native_main_text_with_micro_overlay");
  });

  it("hard-fails deterministic overlay text that tries to replace main typography", async () => {
    const adapter: Image2AdapterV3 = {
      generate: async (request) => ({
        imageId: "m7_bad_micro_copy_overlay",
        uri: "asset://hermes/m7/bad-micro-copy-overlay.png",
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
          requestId: "req_m7_bad_micro_copy",
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
          textPanelCoverage: 0.2,
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
          ocrItems: [
            {
              text: "Touch the future",
              bounds: { x: 80, y: 120, width: 760, height: 88 },
              heightRatio: 0.053,
              authorized: true,
              role: "headline",
              renderSource: "deterministic_overlay",
            },
          ],
          mismatches: [],
        },
        m7Quality: {
          headlineHeightRatio: 0.053,
          productNameHeightRatio: 0.04,
          topEmptySpaceRatio: 0.12,
          productSceneContactDetected: true,
          horizonBandCutsProduct: false,
          secondaryAssetDistracts: false,
          logoDominatesLayout: false,
          productInstanceCount: 1,
          productEdgeIntegrated: true,
          foregroundPasteArtifactDetected: false,
          unauthorizedTextDetected: false,
          textBoxOverlapDetected: false,
          tinyTextDetected: false,
        },
      }),
    };

    const result = await runSingleImagePipelineV3(makeInput(), { imageAdapterV3: adapter, now });
    expect(result.run.items[0]?.issues.map((issue) => issue.code)).toContain(
      QA_ISSUE_CODE.MICRO_TEXT_OVERLAY_POLICY_VIOLATION,
    );
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
