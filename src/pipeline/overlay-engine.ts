import {
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  type OverlayEngine,
  type OverlayEngineRequest,
  type OverlayEngineResult,
  type OverlaySpec,
} from "../contracts/index.js";
import { createPipelineError } from "./errors.js";

export const deterministicOverlayEngine: OverlayEngine = {
  apply: applyDeterministicOverlay,
};

export function makeOverlaySpec(request: {
  outputSize: OverlaySpec["outputSize"];
  logoAsset: OverlaySpec["logo"]["asset"];
  productAsset: OverlaySpec["product"]["asset"];
  brandContext: {
    logoRules: Pick<OverlaySpec["logo"], "position" | "safeMarginPx" | "minWidthPx">;
    productRules: Pick<OverlaySpec["product"], "position" | "maxAreaRatio">;
  };
}): OverlaySpec {
  return {
    outputSize: request.outputSize,
    logo: {
      asset: request.logoAsset,
      position: request.brandContext.logoRules.position,
      safeMarginPx: request.brandContext.logoRules.safeMarginPx,
      minWidthPx: request.brandContext.logoRules.minWidthPx,
      required: true,
    },
    product: {
      asset: request.productAsset,
      position: request.brandContext.productRules.position,
      maxAreaRatio: request.brandContext.productRules.maxAreaRatio,
      required: true,
    },
  };
}

export function applyDeterministicOverlay(request: OverlayEngineRequest): OverlayEngineResult {
  assertOverlayAsset(request.spec.logo.required, request.spec.logo.asset.uri, "Logo asset is required for overlay.");
  assertOverlayAsset(
    request.spec.product.required,
    request.spec.product.asset.uri,
    "Product asset is required for overlay.",
  );

  const query = new URLSearchParams({
    base: request.baseImage.imageId,
    logo: request.spec.logo.asset.assetId,
    logoPosition: request.spec.logo.position,
    product: request.spec.product.asset.assetId,
    productPosition: request.spec.product.position,
    attempt: String(request.attempt),
  });

  return {
    finalImage: {
      imageId: request.finalImageId,
      uri: `overlay://final/${request.finalImageId}.png?${query.toString()}`,
      width: request.spec.outputSize.width,
      height: request.spec.outputSize.height,
      format: request.baseImage.format,
    },
    metadata: {
      logoApplied: true,
      logoPosition: request.spec.logo.position,
      logoSafeMarginPx: request.spec.logo.safeMarginPx,
      productApplied: true,
      productPosition: request.spec.product.position,
      outputSize: request.spec.outputSize,
    },
  };
}

function assertOverlayAsset(required: boolean, uri: string, message: string): void {
  if (!required || uri) return;

  throw createPipelineError(PIPELINE_ERROR_CODE.OVERLAY_FAILED, PIPELINE_STAGE.OVERLAY, message, false);
}
