import {
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  type AssetRef,
  type GeneratedImageV2,
  type ImageBriefV2,
  type ImageBriefV3,
  type QAIssue,
  type QAResult,
} from "../contracts/index.js";

export function checkM6ProductIntegrationQA(request: {
  brief: ImageBriefV2 | ImageBriefV3;
  image?: GeneratedImageV2 | undefined;
  productAsset?: AssetRef | undefined;
  checkedAt: string;
}): QAResult {
  const issues: QAIssue[] = [];

  if (!request.productAsset?.uri) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_REFERENCE_ATTACHED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M6 generation requires a product reference asset.",
      regenerationHint: "Attach the product image as a model reference before generation.",
    });
  }

  if (request.brief.renderMode !== "native_product_reference") {
    issues.push({
      code: QA_ISSUE_CODE.NATIVE_PRODUCT_REFERENCE_USED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M6 generation did not use native_product_reference render mode.",
      regenerationHint: "Regenerate with renderMode: native_product_reference.",
    });
  }

  if (!request.image?.usedProductReference) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_REFERENCE_ATTACHED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Image adapter did not report product reference usage.",
      regenerationHint: "Hermes adapter must pass the product image as an image reference/input.",
    });
  }

  if (!request.image?.modelInvocation.modelId || !request.image.modelInvocation.requestId) {
    issues.push({
      code: QA_ISSUE_CODE.GPT_IMAGE_INVOCATION_MISSING,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Image adapter did not provide verifiable GPT-Image invocation metadata.",
      regenerationHint: "Hermes adapter must return provider, modelId, requestId, used image inputs, and generatedAt.",
    });
  }

  if (
    request.image &&
    (!request.image.modelInvocation.usedImageInputs.includes(request.brief.productSpec.asset.assetId) ||
      request.image.modelInvocation.usedProductAssetId !== request.brief.productSpec.asset.assetId)
  ) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_IMAGE_INPUT_MISSING,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "GPT-Image invocation metadata does not prove that the product image was used as an image input.",
      regenerationHint: "Pass the product asset as an actual image input/reference and report its assetId.",
    });
  }

  if (request.image?.usedOverlayFallback) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_NOT_OVERLAY_ONLY,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M6 result used overlay fallback instead of native product integration.",
      regenerationHint: "Regenerate through the native product reference path before using overlay fallback.",
    });
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_OVERLAY_FALLBACK_USED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M6.3 native product visuals cannot be approved when the product was composited as an overlay fallback.",
      regenerationHint: "Pass the product image into GPT-Image 2 as a product reference and regenerate scene-integrated output.",
    });
  }

  if (
    request.brief.logoSpec.strategy === "deterministic_required" &&
    (!request.image?.logoOverlay?.applied || request.image.logoOverlay.assetId !== request.brief.logoSpec.asset.assetId)
  ) {
    issues.push({
      code: QA_ISSUE_CODE.LOGO_ASSET_OVERLAY_MISSING,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Deterministic logo overlay from the original logo asset is required but missing.",
      regenerationHint: "Apply the original logo asset after image generation instead of asking GPT-Image to redraw it.",
    });
    issues.push({
      code: QA_ISSUE_CODE.LOGO_ASSET_OVERLAY_APPLIED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Official logo overlay was not proven to use the configured logo asset.",
      regenerationHint: "Apply the original logo asset and return logoOverlay.applied with the matching assetId.",
    });
  }

  if (request.brief.qaPolicy.requireLogoReservedZoneClean && request.image?.logoOverlay?.reservedZoneClean === false) {
    issues.push({
      code: QA_ISSUE_CODE.LOGO_RESERVED_ZONE_CLEAN,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Logo reserved zone is not clean enough for exact asset overlay.",
      regenerationHint: "Reserve a low-detail, high-contrast logo area without white cards or busy texture.",
    });
  }

  if (request.image?.productLayout) {
    const layout = request.image.productLayout;
    const policy = request.brief.productSpec.placementPolicy;
    const exceedsCanvas =
      layout.productBounds.x < policy.safeAreaPx ||
      layout.productBounds.y < policy.safeAreaPx ||
      layout.productBounds.x + layout.productBounds.width > layout.canvas.width - policy.safeAreaPx ||
      layout.productBounds.y + layout.productBounds.height > layout.canvas.height - policy.safeAreaPx;

    if ((policy.mustStayWithinCanvas && exceedsCanvas) || layout.productCoverage > policy.maxCanvasCoverage) {
      issues.push({
        code: QA_ISSUE_CODE.PRODUCT_OUT_OF_BOUNDS,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "Product placement exceeds the configured safe area or canvas coverage limit.",
        regenerationHint: "Regenerate or repair with the full product inside the canvas safe area.",
      });
    }

    if (layout.pasteArtifactDetected) {
      issues.push({
        code: QA_ISSUE_CODE.PRODUCT_PASTE_ARTIFACT,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "Product layout metadata reports paste artifacts such as hard rectangle shadows or flat compositing.",
        regenerationHint: "Regenerate through native product reference integration instead of background-plus-product paste.",
      });
    }

    if (layout.lightingMismatchDetected) {
      issues.push({
        code: QA_ISSUE_CODE.BACKGROUND_PRODUCT_LIGHTING_MISMATCH,
        severity: QA_ISSUE_SEVERITY.WARNING,
        message: "Product and background lighting appear mismatched.",
        regenerationHint: "Repair product integration with coherent water lighting, shadow, and perspective.",
      });
      issues.push({
        code: QA_ISSUE_CODE.PRODUCT_LIGHTING_MISMATCH,
        severity: QA_ISSUE_SEVERITY.WARNING,
        message: "Product lighting does not match the generated scene.",
        regenerationHint: "Regenerate with coherent water light rays, product shadow, reflection, and perspective.",
      });
    }

    if (layout.textPanelCoverage > request.brief.qaPolicy.maxNativeTextCoverage) {
      issues.push({
        code: QA_ISSUE_CODE.TEXT_PANEL_DOMINATES_PRODUCT,
        severity: QA_ISSUE_SEVERITY.WARNING,
        message: "Text panel coverage is too high for M6 native product visuals.",
        regenerationHint: "Reduce text panel size and let the product-scene relationship carry the visual.",
      });
    }

    if (layout.textOccludesProduct) {
      issues.push({
        code: QA_ISSUE_CODE.TEXT_OCCLUDES_PRODUCT,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "Native Image 2 typography overlaps or obscures the product.",
        regenerationHint: "Move native typography into safe negative space and keep product marks, windows, and edges visible.",
      });
    }

    if (request.brief.qaPolicy.forbidGeneratedBrandMarksOutsideOverlay && layout.unauthorizedBrandMarksDetected) {
      issues.push({
        code: QA_ISSUE_CODE.UNAUTHORIZED_GENERATED_BRAND_MARKS,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "Generated brand marks were detected outside deterministic overlay areas.",
        regenerationHint: "Regenerate a clean visual without model-generated brand text on gear, product surfaces, or background objects.",
      });
    }
  }

  if (request.brief.qaPolicy.requireNativeTextOcr && request.image) {
    if (!request.image.textValidation?.ocrChecked) {
      issues.push({
        code: QA_ISSUE_CODE.NATIVE_TEXT_OCR_MISMATCH,
        severity: QA_ISSUE_SEVERITY.WARNING,
        message: "Native Image 2 typography was not verified by OCR metadata.",
        regenerationHint: "Run OCR against native text blocks and return mismatch metadata before approval.",
      });
    } else {
      for (const mismatch of request.image.textValidation.mismatches) {
        issues.push({
          code: QA_ISSUE_CODE.NATIVE_TEXT_OCR_MISMATCH,
          severity: mismatch.severity,
          message: `Native text OCR mismatch for ${mismatch.role}: expected "${mismatch.expected}"${
            mismatch.detected ? ` but detected "${mismatch.detected}"` : ""
          }.`,
          regenerationHint: "Regenerate or repair Image 2 typography with exact required text.",
        });
      }
    }
  }

  if (request.brief.qaPolicy.requireHumanIntegrationReview) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_INTEGRATION_REVIEW_REQUIRED,
      severity: QA_ISSUE_SEVERITY.WARNING,
      message: "Manual review is required to confirm product structure and scene integration quality.",
      regenerationHint: "Review whether the product is integrated into the scene without visible paste artifacts.",
    });
  }

  const hasHardFail = issues.some((issue) => issue.severity === QA_ISSUE_SEVERITY.HARD_FAIL);
  const hasWarning = issues.some((issue) => issue.severity === QA_ISSUE_SEVERITY.WARNING);

  return {
    status: hasHardFail ? QA_STATUS.FAIL : hasWarning ? QA_STATUS.WARNING : QA_STATUS.PASS,
    issues,
    checkedAt: request.checkedAt,
  };
}
