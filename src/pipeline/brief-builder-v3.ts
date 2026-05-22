import type {
  BriefBuilderV3,
  BriefBuilderV3Request,
  BoxBounds,
  CompositionPlan,
  ImageBriefV3,
  ProductFusionPlan,
  TypographyPlan,
} from "../contracts/index.js";
import { buildImageBriefV2 } from "./brief-builder-v2.js";

export const defaultBriefBuilderV3: BriefBuilderV3 = {
  build: buildImageBriefV3,
};

export function buildImageBriefV3(request: BriefBuilderV3Request): ImageBriefV3 {
  const base = buildImageBriefV2(request);
  const headlineText = "Touch the future";
  const productNameText = base.nativeTextBlocks.find((block) => block.role === "product_name")?.text ?? "SeaTouch 4 Max+";
  const subheadText =
    base.nativeTextBlocks.find((block) => block.role === "subhead")?.text ??
    "Underwater smartphone ecosystem for focused ocean creators";
  const compositionPlan = buildCompositionPlan(base.size, base.logoOverlayPlan.reservedZone.bounds);
  const typographyPlan = buildTypographyPlan(headlineText, productNameText, subheadText);
  const productFusionPlan = buildProductFusionPlan();
  const assetPriorityPlan = {
    primaryProductAssetId: base.productSpec.asset.assetId,
    secondaryAssets: "suppress" as const,
    maxSecondaryAssetCoverage: 0.06,
  };
  const image2Prompt = [
    `Create a high-end cinematic underwater product advertisement for ${request.input.brandContext.brandName}.`,
    `Use the product image as the hero product reference and make it feel physically present in the water, not pasted on top of a background.`,
    `Generate exactly one main product instance. Do not create background duplicate products, ghost products, smaller product copies, or accessory cutouts.`,
    `The product should occupy 55% to 75% of canvas width and be the dominant subject.`,
    `Build environmental contact around the product: underwater caustics, soft water haze, rim light, cast shadow, refraction, suspended particles crossing product edges, and foreground/background depth layers.`,
    `Use bold native Image 2 typography with exactly three text blocks: "${headlineText}", "${productNameText}", and "${subheadText}".`,
    `"${headlineText}" must be the main headline at 7% to 11% of canvas height; "${productNameText}" must sit near it as the product name; "${subheadText}" may be one or two short lines.`,
    `Do not generate any other text, micro labels, technical tags, tiny captions, fake brand words, pseudo UI text, or extra slogans anywhere in the image.`,
    `Keep all text boxes separated; do not overlap text with other text, the product, the logo reserved area, or important product details.`,
    `Reserve the official logo area for deterministic asset overlay only; do not draw the official logo, logo symbol, or logo lockup.`,
    `Avoid empty blue-water composition. Avoid flat procedural water graphics, horizontal translucent bands crossing the product, and template-like poster panels.`,
    `Suppress secondary accessories; no side accessory, SeaLink device, float, or small product should compete with or overlap the hero product.`,
    `Logo visual weight must be lower than the headline and product.`,
  ].join(" ");
  const overlayInstruction = [
    base.promptPayload.overlayInstruction,
    `M7 logo overlay must use the original logo asset only and stay within the logoReservedArea.`,
    `Do not overlay headline, product name, or subhead; Image 2 must generate those text elements natively.`,
  ].join(" ");

  return {
    ...base,
    schemaVersion: "m7.0",
    posterArchetype: "cinematic_product_ad",
    compositionPlan,
    typographyPlan,
    productFusionPlan,
    assetPriorityPlan,
    promptPayload: {
      ...base.promptPayload,
      backgroundPrompt: image2Prompt,
      image2Prompt,
      userPrompt: [image2Prompt, overlayInstruction].join(" "),
      overlayInstruction,
      negativePrompt: [
        base.promptPayload.negativePrompt,
        "empty blue-water poster",
        "product pasted over background",
        "duplicate product instance",
        "ghost product",
        "small accessory cutout",
        "horizontal translucent band cutting through product",
        "tiny unreadable headline",
        "micro text",
        "extra unauthorized text",
        "overlapping text",
        "secondary accessory competing with main product",
        "logo larger than headline",
      ].join("; "),
    },
    negativeConstraints: [
      ...base.negativeConstraints,
      "empty blue-water poster",
      "product pasted over background",
      "duplicate product instance",
      "ghost product",
      "small accessory cutout",
      "horizontal translucent band cutting through product",
      "tiny unreadable headline",
      "micro text",
      "extra unauthorized text",
      "overlapping text",
      "secondary accessory competing with main product",
      "logo larger than headline",
    ],
  };
}

function buildCompositionPlan(size: ImageBriefV3["size"], logoReservedArea: BoxBounds): CompositionPlan {
  return {
    heroProductArea: {
      x: Math.round(size.width * 0.12),
      y: Math.round(size.height * 0.34),
      width: Math.round(size.width * 0.76),
      height: Math.round(size.height * 0.42),
    },
    headlineArea: {
      x: Math.round(size.width * 0.06),
      y: Math.round(size.height * 0.08),
      width: Math.round(size.width * 0.7),
      height: Math.round(size.height * 0.2),
    },
    logoReservedArea,
    productWidthRatioRange: {
      min: 0.55,
      max: 0.75,
    },
    maxTopEmptySpaceRatio: 0.22,
    maxSecondaryAssetCoverage: 0.06,
    forbidHorizonBandThroughProduct: true,
  };
}

function buildTypographyPlan(headline: string, productName: string, subhead: string): TypographyPlan {
  return {
    headline: {
      text: headline,
      minHeightRatio: 0.07,
      maxHeightRatio: 0.11,
      priority: "required",
    },
    productName: {
      text: productName,
      minHeightRatio: 0.035,
      maxHeightRatio: 0.06,
      priority: "required",
    },
    subhead: {
      text: subhead,
      maxLines: 2,
      priority: "recommended",
    },
    maxTotalCoverageRatio: 0.22,
  };
}

function buildProductFusionPlan(): ProductFusionPlan {
  return {
    requireSceneContact: true,
    allowProductOverlayFallback: false,
    prioritizeAdFusionOverExactGeometry: true,
    requiredSignals: [
      "water caustics on or around product",
      "soft water haze around product edges",
      "coherent rim light and cast shadow",
      "foreground and background depth layers",
      "suspended water particles crossing the product plane",
    ],
  };
}
