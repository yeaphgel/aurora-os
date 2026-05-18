import {
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  type AssetRef,
  type GeneratedImageV2,
  type ImageBriefV2,
  type QAIssue,
  type QAResult,
} from "../contracts/index.js";

export function checkM6ProductIntegrationQA(request: {
  brief: ImageBriefV2;
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
  }

  if (request.brief.logoSpec.strategy === "deterministic_required" && !request.image?.logoOverlay?.applied) {
    issues.push({
      code: QA_ISSUE_CODE.LOGO_ASSET_OVERLAY_MISSING,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Deterministic logo overlay from the original logo asset is required but missing.",
      regenerationHint: "Apply the original logo asset after image generation instead of asking GPT-Image to redraw it.",
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
    }

    if (layout.textPanelCoverage > 0.28) {
      issues.push({
        code: QA_ISSUE_CODE.TEXT_PANEL_DOMINATES_PRODUCT,
        severity: QA_ISSUE_SEVERITY.WARNING,
        message: "Text panel coverage is too high for M6 native product visuals.",
        regenerationHint: "Reduce text panel size and let the product-scene relationship carry the visual.",
      });
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
