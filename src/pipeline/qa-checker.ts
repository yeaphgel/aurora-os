import {
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  type QAChecker,
  type QACheckerRequest,
  type QAIssue,
  type QAResult,
} from "../contracts/index.js";

export function createDeterministicQAChecker(now: () => string = () => new Date().toISOString()): QAChecker {
  return {
    check: (request: QACheckerRequest): QAResult => checkDeterministicQA(request, now()),
  };
}

export const deterministicQAChecker: QAChecker = createDeterministicQAChecker();

export function checkDeterministicQA(request: QACheckerRequest, checkedAt: string): QAResult {
  const issues: QAIssue[] = [];
  const searchableOutputText = `${request.brief.imageDirection} ${request.brief.copyDirection}`.toLowerCase();
  const toneText = request.brief.brandToneConstraints.join(" ").toLowerCase();
  const styleText = `${request.brief.imageDirection} ${request.brief.styleConstraints.join(" ")}`.toLowerCase();

  if (!request.finalImage.uri) {
    issues.push({
      code: QA_ISSUE_CODE.HAS_IMAGE_OUTPUT,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Final image output is missing.",
      regenerationHint: "Regenerate the image before applying overlay and QA.",
    });
  }

  const requiredBrandTerms = [request.brandContext.brandName, ...request.brandContext.mustInclude];
  const missingBrandTerms = requiredBrandTerms.filter((term) => !searchableOutputText.includes(term.toLowerCase()));
  if (missingBrandTerms.length > 0) {
    issues.push({
      code: QA_ISSUE_CODE.HAS_REQUIRED_BRAND_NAME,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: `Missing required brand terms: ${missingBrandTerms.join(", ")}.`,
      regenerationHint: "Rebuild the brief with the configured brand name and required terms.",
    });
  }

  if (!request.overlayMetadata.logoApplied) {
    issues.push({
      code: QA_ISSUE_CODE.HAS_LOGO_IF_REQUIRED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Required logo overlay was not applied.",
      regenerationHint: "Apply the deterministic logo overlay before QA.",
    });
  }

  if (
    request.overlayMetadata.logoSafeMarginPx < request.brandContext.logoRules.safeMarginPx ||
    request.overlayMetadata.logoPosition !== request.brandContext.logoRules.position
  ) {
    issues.push({
      code: QA_ISSUE_CODE.LOGO_SAFE_MARGIN,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Logo overlay does not match the configured safe margin or position.",
      regenerationHint: "Re-apply logo overlay using brandContext.logoRules.",
    });
  }

  if (!request.overlayMetadata.productApplied) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_VISIBLE_IF_REQUIRED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Required product overlay was not applied.",
      regenerationHint: "Apply the deterministic product overlay before QA.",
    });
  }

  if (
    request.finalImage.width !== request.brief.size.width ||
    request.finalImage.height !== request.brief.size.height ||
    request.overlayMetadata.outputSize.width !== request.brief.size.width ||
    request.overlayMetadata.outputSize.height !== request.brief.size.height
  ) {
    issues.push({
      code: QA_ISSUE_CODE.SIZE_MISMATCH,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Final image size does not match the brief output size.",
      regenerationHint: "Regenerate or overlay at the exact brief size.",
    });
  }

  const forbiddenWords = request.brandContext.avoidWords.filter((word) => searchableOutputText.includes(word.toLowerCase()));
  if (forbiddenWords.length > 0) {
    issues.push({
      code: QA_ISSUE_CODE.FORBIDDEN_WORD_DETECTED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: `Forbidden words detected: ${forbiddenWords.join(", ")}.`,
      regenerationHint: "Remove forbidden words from the brief before regeneration.",
    });
  }

  if (!toneText.includes(request.brandContext.tone.toLowerCase())) {
    issues.push({
      code: QA_ISSUE_CODE.BRAND_TONE_MISMATCH,
      severity: QA_ISSUE_SEVERITY.WARNING,
      message: "Brief tone constraints do not mention the configured brand tone.",
      regenerationHint: "Rebuild the brief with the brand tone constraints.",
    });
  }

  const avoidedStyles = request.brandContext.stylePreferences.avoidStyles.filter((style) =>
    request.brief.imageDirection.toLowerCase().includes(style.toLowerCase()),
  );
  if (avoidedStyles.length > 0) {
    issues.push({
      code: QA_ISSUE_CODE.STYLE_MISMATCH,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: `Avoided styles detected in image direction: ${avoidedStyles.join(", ")}.`,
      regenerationHint: "Remove avoided visual styles before regeneration.",
    });
  }

  if (request.brandContext.historicalPreferences.rejectedExamples.length > 0 && !styleText.includes("avoid")) {
    issues.push({
      code: QA_ISSUE_CODE.PREFERENCE_CONFLICT,
      severity: QA_ISSUE_SEVERITY.WARNING,
      message: "Rejected preference memory exists but the brief has no avoidance constraints.",
      regenerationHint: "Include rejected preference patterns as negative constraints.",
    });
  }

  const hasHardFail = issues.some((issue) => issue.severity === QA_ISSUE_SEVERITY.HARD_FAIL);
  const hasWarning = issues.some((issue) => issue.severity === QA_ISSUE_SEVERITY.WARNING);

  return {
    status: hasHardFail ? QA_STATUS.FAIL : hasWarning ? QA_STATUS.WARNING : QA_STATUS.PASS,
    issues,
    checkedAt,
  };
}
