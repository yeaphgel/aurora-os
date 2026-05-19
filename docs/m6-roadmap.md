# M6 Native Brand Visuals Roadmap

M6 is the Aurora OS upgrade path for Hermes-driven brand visual generation. This public roadmap only documents non-private capability boundaries; private brand plans, brand assets, rejected examples, and local QA notes remain under `_private/`, which is ignored by Git.

## Phase 1 Status

Implemented in `0.2.0`:

- `ImageBriefV2` contract for native product reference generation.
- `Image2AdapterV2` injection boundary for Hermes-owned GPT-Image 2 calls.
- `runSingleImagePipelineV2(input, { imageAdapterV2 })` single-image runner.
- Product-reference QA metadata that prevents silent fallback to the old overlay-only path.
- Regression coverage that confirms the product asset reaches the injected adapter.

Implemented in `0.3.0`:

- Verifiable `modelInvocation` metadata for GPT-Image calls.
- Deterministic logo overlay as the default M6 logo strategy.
- Product placement policy for safe area, crop prevention, and canvas coverage.
- M6 QA checks for missing model invocation, missing product image input, missing logo overlay, out-of-bounds products, paste artifacts, lighting mismatch, and text panel dominance.

Implemented in `0.4.0`:

- M6.3 native Image 2 typography strategy: Image 2 may render approved headline, product name, and subhead text.
- Exact official logo strategy: the image model must reserve a clean logo zone, then Hermes/Aurora applies the original logo asset deterministically.
- Split prompt payloads: `image2Prompt` for photographic product-scene generation and native text layout, plus `overlayInstruction` for exact logo asset application.
- `logoOverlayPlan`, `nativeTextBlocks`, and `deterministicLogoBlocks` in `ImageBriefV2` so Hermes can separate generated typography from official logo compositing.
- M6 QA checks for unauthorized generated brand marks, dirty logo reserved zones, native text OCR mismatches, text covering product, overlay fallback, and product-scene lighting mismatch.

## Goal

Move Aurora OS from a deterministic brand image pipeline toward a structured native brand visual system:

- BrandVault-backed visual memory.
- `ImageBriefV2` with layout, text, logo, product, scene, reference, and QA policy fields.
- Native text/logo/product generation strategy for image models.
- Deterministic overlay fallback for exact logos and compliance text.
- Visual QA for OCR text, logo recognition, product integrity, layout safe areas, brand color alignment, and export readiness.
- Hermes-safe install and update flow that updates code without deleting existing brands.

## Reference Policy

M6 separates reference material into explicit categories:

| Type | Purpose |
| --- | --- |
| `brand_approved` | Same-brand examples explicitly approved by the user. |
| `brand_rejected` | Same-brand examples explicitly rejected by the user. |
| `global_premium_reference` | Cross-brand high-quality references used only for abstract visual learning. |
| `global_negative_reference` | Cross-brand negative references used only for avoidance rules. |

Cross-brand examples must not become a brand's approved examples automatically.

## Visual Types

M6 will classify branded product visuals before generation:

- `hero_packshot`
- `cinematic_environment`
- `lifestyle_identity`
- `creator_workbench`
- `technical_precision`
- `ecosystem_layout`
- `use_case_proof`
- `macro_material`
- `before_after_compare`
- `brand_symbol_world`
- `editorial_story_panel`
- `retail_conversion_card`

## Story Modes

M6 will classify story structure separately from visual style:

- `problem_solution`
- `journey_transition`
- `workflow_steps`
- `hero_mission`
- `identity_projection`
- `upgrade_announcement`
- `proof_by_context`
- `ritual_of_use`
- `anatomy_explainer`
- `ecosystem_story`
- `aspirational_world`
- `comparison_claim`

## Implementation Slices

1. Schema: `VisualMemory`, `ImageBriefV2`, visual type and story mode contracts.
2. BrandVault: local brand storage, migration, and reference categorization.
3. Brief Builder V2: structured brief generation from brand context and visual memory.
4. Image adapter: live adapter boundary with mock-first testability.
5. Visual QA: OCR, logo, product, layout, color, rejected-reference, and export checks.
6. Repair loop: targeted text/logo/product/layout/color repair.
7. Hermes tools: stable JSON tool contracts for brand read/update, generate, QA, repair, rank, export, and upgrade.
8. Upgrade: dry-run and apply flows that preserve existing brands.
