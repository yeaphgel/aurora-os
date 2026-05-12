# Aurora OS CEO Review - Scope Reduction

Date: 2026-05-12
Mode: SCOPE REDUCTION

## Decision

Aurora OS should start as a Hermes-first brand content plugin, not a full standalone operating system.

The first version should prove one core outcome:

> Given a small or medium brand's assets and rules, Aurora OS can call Image-2 to generate one or multiple brand-aligned content images, apply deterministic brand asset placement, run QA, and present the result for review.

OpenClaw compatibility is a later portability concern. Publisher automation is explicitly out of scope for the first version.

## ICP

Small and medium brand companies that need repeatable daily marketing content but do not have a large in-house design or content operations team.

Primary users:

- Founder/operator
- Marketing manager
- Content operations staff
- Agency operator serving multiple small brands

## Reduced MVP Scope

In scope:

- Hermes plugin first
- Brand context input
- Product and logo asset input
- Single-image generation
- Multi-image batch generation
- Image-2 adapter abstraction
- Deterministic logo/product overlay
- Basic brand QA
- Result gallery / preview
- Export-ready output

Out of scope:

- Real publishing integrations
- Full marketing calendar automation
- Cross-platform scheduling
- OpenClaw-native implementation
- Viral scoring engine
- A/B feedback loop in v1
- Template marketplace
- Multi-brand enterprise admin

## Recommended Architecture

Hermes Runtime
-> Aurora Plugin
-> Brand Context
-> Content Brief Builder
-> Image-2 Adapter
-> Deterministic Overlay
-> QA Checker
-> Preview / Export

## Core Workflow

1. User selects brand profile.
2. User provides campaign or content intent.
3. Aurora builds one or more structured image briefs.
4. Image-2 generates base visual content.
5. Overlay system places logo and product assets deterministically.
6. QA checks brand presence, product presence, text constraints, and basic visual compliance.
7. User reviews generated single or multi-image output.
8. User exports or manually uses the output.

## QA Scope

MVP QA should be practical and enforceable:

- Logo exists in required region
- Product asset exists in required region
- Output dimensions match selected format
- Generated text, if present, passes OCR comparison
- Forbidden words are absent
- Brand colors are approximately respected
- File generation completed successfully

QA should return:

- pass
- fail
- warning

Each issue should include a named reason and a user-readable explanation.

## A/B Feedback Scope

A/B feedback should be separated into a later cycle.

Cycle 1:

- Generate content
- QA content
- Preview/export content

Cycle 2:

- Save variants
- Track manual performance inputs
- Compare winning directions

Cycle 3:

- Add automated scoring and optimization

## Strongest Challenges

1. The first release must not become a full content OS. It should validate brand-constrained image generation.
2. Hermes should be treated as the primary host. OpenClaw should not shape v1 implementation unless compatibility is cheap.
3. QA must be concrete. "Brand consistency" is not a test unless it becomes named checks with thresholds.
4. Publishing is a distraction for v1. Preview/export is enough to prove value.
5. Multi-image generation should reuse the single-image pipeline rather than introduce a separate workflow.

## Recommended Next Step

Rewrite the PRD into a Hermes-first MVP spec with:

- One primary user journey
- One plugin entry point
- Brand context schema
- Image generation request/response contract
- Overlay rules
- QA result schema
- Acceptance criteria for single and multi-image generation

