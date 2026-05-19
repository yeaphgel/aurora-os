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
    expect(brief.visualType).toBe("cinematic_environment");
    expect(brief.storyMode).toBe("proof_by_context");
    expect(brief.textStrategy).toBe("native_image2_typography");
    expect(brief.logoStrategy).toBe("deterministic_required");
    expect(brief.logoSpec.strategy).toBe("deterministic_required");
    expect(brief.overlayPlan.strategy).toBe("deterministic_logo_only");
    expect(brief.overlayPlan.logo.asset.assetId).toBe(sampleLogoAsset.assetId);
    expect(brief.logoOverlayPlan.logo.asset.assetId).toBe(sampleLogoAsset.assetId);
    expect(brief.overlayPlan.text).toHaveLength(0);
    expect(brief.nativeTextBlocks.map((block) => block.text)).toEqual([
      "Touch the future",
      "SeaTouch 4 Max+",
      "Underwater smartphone ecosystem for focused ocean creators",
    ]);
    expect(brief.deterministicLogoBlocks[0]?.asset.assetId).toBe(sampleLogoAsset.assetId);
    expect(brief.productSpec.asset.uri).toBe(sampleProductAsset.uri);
    expect(brief.productSpec.referenceMode).toBe("reference_locked");
    expect(brief.productSpec.placementPolicy.allowCrop).toBe(false);
    expect(brief.productSpec.placementPolicy.mustStayWithinCanvas).toBe(true);
    expect(brief.qaPolicy.forbidGeneratedBrandMarksOutsideOverlay).toBe(true);
    expect(brief.qaPolicy.requireLogoReservedZoneClean).toBe(true);
    expect(brief.qaPolicy.requireNativeTextOcr).toBe(true);
    expect(brief.qaPolicy.maxNativeTextCoverage).toBe(0.18);
    expect(brief.promptPayload.image2Prompt).toContain("Use Image 2 native typography only");
    expect(brief.promptPayload.image2Prompt).toContain("reserve a clean low-detail area");
    expect(brief.promptPayload.overlayInstruction).toContain("Apply the original logo asset");
    expect(brief.promptPayload.userPrompt).toContain("Use the product image as a locked visual reference");
    expect(brief.promptPayload.userPrompt).toContain("Do not draw or invent the official DIVEVOLK logo");
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
          usedLogoReference: false,
          usedOverlayFallback: false,
          inputAssetIds: [request.productAsset.assetId],
          modelInvocation: {
            provider: "hermes",
            modelId: "gpt-image-2",
            requestId: "req_001",
            usedImageInputs: [request.productAsset.assetId],
            usedProductAssetId: request.productAsset.assetId,
            generatedAt: now(),
          },
          productLayout: {
            canvas: request.brief.size,
            productBounds: { x: 80, y: 120, width: 620, height: 820 },
            productCoverage: 0.25,
            pasteArtifactDetected: false,
            lightingMismatchDetected: false,
            textPanelCoverage: 0.08,
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
    expect(capturedRequest?.brief.promptPayload.image2Prompt).not.toContain(sampleLogoAsset.assetId);
    expect(capturedRequest?.brief.logoOverlayPlan.logo.asset.assetId).toBe(sampleLogoAsset.assetId);
    expect(capturedRequest?.referenceAssets.map((asset) => asset.uri)).toContain("asset://rejected/divevolk-test-poster.png");
    expect(item?.image?.adapterMode).toBe("hermes_live");
    expect(item?.image?.usedProductReference).toBe(true);
    expect(item?.m6.nativeProductReferenceUsed).toBe(true);
    expect(item?.m6.overlayFallbackUsed).toBe(false);
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.PRODUCT_INTEGRATION_REVIEW_REQUIRED);
    expect(item?.issues.map((issue) => issue.code)).not.toContain(QA_ISSUE_CODE.GPT_IMAGE_INVOCATION_MISSING);
    expect(item?.issues.map((issue) => issue.code)).not.toContain(QA_ISSUE_CODE.PRODUCT_IMAGE_INPUT_MISSING);
    expect(result.m6.stableApprovalReady).toBe(false);
  });

  it("hard-fails when Hermes does not return verifiable GPT-Image invocation metadata", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_missing_invocation",
        uri: "asset://hermes/m6/missing-invocation.png",
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
          modelId: "",
          requestId: "",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
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

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    const item = result.run.items[0];

    expect(item?.status).toBe("needs_human");
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.GPT_IMAGE_INVOCATION_MISSING);
    expect(result.m6.stableApprovalReady).toBe(false);
  });

  it("hard-fails when product image input is missing from invocation metadata", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_missing_product_input",
        uri: "asset://hermes/m6/missing-product-input.png",
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
          requestId: "req_002",
          usedImageInputs: [request.logoAsset.assetId],
          usedProductAssetId: "wrong_asset",
          generatedAt: now(),
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

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    const item = result.run.items[0];

    expect(item?.status).toBe("needs_human");
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.PRODUCT_IMAGE_INPUT_MISSING);
    expect(result.m6.stableApprovalReady).toBe(false);
  });

  it("hard-fails when native product generation falls back to product overlay", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_overlay_fallback",
        uri: "asset://hermes/m6/overlay-fallback.png",
        width: request.brief.size.width,
        height: request.brief.size.height,
        format: "png",
        adapterMode: "hermes_live",
        usedProductReference: true,
        usedLogoReference: false,
        usedOverlayFallback: true,
        inputAssetIds: [request.productAsset.assetId],
        modelInvocation: {
          provider: "hermes",
          modelId: "gpt-image-2",
          requestId: "req_overlay_fallback",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
        productLayout: {
          canvas: request.brief.size,
          productBounds: { x: 80, y: 160, width: 620, height: 820 },
          productCoverage: 0.25,
          pasteArtifactDetected: false,
          lightingMismatchDetected: false,
          textPanelCoverage: 0.08,
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

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    const issueCodes = result.run.items[0]?.issues.map((issue) => issue.code);

    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_NOT_OVERLAY_ONLY);
    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_OVERLAY_FALLBACK_USED);
    expect(result.m6.stableApprovalReady).toBe(false);
  });

  it("requires deterministic logo overlay metadata for M6.1 exact brand output", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_no_logo_overlay",
        uri: "asset://hermes/m6/no-logo-overlay.png",
        width: request.brief.size.width,
        height: request.brief.size.height,
        format: "png",
        adapterMode: "hermes_live",
        usedProductReference: true,
        usedLogoReference: true,
        usedOverlayFallback: false,
        inputAssetIds: [request.productAsset.assetId],
        modelInvocation: {
          provider: "hermes",
          modelId: "gpt-image-2",
          requestId: "req_003",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
      }),
    };

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    const item = result.run.items[0];

    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.LOGO_ASSET_OVERLAY_MISSING);
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.LOGO_ASSET_OVERLAY_APPLIED);
  });

  it("hard-fails product bounds and paste artifacts reported by layout metadata", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_bad_layout",
        uri: "asset://hermes/m6/bad-layout.png",
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
          requestId: "req_004",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
        productLayout: {
          canvas: request.brief.size,
          productBounds: { x: 0, y: 1200, width: 900, height: 600 },
          productCoverage: 0.7,
          pasteArtifactDetected: true,
          lightingMismatchDetected: true,
          textPanelCoverage: 0.42,
          textOccludesProduct: true,
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

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    const issueCodes = result.run.items[0]?.issues.map((issue) => issue.code);

    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_OUT_OF_BOUNDS);
    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_PASTE_ARTIFACT);
    expect(issueCodes).toContain(QA_ISSUE_CODE.BACKGROUND_PRODUCT_LIGHTING_MISMATCH);
    expect(issueCodes).toContain(QA_ISSUE_CODE.PRODUCT_LIGHTING_MISMATCH);
    expect(issueCodes).toContain(QA_ISSUE_CODE.TEXT_PANEL_DOMINATES_PRODUCT);
    expect(issueCodes).toContain(QA_ISSUE_CODE.TEXT_OCCLUDES_PRODUCT);
  });

  it("hard-fails when generated brand marks appear outside deterministic overlay areas", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_unauthorized_brand_marks",
        uri: "asset://hermes/m6/unauthorized-brand-marks.png",
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
          requestId: "req_005",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
        productLayout: {
          canvas: request.brief.size,
          productBounds: { x: 80, y: 160, width: 620, height: 820 },
          productCoverage: 0.25,
          pasteArtifactDetected: false,
          lightingMismatchDetected: false,
          textPanelCoverage: 0.08,
          textOccludesProduct: false,
          unauthorizedBrandMarksDetected: true,
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

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    const item = result.run.items[0];

    expect(item?.status).toBe("needs_human");
    expect(item?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.UNAUTHORIZED_GENERATED_BRAND_MARKS);
    expect(result.m6.stableApprovalReady).toBe(false);
  });

  it("hard-fails when logo overlay reserved zone is not clean", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_dirty_logo_zone",
        uri: "asset://hermes/m6/dirty-logo-zone.png",
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
          requestId: "req_006",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
        productLayout: {
          canvas: request.brief.size,
          productBounds: { x: 80, y: 160, width: 620, height: 820 },
          productCoverage: 0.25,
          pasteArtifactDetected: false,
          lightingMismatchDetected: false,
          textPanelCoverage: 0.08,
          textOccludesProduct: false,
          unauthorizedBrandMarksDetected: false,
        },
        logoOverlay: {
          applied: true,
          assetId: request.logoAsset.assetId,
          strategy: "deterministic_overlay",
          reservedZoneClean: false,
        },
        textValidation: {
          ocrChecked: true,
          mismatches: [],
        },
      }),
    };

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    expect(result.run.items[0]?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.LOGO_RESERVED_ZONE_CLEAN);
  });

  it("hard-fails required native Image 2 typography OCR mismatches", async () => {
    const adapter: Image2AdapterV2 = {
      generate: async (request) => ({
        imageId: "m6_text_mismatch",
        uri: "asset://hermes/m6/text-mismatch.png",
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
          requestId: "req_007",
          usedImageInputs: [request.productAsset.assetId],
          usedProductAssetId: request.productAsset.assetId,
          generatedAt: now(),
        },
        productLayout: {
          canvas: request.brief.size,
          productBounds: { x: 80, y: 160, width: 620, height: 820 },
          productCoverage: 0.25,
          pasteArtifactDetected: false,
          lightingMismatchDetected: false,
          textPanelCoverage: 0.08,
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
          mismatches: [
            {
              role: "headline",
              expected: "Touch the future",
              detected: "Touch the futre",
              severity: "hard_fail",
            },
          ],
        },
      }),
    };

    const result = await runSingleImagePipelineV2(makeInput(), { imageAdapterV2: adapter, now });
    expect(result.run.items[0]?.issues.map((issue) => issue.code)).toContain(QA_ISSUE_CODE.NATIVE_TEXT_OCR_MISMATCH);
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
