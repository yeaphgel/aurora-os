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
  const textValidation = request.image?.textValidation;

  if (!request.image) {
    return {
      ...base,
      issues,
    };
  }

  if (!textValidation?.ocrChecked || !textValidation.ocrItems || textValidation.ocrItems.length === 0 || !quality) {
    issues.push({
      code: QA_ISSUE_CODE.VISUAL_QA_EVIDENCE_MISSING,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M7.1 requires OCR items and visual QA evidence before approval.",
      regenerationHint: "Run OCR and visual QA, then return ocrItems and m7Quality evidence fields.",
    });
  }

  if (textValidation?.ocrItems) {
    const unauthorizedTexts = textValidation.ocrItems.filter((item) => !item.authorized);
    if (unauthorizedTexts.length > 0 || quality?.unauthorizedTextDetected) {
      issues.push({
        code: QA_ISSUE_CODE.UNAUTHORIZED_TEXT_DETECTED,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "OCR detected text outside the authorized M7 text set.",
        regenerationHint: "Regenerate with only Touch the future, SeaTouch 4 Max+, and the approved short subhead.",
      });
    }

    const overlappingTexts = textValidation.ocrItems.filter((item) => (item.overlapsWith?.length ?? 0) > 0);
    if (overlappingTexts.length > 0 || quality?.textBoxOverlapDetected) {
      issues.push({
        code: QA_ISSUE_CODE.TEXT_BOX_OVERLAP,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "OCR text boxes overlap or collide.",
        regenerationHint: "Regenerate with separated headline, product name, and subhead text boxes.",
      });
    }

    const allowedMicroOverlayRoles = request.brief.typographyPlan.microCopyOverlay.allowedRoles;
    const isAllowedMicroOverlay = (item: (typeof textValidation.ocrItems)[number]) =>
      item.renderSource === "deterministic_overlay" &&
      item.authorized &&
      item.role !== undefined &&
      allowedMicroOverlayRoles.includes(item.role as (typeof allowedMicroOverlayRoles)[number]) &&
      item.heightRatio <= request.brief.typographyPlan.microCopyOverlay.maxHeightRatio;
    const tinyTexts = textValidation.ocrItems.filter((item) => item.heightRatio < 0.018 && !isAllowedMicroOverlay(item));
    if (tinyTexts.length > 0 || quality?.tinyTextDetected) {
      issues.push({
        code: QA_ISSUE_CODE.TEXT_TOO_SMALL_ANY,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "OCR detected native or unauthorized text that is too small for M7 poster output.",
        regenerationHint: "Let Image 2 generate only the main readable text blocks; move optional micro copy into deterministic overlay metadata.",
      });
    }

    const microOverlayViolations = textValidation.ocrItems.filter(
      (item) =>
        item.renderSource === "deterministic_overlay" &&
        (!item.authorized ||
          item.role === undefined ||
          !allowedMicroOverlayRoles.includes(item.role as (typeof allowedMicroOverlayRoles)[number]) ||
          item.heightRatio > request.brief.typographyPlan.microCopyOverlay.maxHeightRatio),
    );
    if (microOverlayViolations.length > 0) {
      issues.push({
        code: QA_ISSUE_CODE.MICRO_TEXT_OVERLAY_POLICY_VIOLATION,
        severity: QA_ISSUE_SEVERITY.HARD_FAIL,
        message: "Deterministic micro copy overlay exceeded the M7 typography policy.",
        regenerationHint: "Keep deterministic overlay text limited to tiny supporting or CTA copy; main headline, product name, and subhead must be native Image 2 typography.",
      });
    }
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

  if (quality?.productInstanceCount !== undefined && quality.productInstanceCount !== 1) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_INSTANCE_DUPLICATED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "M7 output must contain exactly one main product instance.",
      regenerationHint: "Regenerate with one hero product only; do not create background duplicate products, ghost products, or secondary product cutouts.",
    });
  }

  if (quality?.productEdgeIntegrated === false) {
    issues.push({
      code: QA_ISSUE_CODE.PRODUCT_EDGE_NOT_INTEGRATED,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Product edges are not sufficiently integrated with the water environment.",
      regenerationHint: "Add water haze, particles crossing the product plane, caustic light, soft occlusion, and coherent edge lighting.",
    });
  }

  if (quality?.foregroundPasteArtifactDetected) {
    issues.push({
      code: QA_ISSUE_CODE.FOREGROUND_PRODUCT_PASTE_ARTIFACT,
      severity: QA_ISSUE_SEVERITY.HARD_FAIL,
      message: "Foreground product appears pasted over the generated scene.",
      regenerationHint: "Regenerate through native product reference integration, not foreground compositing.",
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
