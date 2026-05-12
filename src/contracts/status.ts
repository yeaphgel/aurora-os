export const RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "partial_failed",
  "failed",
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

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

export const QA_STATUSES = ["pass", "warning", "fail"] as const;

export type QAStatus = (typeof QA_STATUSES)[number];

export const QA_ISSUE_SEVERITIES = ["info", "warning", "hard_fail"] as const;

export type QAIssueSeverity = (typeof QA_ISSUE_SEVERITIES)[number];

