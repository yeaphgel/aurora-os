import type {
  BriefBuilderV2,
  BriefBuilderV2Request,
  ChannelFormat,
  DeterministicLogoBlockSpec,
  DeterministicOverlayPlan,
  ImageBriefV2,
  NativeTextBlockSpec,
  OverlayPosition,
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
  "generated official logo or symbol on mask, gloves, suit, or product surfaces",
  "model-generated official logo symbol",
  "extra DIVEVOLK marks outside deterministic overlay areas",
  "white card behind the official logo",
  "native text covering the product or product model marks",
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
  const productText = normalizeProductName(firstMustIncludeAfterBrand(brandContext.mustInclude, brandText) ?? "SeaTouch 4 Max Plus");
  const headline = "Touch the future";
  const supportingText = shortHeadline(input.contentIntent || "Underwater smartphone ecosystem");
  const size = CHANNEL_SIZES[input.channelFormat];
  const overlayPlan = buildDeterministicOverlayPlan({
    size,
    logoAsset: input.logoAsset,
    logoPosition: brandContext.logoRules.position,
    safeMarginPx: brandContext.logoRules.safeMarginPx,
    minWidthPx: brandContext.logoRules.minWidthPx,
  });
  const textBlocks: TextBlockSpec[] = [
    { role: "headline", text: headline, priority: "required", editPolicy: "exact" },
    { role: "product_name", text: productText, priority: "required", editPolicy: "exact" },
    { role: "subhead", text: supportingText, priority: "recommended", editPolicy: "locked_meaning" },
  ];
  const nativeTextBlocks = buildNativeTextBlocks(textBlocks);
  const deterministicLogoBlocks: DeterministicLogoBlockSpec[] = [
    {
      role: "official_logo",
      asset: input.logoAsset,
      strategy: "deterministic_required",
      bounds: overlayPlan.logo.bounds,
      safeMarginPx: brandContext.logoRules.safeMarginPx,
      preserveAspectRatio: true,
    },
  ];

  const negativeConstraints = [
    ...DEFAULT_SCENE_AVOIDANCE,
    ...brandContext.avoidWords.map((word) => `avoid word: ${word}`),
    ...brandContext.stylePreferences.avoidStyles.map((style) => `avoid visual style: ${style}`),
  ];

  const image2Prompt = [
    `Create a premium photographic branded product visual for ${brandText}.`,
    `Use the product image as a locked visual reference, not as a pasted overlay.`,
    `Keep product structure, proportions, visible marks, phone window, buttons, clamps, lanyard, and material details intact.`,
    `Integrate the product into an ocean creator or underwater workflow scene with coherent light, perspective, and atmosphere.`,
    `Do not draw or invent the official ${brandText} logo, official symbol, or logo lockup; reserve a clean low-detail area for the original logo asset at ${overlayPlan.logo.position}.`,
    `Use Image 2 native typography only for these exact text blocks: "${headline}", "${productText}", and "${supportingText}".`,
    `Place native typography as integrated poster text with premium spacing, clear hierarchy, and no product overlap.`,
    `Native typography must stay under 18% of canvas height and must not cover the product, phone window, lanyard, model marks, or important scene details.`,
    `Keep the full product inside the canvas safe area; do not crop past the bottom or side edges.`,
    `Avoid rectangular paste shadows, white logo cards, oversized text panels, vector-programmatic backgrounds, and template-style UI blocks.`,
    `Use a cinematic underwater photographic scene; avoid flat procedural waves, large artificial light bars, and purely graphic compositor style.`,
    `Visual type: cinematic_environment. Story mode: proof_by_context.`,
    `Intent: ${supportingText}.`,
  ].join(" ");
  const backgroundPrompt = image2Prompt;
  const overlayInstruction = [
    `Apply the original logo asset ${input.logoAsset.assetId} deterministically after Image 2 generation.`,
    `Logo bounds: x=${overlayPlan.logo.bounds.x}, y=${overlayPlan.logo.bounds.y}, width=${overlayPlan.logo.bounds.width}, height=${overlayPlan.logo.bounds.height}.`,
    `Preserve the logo asset aspect ratio and transparent background; do not use a white logo card.`,
    `Do not overlay headline, product name, or subhead; those text blocks are generated by Image 2 native typography and verified by OCR.`,
    `Do not accept model-generated logos or symbols as official logo output.`,
  ].join(" ");
  const userPrompt = [image2Prompt, overlayInstruction].join(" ");

  return {
    briefId,
    schemaVersion: "m6.0",
    channelFormat: input.channelFormat,
    size,
    renderMode: "native_product_reference",
    textStrategy: "native_image2_typography",
    logoStrategy: "deterministic_required",
    creativeIntent: supportingText,
    visualType: "cinematic_environment",
    storyMode: "proof_by_context",
    layoutSpec: {
      safeMarginPx: brandContext.logoRules.safeMarginPx,
      textPlacement: "integrated",
      productPlacement: "scene_foreground",
    },
    textBlocks,
    nativeTextBlocks,
    deterministicLogoBlocks,
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
      forbidGeneratedBrandMarksOutsideOverlay: true,
      requireLogoReservedZoneClean: true,
      requireNativeTextOcr: true,
      maxNativeTextCoverage: 0.18,
    },
    overlayPlan,
    logoOverlayPlan: overlayPlan,
    promptPayload: {
      systemPrompt:
        "You are generating a premium Image 2 product advertisement. Use native typography for approved text, never generate the official logo, and respect exact product reference structure.",
      backgroundPrompt,
      image2Prompt,
      userPrompt,
      overlayInstruction,
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

function normalizeProductName(productName: string): string {
  return productName.replace(/SeaTouch 4 Max Plus/i, "SeaTouch 4 Max+");
}

function buildNativeTextBlocks(textBlocks: TextBlockSpec[]): NativeTextBlockSpec[] {
  return textBlocks.map((block) => ({
    ...block,
    renderStrategy: "native_image2_typography",
    ocrPolicy: block.priority === "required" ? "hard_fail_if_wrong" : "warning_if_wrong",
    maxCoverageRatio: block.role === "headline" ? 0.1 : 0.04,
    mustNotOccludeProduct: true,
  }));
}

function buildDeterministicOverlayPlan(request: {
  size: ImageBriefV2["size"];
  logoAsset: DeterministicOverlayPlan["logo"]["asset"];
  logoPosition: OverlayPosition;
  safeMarginPx: number;
  minWidthPx: number;
}): DeterministicOverlayPlan {
  const logoWidth = Math.max(request.minWidthPx, Math.round(request.size.width * 0.34));
  const logoHeight = Math.round(logoWidth * 0.24);
  const logoBounds = positionBounds(request.logoPosition, request.size, logoWidth, logoHeight, request.safeMarginPx);
  const reservePadding = Math.round(request.safeMarginPx * 0.5);
  const reservedZone = {
    x: clamp(logoBounds.x - reservePadding, 0, request.size.width),
    y: clamp(logoBounds.y - reservePadding, 0, request.size.height),
    width: Math.min(logoBounds.width + reservePadding * 2, request.size.width),
    height: Math.min(logoBounds.height + reservePadding * 2, request.size.height),
  };

  return {
    strategy: "deterministic_logo_only",
    logo: {
      asset: request.logoAsset,
      position: request.logoPosition,
      bounds: logoBounds,
      preserveAspectRatio: true,
    },
    reservedZone: {
      bounds: reservedZone,
      requireLowComplexity: true,
      allowWhiteCard: false,
      minContrastRatio: 4.5,
    },
    text: [],
    forbiddenGeneratedTextZones: [
      "gear",
      "mask",
      "gloves",
      "suit",
      "product surfaces",
      "reefs",
      "water",
      "background objects",
    ],
  };
}

function positionBounds(
  position: OverlayPosition,
  size: ImageBriefV2["size"],
  width: number,
  height: number,
  margin: number,
): DeterministicOverlayPlan["logo"]["bounds"] {
  switch (position) {
    case "top_left":
      return { x: margin, y: margin, width, height };
    case "top_right":
      return { x: size.width - width - margin, y: margin, width, height };
    case "bottom_left":
      return { x: margin, y: size.height - height - margin, width, height };
    case "bottom_right":
      return { x: size.width - width - margin, y: size.height - height - margin, width, height };
    case "center":
      return {
        x: Math.round((size.width - width) / 2),
        y: margin,
        width,
        height,
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
