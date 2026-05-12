import { describe, expect, it } from "vitest";
import {
  PIPELINE_ERROR_CODE,
  QA_ISSUE_CODE,
  QA_ISSUE_SEVERITY,
  QA_STATUS,
  validateGenerationRun,
  type AuroraImagePipelineInput,
  type QAChecker,
} from "../src/contracts/index.js";
import { sampleBrandContext, sampleLogoAsset, sampleProductAsset } from "../src/fixtures/index.js";
import { createMockImage2Adapter, runSingleImagePipeline } from "../src/pipeline/index.js";

const now = () => "2026-05-12T00:00:00.000Z";

function makeInput(generationCount: 1 | 4 = 1): AuroraImagePipelineInput {
  return {
    brandId: sampleBrandContext.brandId,
    campaignName: "M2 launch",
    contentIntent: "Create a premium product poster for Aurora.",
    generationCount,
    channelFormat: "portrait",
    brandContext: sampleBrandContext,
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
  };
}

describe("M2 single-image pipeline", () => {
  it("runs the single-image vertical slice to a valid completed pipeline result", async () => {
    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      now,
    });

    expect(result.jobId).toBe("job_brand_001");
    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("completed");
    expect(result.run.summary).toEqual({ total: 1, passed: 1, failed: 0, retrying: 0, needsHuman: 0 });

    const item = result.run.items[0];
    expect(item?.status).toBe("passed");
    expect(item?.retryCount).toBe(0);
    expect(item?.maxRetries).toBe(3);
    expect(item?.brief.variantCount).toBe(1);
    expect(item?.image?.uri).toContain("asset://mock-image");
    expect(item?.finalImage?.uri).toContain("overlay://final");
    expect(item?.overlayMetadata?.logoApplied).toBe(true);
    expect(item?.qa?.status).toBe(QA_STATUS.PASS);
  });

  it("regenerates after a hard QA failure and returns the passing retry", async () => {
    let checks = 0;
    const qaChecker: QAChecker = {
      check: () => {
        checks += 1;
        if (checks === 1) {
          return {
            status: QA_STATUS.FAIL,
            checkedAt: now(),
            issues: [
              {
                code: QA_ISSUE_CODE.LOGO_SAFE_MARGIN,
                severity: QA_ISSUE_SEVERITY.HARD_FAIL,
                message: "Logo safe margin failed on the first attempt.",
                regenerationHint: "Re-apply deterministic overlay.",
              },
            ],
          };
        }

        return {
          status: QA_STATUS.PASS,
          checkedAt: now(),
          issues: [],
        };
      },
    };

    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      qaChecker,
      now,
      maxRetries: 2,
    });

    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("completed");
    expect(result.run.items[0]?.status).toBe("passed");
    expect(result.run.items[0]?.retryCount).toBe(1);
    expect(result.run.items[0]?.image?.uri).toContain("attempt-1.png");
    expect(checks).toBe(2);
  });

  it("marks a QA failure as needs_human after retry exhaustion", async () => {
    const qaChecker: QAChecker = {
      check: () => ({
        status: QA_STATUS.FAIL,
        checkedAt: now(),
        issues: [
          {
            code: QA_ISSUE_CODE.STYLE_MISMATCH,
            severity: QA_ISSUE_SEVERITY.HARD_FAIL,
            message: "The generated image conflicts with brand style.",
            regenerationHint: "Regenerate with the configured style constraints.",
          },
        ],
      }),
    };

    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter(),
      qaChecker,
      now,
      maxRetries: 2,
    });

    const item = result.run.items[0];
    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("failed");
    expect(item?.status).toBe("needs_human");
    expect(item?.retryCount).toBe(2);
    expect(item?.error?.code).toBe(PIPELINE_ERROR_CODE.RETRY_LIMIT_REACHED);
    expect(item?.issues[0]?.code).toBe(QA_ISSUE_CODE.STYLE_MISMATCH);
  });

  it("maps mock Image-2 adapter rejection to the contract error shape", async () => {
    const result = await runSingleImagePipeline(makeInput(), {
      imageAdapter: createMockImage2Adapter({ rejectAttempts: [0] }),
      now,
    });

    const item = result.run.items[0];
    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.status).toBe("failed");
    expect(item?.status).toBe("failed");
    expect(item?.retryCount).toBe(0);
    expect(item?.error?.code).toBe(PIPELINE_ERROR_CODE.IMAGE_ADAPTER_REJECTED);
  });

  it("rejects generationCount 4 without introducing M2 batch logic", async () => {
    const result = await runSingleImagePipeline(makeInput(4), {
      imageAdapter: createMockImage2Adapter(),
      now,
    });

    const item = result.run.items[0];
    expect(validateGenerationRun(result.run)).toEqual([]);
    expect(result.run.count).toBe(1);
    expect(item?.status).toBe("failed");
    expect(item?.error?.code).toBe(PIPELINE_ERROR_CODE.INVALID_BRAND_CONTEXT);
  });
});
