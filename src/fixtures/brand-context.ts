import type { AssetRef, BrandContext } from "../contracts/index.js";

export const sampleBrandContext: BrandContext = {
  brandId: "brand_001",
  brandName: "Aurora Sample Brand",
  tone: "premium",
  brandColors: ["#111111", "#FFFFFF"],
  avoidWords: ["forbidden", "overclaim"],
  mustInclude: ["Aurora"],
  visualStyle: "minimal",
  toneRules: {
    voice: "professional",
    emotion: "calm",
    formality: "medium",
    mustFeelLike: ["credible", "premium", "clear"],
    mustNotFeelLike: ["cheap", "loud", "cluttered"],
  },
  stylePreferences: {
    preferredComposition: ["white space", "centered product", "subtle background"],
    preferredLighting: "soft studio lighting",
    preferredTexture: "clean matte",
    avoidStyles: ["cyberpunk", "cartoon", "cheap sale poster"],
  },
  historicalPreferences: {
    approvedExamples: ["asset://approved_001.png"],
    rejectedExamples: ["asset://rejected_001.png"],
    notes: ["Prefer simple posters with limited decoration."],
  },
  logoRules: {
    position: "bottom_right",
    safeMarginPx: 48,
    minWidthPx: 120,
  },
  productRules: {
    position: "center",
    maxAreaRatio: 0.45,
  },
};

export const sampleLogoAsset: AssetRef = {
  assetId: "asset_logo_001",
  uri: "asset://logo.png",
  format: "png",
  role: "logo",
  width: 512,
  height: 256,
  mimeType: "image/png",
};

export const sampleProductAsset: AssetRef = {
  assetId: "asset_product_001",
  uri: "asset://product.png",
  format: "png",
  role: "product",
  width: 1200,
  height: 1200,
  mimeType: "image/png",
};

