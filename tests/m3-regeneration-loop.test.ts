import { describe, expect, it } from "vitest";
import {
  PIPELINE_ERROR_CODE,
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  validateGenerationRun,
  type AuroraImagePipelineInput,
  type Image2Adapter,
  type ImageBrief,
  type QAChecker,
} from "../src/contracts/index.js";
import { sampleBrandContext, sampleLogoAsset, sampleProductAsset } from "../src/fixtures/index.js";
import { createMockImage2Adapter, runSingleImagePipeline } from "../src/pipeline/index.js";

const now = () => "2026-05-12T00:00:00.000Z";

function makeInput(): AuroraImagePipelineInput {
  return {
    brandId: sampleBrandContext.brandId,
    campaignName: "M3 regeneration",
    contentIntent: "Create a premium product poster for Aurora.",
    generationCount: 1,
    channelFormat: "portrait",
    brandContext: sampleBrandContext,
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
  };
}

describe("M3 regeneration loop", () => {
  it("adjusts the failed brief from QA issues before retrying", async () => {
    const generatedBriefs: ImageBrief[] = [];
    const mockAdapter = createMockImage2Adapter();
    const imageAdapter: Image2Adapter = {
      generate: async (request) => {
        generatedBriefs.push(request.brief);
        return mockAdapter.generate(request);
      },
    };
    const qaChecker: QAChecker = {
      check: (request) => {
        const adjusted = request.brief.negativeConstraints.some((constraint) =>
          constraint.includes("must preserve configured logo safe margin"),
        );

        return adjusted
          ? {
              status: QA_STATUS.PASS,
              checkedAt: now(),
              issues: [],
            }
          : {
              status: QA_STATUS.FAIL,
              checkedAt: now(),
              issues: [
                {
                  code: QA_ISSUE_CODE.LOGO_SAFE_MARGIN,
                  severity: QA_ISSUE_SEVERITY.HARD_FAIL,
                  message: "Logo safe margin failed.",
                  regenerationHint: "Re-apply logo overlay using brandContext.logoRules.",
                },
              ],
            };
      },
    };

    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter,
      qaChecker,
      now,
    });

    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("completed");
    expect(result.run.items[0]?.retryCount).toBe(1);
    expect(generatedBriefs).toHaveLength(2);
    expect(generatedBriefs[0]?.negativeConstraints).not.toContain("must preserve configured logo safe margin");
    expect(generatedBriefs[1]?.negativeConstraints).toContain("must preserve configured logo safe margin");
    expect(result.run.items[0]?.brief.negativeConstraints).toContain("must preserve configured logo safe margin");
  });

  it("uses three default single-image retries before human intervention", async () => {
    const qaChecker: QAChecker = {
      check: () => ({
        status: QA_STATUS.FAIL,
        checkedAt: now(),
        issues: [
          {
            code: QA_ISSUE_CODE.FORBIDDEN_WORD_DETECTED,
            severity: QA_ISSUE_SEVERITY.HARD_FAIL,
            message: "Forbidden word detected.",
            regenerationHint: "Remove forbidden words from generated copy direction.",
          },
        ],
      }),
    };

    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      qaChecker,
      now,
    });

    const item = result.run.items[0];
    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("failed");
    expect(item?.status).toBe("needs_human");
    expect(item?.retryCount).toBe(3);
    expect(item?.maxRetries).toBe(3);
    expect(item?.error?.code).toBe(PIPELINE_ERROR_CODE.RETRY_LIMIT_REACHED);
  });
});
