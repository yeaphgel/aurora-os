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

  if (request.image?.usedOverlayFallback) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_NOT_OVERLAY_ONLY,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M6 result used overlay fallback instead of native product integration.",
      regenerationHint: "Regenerate through the native product reference path before using overlay fallback.",
    });
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
