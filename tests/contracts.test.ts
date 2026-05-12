import { describe, expect, it } from "vitest";
import { deriveRunStatus, validateExportMetadata, validateGenerationRun } from "../src/contracts/index.js";
import {
  exportMetadataSuccess,
  fourImagePartialFailedRun,
  fourImageSuccessRun,
  singleImageQAFailedRun,
  singleImageRetryExhaustedRun,
  singleImageSuccessRun,
} from "../src/fixtures/index.js";

const runFixtures = [
  singleImageSuccessRun,
  singleImageQAFailedRun,
  singleImageRetryExhaustedRun,
  fourImageSuccessRun,
  fourImagePartialFailedRun,
];

describe("M1 contract fixtures", () => {
  it("validates all generation run fixtures", () => {
    for (const fixture of runFixtures) {
      expect(validateGenerationRun(fixture), fixture.runId).toEqual([]);
    }
  });

  it("models partial_failed as a run-level status with mixed item outcomes", () => {
    expect(fourImagePartialFailedRun.status).toBe("partial_failed");
    expect(fourImagePartialFailedRun.items.some((item) => item.status === "passed")).toBe(true);
    expect(fourImagePartialFailedRun.items.some((item) => item.status === "failed")).toBe(true);
  });

  it("keeps retry state at item level", () => {
    const failedItem = fourImagePartialFailedRun.items.find((item) => item.status === "failed");

    expect(failedItem).toBeDefined();
    expect(failedItem?.retryCount).toBe(2);
    expect(failedItem?.maxRetries).toBe(2);
  });

  it("derives completed, failed, and partial_failed run states from item states", () => {
    expect(deriveRunStatus(fourImageSuccessRun)).toBe("completed");
    expect(deriveRunStatus(singleImageRetryExhaustedRun)).toBe("failed");
    expect(deriveRunStatus(fourImagePartialFailedRun)).toBe("partial_failed");
  });

  it("validates export metadata and links it to run and item ids", () => {
    expect(validateExportMetadata(exportMetadataSuccess)).toEqual([]);
    expect(exportMetadataSuccess.runId).toBe(fourImagePartialFailedRun.runId);
    expect(exportMetadataSuccess.items.map((item) => item.itemId)).toEqual(
      fourImagePartialFailedRun.items.map((item) => item.itemId),
    );
  });
});
