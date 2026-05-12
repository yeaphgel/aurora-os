export const RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "partial_failed",
  "failed",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export const RUN_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  PARTIAL_FAILED: "partial_failed",
  FAILED: "failed",
} as const satisfies Record<string, RunStatus>;

export const GENERATION_ITEM_STATUSES = [
  "queued",
  "generating",
  "generated",
  "overlaying",
  "qa_checking",
  "passed",
  "failed",
  "retrying",
  "needs_human",
] as const;

export type GenerationItemStatus = (typeof GENERATION_ITEM_STATUSES)[number];

export const GENERATION_ITEM_STATUS = {
  QUEUED: "queued",
  GENERATING: "generating",
  GENERATED: "generated",
  OVERLAYING: "overlaying",
  QA_CHECKING: "qa_checking",
  PASSED: "passed",
  FAILED: "failed",
  RETRYING: "retrying",
  NEEDS_HUMAN: "needs_human",
} as const satisfies Record<string, GenerationItemStatus>;

export const QA_STATUSES = ["pass", "warning", "fail"] as const;

export type QAStatus = (typeof QA_STATUSES)[number];

export const QA_STATUS = {
  PASS: "pass",
  WARNING: "warning",
  FAIL: "fail",
} as const satisfies Record<string, QAStatus>;

export const QA_ISSUE_SEVERITIES = ["info", "warning", "hard_fail"] as const;

export type QAIssueSeverity = (typeof QA_ISSUE_SEVERITIES)[number];

export const QA_ISSUE_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  HARD_FAIL: "hard_fail",
} as const satisfies Record<string, QAIssueSeverity>;
