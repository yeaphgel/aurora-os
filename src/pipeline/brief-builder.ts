import type { BriefBuilder, BriefBuilderRequest, ChannelFormat, ImageBrief } from "../contracts/index.js";

const CHANNEL_SIZES: Record<ChannelFormat, ImageBrief["size"]> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1242, height: 1660 },
  landscape: { width: 1600, height: 900 },
  custom: { width: 1080, height: 1080 },
};

export const defaultBriefBuilder: BriefBuilder = {
  build: buildImageBrief,
};

export function buildImageBrief(request: BriefBuilderRequest): ImageBrief {
  const { input, variantIndex, variantCount, briefId } = request;
  const { brandContext } = input;
  const campaignPrefix = input.campaignName ? `${input.campaignName}: ` : "";

  return {
    briefId,
    channelFormat: input.channelFormat,
    size: CHANNEL_SIZES[input.channelFormat],
    imageDirection: [
      `${campaignPrefix}${input.contentIntent}`,
      `brand: ${brandContext.brandName}`,
      `visual style: ${brandContext.visualStyle}`,
      `composition: ${brandContext.stylePreferences.preferredComposition.join(", ")}`,
      `lighting: ${brandContext.stylePreferences.preferredLighting}`,
      `texture: ${brandContext.stylePreferences.preferredTexture}`,
    ].join(" | "),
    copyDirection: [
      `Use ${brandContext.brandName} naturally.`,
      `Tone: ${brandContext.tone}; voice: ${brandContext.toneRules.voice}; emotion: ${brandContext.toneRules.emotion}.`,
      `Must include: ${brandContext.mustInclude.join(", ") || brandContext.brandName}.`,
    ].join(" "),
    brandToneConstraints: [
      `brand name: ${brandContext.brandName}`,
      `tone: ${brandContext.tone}`,
      `voice: ${brandContext.toneRules.voice}`,
      `emotion: ${brandContext.toneRules.emotion}`,
      `formality: ${brandContext.toneRules.formality}`,
      ...brandContext.toneRules.mustFeelLike.map((rule) => `must feel like ${rule}`),
      ...brandContext.toneRules.mustNotFeelLike.map((rule) => `must not feel like ${rule}`),
    ],
    styleConstraints: [
      `visual style: ${brandContext.visualStyle}`,
      `preferred lighting: ${brandContext.stylePreferences.preferredLighting}`,
      `preferred texture: ${brandContext.stylePreferences.preferredTexture}`,
      ...brandContext.stylePreferences.preferredComposition.map((rule) => `composition: ${rule}`),
      ...brandContext.stylePreferences.avoidStyles.map((rule) => `avoid style: ${rule}`),
    ],
    preferenceMemory: {
      useApprovedExamplesAsReference: brandContext.historicalPreferences.approvedExamples.length > 0,
      avoidRejectedExamplePatterns: brandContext.historicalPreferences.rejectedExamples.length > 0,
    },
    negativeConstraints: [
      "do not alter logo",
      "do not invent product packaging",
      ...brandContext.avoidWords.map((word) => `avoid word: ${word}`),
      ...brandContext.stylePreferences.avoidStyles.map((style) => `avoid visual style: ${style}`),
    ],
    variantIndex,
    variantCount,
  };
}
