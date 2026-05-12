import {
  PIPELINE_ERROR_CODE,
  PIPELINE_STAGE,
  type GeneratedImage,
  type Image2Adapter,
  type Image2GenerationRequest,
  type MockImage2AdapterOptions,
} from "../contracts/index.js";
import { createPipelineError } from "./errors.js";

export function createMockImage2Adapter(options: MockImage2AdapterOptions = {}): Image2Adapter {
  return {
    async generate(request: Image2GenerationRequest): Promise<GeneratedImage> {
      if (options.timeoutAttempts?.includes(request.attempt)) {
        throw createPipelineError(
          PIPELINE_ERROR_CODE.IMAGE_ADAPTER_TIMEOUT,
          PIPELINE_STAGE.IMAGE_ADAPTER,
          "Mock Image-2 adapter timed out.",
          true,
        );
      }

      if (options.rejectAttempts?.includes(request.attempt)) {
        throw createPipelineError(
          PIPELINE_ERROR_CODE.IMAGE_ADAPTER_REJECTED,
          PIPELINE_STAGE.IMAGE_ADAPTER,
          "Mock Image-2 adapter rejected the brief.",
          false,
        );
      }

      const configuredImage = options.images?.[request.attempt];
      if (configuredImage) return configuredImage;

      return {
        imageId: `mock_image_${request.brief.briefId}_attempt_${request.attempt}`,
        uri: `${options.uriPrefix ?? "asset://mock-image"}/${request.brief.briefId}/attempt-${request.attempt}.png`,
        width: request.brief.size.width,
        height: request.brief.size.height,
        format: options.format ?? "png",
      };
    },
  };
}
