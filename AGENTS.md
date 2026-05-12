# AGENTS.md

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
- `/office-hours` — structured office hours session
- `/plan-ceo-review` — CEO-level plan review
- `/plan-eng-review` — engineering plan review
- `/plan-design-review` — design plan review
- `/design-consultation` — design consultation
- `/design-shotgun` — rapid design exploration
- `/design-html` — HTML/CSS design work
- `/review` — code review
- `/ship` — ship a feature end-to-end
- `/land-and-deploy` — land and deploy changes
- `/canary` — canary deployment
- `/benchmark` — run benchmarks
- `/browse` — web browsing
- `/connect-chrome` — connect to Chrome browser
- `/qa` — QA with browsing
- `/qa-only` — QA without code changes
- `/design-review` — design review
- `/setup-browser-cookies` — set up browser cookies
- `/setup-deploy` — set up deployment
- `/setup-gbrain` — set up gbrain
- `/retro` — retrospective
- `/investigate` — investigate an issue
- `/document-release` — document a release
- `/codex` — codex agent
- `/cso` — CSO review
- `/autoplan` — auto-generate a plan
- `/plan-devex-review` — developer experience plan review
- `/devex-review` — developer experience review
- `/careful` — careful/cautious mode
- `/freeze` — freeze changes
- `/guard` — guard mode
- `/unfreeze` — unfreeze changes
- `/gstack-upgrade` — upgrade gstack
- `/learn` — learning session

## Project Mission

Build Aurora OS as a Hermes-first brand content generation plugin.

The MVP pipeline is:

Brand Context
-> Brief Builder
-> Image-2 Adapter
-> Deterministic Overlay
-> QA Checker
-> Pipeline Result
-> Gallery
-> Export

## Current Scope

Only implement up to the current milestone. Do not implement future milestones early.

MVP includes:
- Hermes plugin entry contract
- Brand context input
- logo and product asset input
- single-image generation
- mockable Image-2 adapter boundary
- deterministic logo/product overlay
- named QA checks
- QA-driven regeneration
- preview gallery
- export metadata
- later multi-image hardening by reusing the single-item runner

MVP excludes:
- real publishing integrations
- content calendar
- A/B testing
- viral scoring
- OpenClaw-native implementation
- enterprise multi-brand admin
- template marketplace
- manual design editor

## Milestone Rules

### M0 Repo Scaffold

Allowed:
- local git repo
- package metadata
- TypeScript config
- test runner config
- source and test directories
- this `AGENTS.md`

Forbidden:
- business pipeline logic
- UI
- real Image-2 calls
- multi-image orchestration

### M1 Contract Freeze

Allowed:
- shared types
- runtime contracts
- error codes
- sample fixtures
- contract validation helpers
- unit tests

Forbidden:
- UI
- gallery
- export writer
- real Image-2 calls
- overlay implementation
- QA scoring implementation
- regeneration loop
- multi-image runner

### M2 Single Image Vertical Slice

Allowed:
- brief builder
- mock Image-2 adapter
- overlay engine
- deterministic QA checker
- single-image runner
- pipeline result

Forbidden:
- multi-image batch logic
- export writer
- gallery UI
- publishing
- calendar
- A/B testing
- OpenClaw integration

## Architecture Rules

- Contract-first development.
- Every module must consume shared contract types from `src/contracts`.
- No module may redefine shared enums, statuses, error codes, or result shapes.
- Run-level status is aggregate state; item-level status owns the real item outcome.
- `partial_failed` must be represented as a run-level status.
- `retryCount` and `maxRetries` must live on each generation item.
- Use deterministic fixtures for tests.
- All errors must map to known error codes.
- No hidden string statuses.
- No real network calls in tests.
- Use dependency injection for adapters.
- Multi-image logic must reuse the single-image item runner.

## Review Guidelines

Flag as P1:
- duplicated contract type
- uncategorized error
- hidden string status
- module depending on another module's internal implementation
- multi-image logic introduced before M2 is complete
- UI implementation before pipeline result is stable
- real Image-2 call in tests
- missing contract tests for success, failure, retry, partial failure, or export metadata

