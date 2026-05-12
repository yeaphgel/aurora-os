import {
  QA_ISSUE_CODE,
  type BriefRegenerationAdjuster,
  type BriefRegenerationAdjustmentRequest,
  type ImageBrief,
  type QAIssue,
} from "../contracts/index.js";

export const defaultRegenerationAdjuster: BriefRegenerationAdjuster = {
  adjust: adjustBriefForRegeneration,
};

export function adjustBriefForRegeneration(request: BriefRegenerationAdjustmentRequest): ImageBrief {
  const issueCodes = new Set(request.qa.issues.map((issue) => issue.code));
  const issueHints = request.qa.issues.flatMap(toRegenerationConstraints);
  const retryMarker = `regeneration attempt ${request.nextAttempt}: address QA issues ${[...issueCodes].join(", ")}`;

  return {
    ...request.failedBrief,
    imageDirection: adjustImageDirection(request.failedBrief.imageDirection, issueCodes, request.input.brandContext.brandName),
    copyDirection: adjustCopyDirection(request.failedBrief.copyDirection, issueCodes, request.input.brandContext.brandName),
    brandToneConstraints: unique([
      ...request.failedBrief.brandToneConstraints,
      ...(issueCodes.has(QA_ISSUE_CODE.BRAND_TONE_MISMATCH)
        ? [
            `must match brand tone: ${request.input.brandContext.tone}`,
            `must use voice: ${request.input.brandContext.toneRules.voice}`,
            `must feel like: ${request.input.brandContext.toneRules.mustFeelLike.join(", ")}`,
          ]
        : []),
    ]),
    styleConstraints: unique([
      ...request.failedBrief.styleConstraints,
      ...(issueCodes.has(QA_ISSUE_CODE.STYLE_MISMATCH)
        ? [
            `must match visual style: ${request.input.brandContext.visualStyle}`,
            `avoid styles: ${request.input.brandContext.stylePreferences.avoidStyles.join(", ")}`,
          ]
        : []),
      ...(issueCodes.has(QA_ISSUE_CODE.PREFERENCE_CONFLICT)
        ? [
            "must avoid rejected historical preference patterns",
            ...request.input.brandContext.historicalPreferences.notes.map((note) => `preference note: ${note}`),
          ]
        : []),
    ]),
    negativeConstraints: unique([
      ...request.failedBrief.negativeConstraints,
      retryMarker,
      ...issueHints,
      ...request.input.brandContext.avoidWords.map((word) => `strictly exclude forbidden word: ${word}`),
    ]),
  };
}

function adjustImageDirection(baseDirection: string, issueCodes: Set<QAIssue["code"]>, brandName: string): string {
  const additions: string[] = [];

  if (issueCodes.has(QA_ISSUE_CODE.HAS_IMAGE_OUTPUT) || issueCodes.has(QA_ISSUE_CODE.SIZE_MISMATCH)) {
    additions.push("regenerate the full image at the exact requested output size");
  }

  if (issueCodes.has(QA_ISSUE_CODE.HAS_REQUIRED_BRAND_NAME)) {
    additions.push(`include ${brandName} as an explicit brand cue`);
  }

  if (issueCodes.has(QA_ISSUE_CODE.HAS_LOGO_IF_REQUIRED) || issueCodes.has(QA_ISSUE_CODE.LOGO_SAFE_MARGIN)) {
    additions.push("reserve clean safe-margin space for deterministic logo overlay");
  }

  if (issueCodes.has(QA_ISSUE_CODE.PRODUCT_VISIBLE_IF_REQUIRED)) {
    additions.push("keep the product clearly visible for deterministic product overlay");
  }

  return uniqueInline([baseDirection, ...additions]).join(" | ");
}

function adjustCopyDirection(baseDirection: string, issueCodes: Set<QAIssue["code"]>, brandName: string): string {
  const additions = issueCodes.has(QA_ISSUE_CODE.HAS_REQUIRED_BRAND_NAME)
    ? [`Use ${brandName} exactly as the brand name.`]
    : [];

  return uniqueInline([baseDirection, ...additions]).join(" ");
}

function toRegenerationConstraints(issue: QAIssue): string[] {
  const hint = issue.regenerationHint ? [`qa hint: ${issue.regenerationHint}`] : [];

  switch (issue.code) {
    case QA_ISSUE_CODE.HAS_IMAGE_OUTPUT:
      return ["must produce a final image output", ...hint];
    case QA_ISSUE_CODE.HAS_REQUIRED_BRAND_NAME:
      return ["must include required brand terms", ...hint];
    case QA_ISSUE_CODE.HAS_LOGO_IF_REQUIRED:
      return ["must preserve space for required logo overlay", ...hint];
    case QA_ISSUE_CODE.LOGO_SAFE_MARGIN:
      return ["must preserve configured logo safe margin", ...hint];
    case QA_ISSUE_CODE.PRODUCT_VISIBLE_IF_REQUIRED:
      return ["must keep required product visible", ...hint];
    case QA_ISSUE_CODE.SIZE_MISMATCH:
      return ["must match requested output dimensions exactly", ...hint];
    case QA_ISSUE_CODE.FORBIDDEN_WORD_DETECTED:
      return ["must remove forbidden words from generated copy direction", ...hint];
    case QA_ISSUE_CODE.BRAND_TONE_MISMATCH:
      return ["must align with brand tone constraints", ...hint];
    case QA_ISSUE_CODE.STYLE_MISMATCH:
      return ["must align with visual style constraints", ...hint];
    case QA_ISSUE_CODE.PREFERENCE_CONFLICT:
      return ["must avoid rejected preference memory patterns", ...hint];
    case QA_ISSUE_CODE.NO_UNKNOWN_ERROR:
      return hint;
  }
}

function unique(values: string[]): string[] {
  return values.filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
}

function uniqueInline(values: string[]): string[] {
  return unique(values.map((value) => value.trim()).filter(Boolean));
}
