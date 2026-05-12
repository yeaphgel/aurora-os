import { PIPELINE_ERROR_CODES } from "./errors.js";
import { GENERATION_ITEM_STATUSES, QA_ISSUE_SEVERITIES, QA_STATUSES, RUN_STATUSES } from "./status.js";
import type { ExportMetadata, GenerationRun } from "./types.js";

const runStatusSet = new Set<string>(RUN_STATUSES);
const itemStatusSet = new Set<string>(GENERATION_ITEM_STATUSES);
const qaStatusSet = new Set<string>(QA_STATUSES);
const qaIssueSeveritySet = new Set<string>(QA_ISSUE_SEVERITIES);
const pipelineErrorCodeSet = new Set<string>(PIPELINE_ERROR_CODES);

export function deriveRunSummary(run: Pick<GenerationRun, "items">): GenerationRun["summary"] {
  return run.items.reduce<GenerationRun["summary"]>(
    (summary, item) => {
      summary.total += 1;
      if (item.status === "passed") summary.passed += 1;
      if (item.status === "failed") summary.failed += 1;
      if (item.status === "retrying") summary.retrying += 1;
      if (item.status === "needs_human") summary.needsHuman += 1;
      return summary;
    },
    { total: 0, passed: 0, failed: 0, retrying: 0, needsHuman: 0 },
  );
}

export function deriveRunStatus(run: Pick<GenerationRun, "items">): GenerationRun["status"] {
  if (run.items.length === 0) return "queued";

  const passed = run.items.filter((item) => item.status === "passed").length;
  const failedLike = run.items.filter((item) => item.status === "failed" || item.status === "needs_human").length;
  const active = run.items.some((item) =>
    ["queued", "generating", "generated", "overlaying", "qa_checking", "retrying"].includes(item.status),
  );

  if (active) return "running";
  if (passed === run.items.length) return "completed";
  if (failedLike === run.items.length) return "failed";
  if (passed > 0 && failedLike > 0) return "partial_failed";
  return "failed";
}

export function validateGenerationRun(run: GenerationRun): string[] {
  const issues: string[] = [];

  if (!run.runId) issues.push("run.runId is required");
  if (!runStatusSet.has(run.status)) issues.push(`unknown run.status: ${run.status}`);
  if (run.count !== 1 && run.count !== 4) issues.push("run.count must be 1 or 4");
  if (run.items.length !== run.count) issues.push("run.items length must match run.count");

  const expectedSummary = deriveRunSummary(run);
  if (JSON.stringify(run.summary) !== JSON.stringify(expectedSummary)) {
    issues.push("run.summary does not match item statuses");
  }

  const expectedStatus = deriveRunStatus(run);
  if (run.status !== expectedStatus) {
    issues.push(`run.status should be ${expectedStatus} for current item statuses`);
  }

  for (const item of run.items) {
    if (!item.itemId) issues.push("item.itemId is required");
    if (!item.briefId) issues.push(`${item.itemId}: item.briefId is required`);
    if (!itemStatusSet.has(item.status)) issues.push(`${item.itemId}: unknown status ${item.status}`);
    if (item.retryCount < 0) issues.push(`${item.itemId}: retryCount cannot be negative`);
    if (item.maxRetries < item.retryCount) issues.push(`${item.itemId}: maxRetries cannot be less than retryCount`);

    if (item.error && !pipelineErrorCodeSet.has(item.error.code)) {
      issues.push(`${item.itemId}: unknown error code ${item.error.code}`);
    }

    if (item.qa) {
      if (!qaStatusSet.has(item.qa.status)) issues.push(`${item.itemId}: unknown QA status ${item.qa.status}`);
      for (const qaIssue of item.qa.issues) {
        if (!qaIssueSeveritySet.has(qaIssue.severity)) {
          issues.push(`${item.itemId}: unknown QA issue severity ${qaIssue.severity}`);
        }
      }
    }
  }

  return issues;
}

export function validateExportMetadata(metadata: ExportMetadata): string[] {
  const issues: string[] = [];

  if (!metadata.runId) issues.push("metadata.runId is required");
  if (metadata.project !== "Aurora OS") issues.push("metadata.project must be Aurora OS");
  if (metadata.engine !== "image-2") issues.push("metadata.engine must be image-2");
  if (metadata.generationCount !== 1 && metadata.generationCount !== 4) {
    issues.push("metadata.generationCount must be 1 or 4");
  }
  if (!runStatusSet.has(metadata.status)) issues.push(`unknown metadata.status: ${metadata.status}`);
  if (metadata.items.length !== metadata.generationCount) {
    issues.push("metadata.items length must match metadata.generationCount");
  }

  for (const item of metadata.items) {
    if (!item.itemId) issues.push("metadata item.itemId is required");
    if (!itemStatusSet.has(item.status)) issues.push(`${item.itemId}: unknown export item status ${item.status}`);
    if (item.retryCount < 0) issues.push(`${item.itemId}: retryCount cannot be negative`);
  }

  return issues;
}

