import {
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  type AssetRef,
  type GeneratedImageV3,
  type ImageBriefV3,
  type QAIssue,
  type QAResult,
} from "../contracts/index.js";
import { checkM6ProductIntegrationQA } from "./m6-qa-checker.js";

export function checkM7CreativeQA(request: {
  brief: ImageBriefV3;
  image?: GeneratedImageV3 | undefined;
  productAsset?: AssetRef | undefined;
  checkedAt: string;
}): QAResult {
  const base = checkM6ProductIntegrationQA(request);
  const issues: QAIssue[] = [...base.issues];
  const quality = request.image?.m7Quality;

  if (!request.image) {
    return {
      ...base,
      issues,
    };
  }

  if (quality?.headlineHeightRatio !== undefined && quality.headlineHeightRatio < request.brief.typographyPlan.headline.minHeightRatio) {
    issues.push({
      code: QA_ISSUE_CODE.TEXT_TOO_SMALL,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M7 headline is too small to act as the poster's main visual text.",
      regenerationHint: "Regenerate with the headline at 7%-11% of canvas height.",
    });
  }

  if (
    quality?.productNameHeightRatio !== undefined &&
    quality.productNameHeightRatio < request.brief.typographyPlan.productName.minHeightRatio
  ) {
    issues.push({
      code: QA_ISSUE_CODE.TEXT_TOO_SMALL,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M7 product name typography is too small.",
      regenerationHint: "Regenerate with a clearly readable product name near the headline.",
    });
  }

  if (quality?.topEmptySpaceRatio !== undefined && quality.topEmptySpaceRatio > request.brief.compositionPlan.maxTopEmptySpaceRatio) {
    issues.push({
      code: QA_ISSUE_CODE.COMPOSITION_EMPTY_TOP,
      severity: QA_ISSUE_SEVERITY.WARNING,
      message: "Top composition is too empty for a cinematic product advertisement.",
      regenerationHint: "Use the upper composition for headline hierarchy, water-light narrative, or product depth.",
    });
  }

  if (request.brief.productFusionPlan.requireSceneContact && quality?.productSceneContactDetected === false) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_SCENE_CONTACT_MISSING,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Hero product lacks water-light contact or scene integration evidence.",
      regenerationHint: "Regenerate with caustics, haze, rim light, shadow, refraction, particles, and depth layers around the product.",
    });
  }

  if (request.brief.compositionPlan.forbidHorizonBandThroughProduct && quality?.horizonBandCutsProduct) {
    issues.push({
      code: QA_ISSUE_CODE.HORIZON_BAND_CUTS_PRODUCT,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "A horizontal band or divider cuts through the product composition.",
      regenerationHint: "Remove translucent horizontal bands and keep the product integrated into one continuous scene.",
    });
  }

  if (quality?.secondaryAssetDistracts) {
    issues.push({
      code: QA_ISSUE_CODE.SECONDARY_ASSET_DISTRACTS,
      severity: QA_ISSUE_SEVERITY.WARNING,
      message: "Secondary accessory or side product distracts from the hero product.",
      regenerationHint: "Suppress secondary accessories or keep them small and contextual.",
    });
  }

  if (quality?.logoDominatesLayout) {
    issues.push({
      code: QA_ISSUE_CODE.LOGO_DOMINATES_LAYOUT,
      severity: QA_ISSUE_SEVERITY.WARNING,
      message: "Logo visual weight dominates the headline or hero product.",
      regenerationHint: "Keep official logo exact but subordinate to the headline and hero product.",
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
