import type {
  BriefBuilderV2,
  BriefBuilderV2Request,
  ChannelFormat,
  ImageBriefV2,
  TextBlockSpec,
} from "../contracts/index.js";

const CHANNEL_SIZES: Record<ChannelFormat, ImageBriefV2["size"]> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1242, height: 1660 },
  landscape: { width: 1600, height: 900 },
  custom: { width: 1080, height: 1080 },
};

const PRODUCT_DETAILS_TO_PRESERVE = [
  "overall product silhouette",
  "phone case window",
  "buttons and clamps",
  "lanyard and strap details",
  "visible brand marks on the product",
  "material contrast between black body and metallic frame",
];

const DEFAULT_SCENE_AVOIDANCE = [
  "pure black empty background",
  "isolated product pasted on a flat canvas",
  "test preview cards",
  "large decorative UI boxes",
  "product disconnected from the environment",
  "distorted product geometry",
  "white logo card pasted over the scene",
  "hard rectangular shadow behind the product",
  "product cropped past the canvas edge",
  "dominant text panel covering the product story",
];

export const defaultBriefBuilderV2: BriefBuilderV2 = {
  build: buildImageBriefV2,
};

export function buildImageBriefV2(request: BriefBuilderV2Request): ImageBriefV2 {
  const { input, variantIndex, variantCount, briefId } = request;
  const { brandContext } = input;
  const productAsset = input.productAssets[0];

  if (!productAsset) {
    throw new Error("Product asset is required to build ImageBriefV2.");
  }

  const brandText = brandContext.brandName;
  const productText = firstMustIncludeAfterBrand(brandContext.mustInclude, brandText) ?? "SeaTouch 4 Max Plus";
  const headline = shortHeadline(input.contentIntent || "Underwater smartphone ecosystem");
  const textBlocks: TextBlockSpec[] = [
    { role: "brand", text: brandText, priority: "required", editPolicy: "exact" },
    { role: "product_name", text: productText, priority: "required", editPolicy: "exact" },
    { role: "headline", text: headline, priority: "optional", editPolicy: "locked_meaning" },
  ];

  const negativeConstraints = [
    ...DEFAULT_SCENE_AVOIDANCE,
    ...brandContext.avoidWords.map((word) => `avoid word: ${word}`),
    ...brandContext.stylePreferences.avoidStyles.map((style) => `avoid visual style: ${style}`),
  ];

  const userPrompt = [
    `Create a premium branded product visual for ${brandText}.`,
    `Use the product image as a locked visual reference, not as a pasted overlay.`,
    `Keep product structure, proportions, visible marks, phone window, buttons, clamps, lanyard, and material details intact.`,
    `Integrate the product into an ocean creator or underwater workflow scene with coherent light, perspective, and atmosphere.`,
    `Do not draw or invent the official logo; reserve clean space for deterministic logo overlay from the original logo asset.`,
    `Keep the full product inside the canvas safe area; do not crop past the bottom or side edges.`,
    `Avoid rectangular paste shadows, white logo cards, oversized text panels, and template-style UI blocks.`,
    `Use minimal text; the product and scene relationship must carry the image.`,
    `Visual type: cinematic_environment. Story mode: proof_by_context.`,
    `Intent: ${headline}.`,
  ].join(" ");

  return {
    briefId,
    schemaVersion: "m6.0",
    channelFormat: input.channelFormat,
    size: CHANNEL_SIZES[input.channelFormat],
    renderMode: "native_product_reference",
    creativeIntent: headline,
    visualType: "cinematic_environment",
    storyMode: "proof_by_context",
    layoutSpec: {
      safeMarginPx: brandContext.logoRules.safeMarginPx,
      textPlacement: "integrated",
      productPlacement: "scene_foreground",
    },
    textBlocks,
    logoSpec: {
      asset: input.logoAsset,
      strategy: "deterministic_required",
      minWidthPx: brandContext.logoRules.minWidthPx,
      safeMarginPx: brandContext.logoRules.safeMarginPx,
    },
    productSpec: {
      asset: productAsset,
      referenceMode: "reference_locked",
      integrationGoal: "scene_integrated",
      preserveDetails: PRODUCT_DETAILS_TO_PRESERVE,
      maxDistortion: "minor",
      fallback: "overlay_if_failed",
      placementPolicy: {
        safeAreaPx: brandContext.logoRules.safeMarginPx,
        maxCanvasCoverage: 0.62,
        mustStayWithinCanvas: true,
        allowCrop: false,
      },
    },
    sceneSpec: {
      environment: "premium ocean creator workflow, underwater or near-surface marine context",
      lighting: brandContext.stylePreferences.preferredLighting || "coherent premium environmental lighting",
      composition: [
        "product integrated with scene perspective",
        "product remains the primary subject",
        "minimal readable brand text",
        ...brandContext.stylePreferences.preferredComposition,
      ],
      mustAvoid: DEFAULT_SCENE_AVOIDANCE,
    },
    referencePolicy: {
      useBrandApprovedExamples: brandContext.historicalPreferences.approvedExamples.length > 0,
      avoidBrandRejectedExamples: brandContext.historicalPreferences.rejectedExamples.length > 0,
      useGlobalPremiumReferences: true,
    },
    qaPolicy: {
      requireProductReferenceAttached: true,
      requireNativeProductReference: true,
      requireProductNotOverlayOnly: true,
      requireHumanIntegrationReview: true,
    },
    promptPayload: {
      systemPrompt:
        "You are generating a premium brand product image. Respect exact product reference structure and avoid poster-template overlay artifacts.",
      userPrompt,
      negativePrompt: negativeConstraints.join("; "),
    },
    negativeConstraints,
    variantIndex,
    variantCount,
  };
}

function firstMustIncludeAfterBrand(mustInclude: string[], brandName: string): string | undefined {
  return mustInclude.find((term) => term.toLowerCase() !== brandName.toLowerCase());
}

function shortHeadline(intent: string): string {
  const trimmed = intent.trim();
  if (trimmed.length <= 72) return trimmed;
  return `${trimmed.slice(0, 69).trimEnd()}...`;
}
