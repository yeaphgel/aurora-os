# Aurora OS

Aurora OS is a Hermes-first brand content generation plugin base.

It provides a testable TypeScript pipeline for:

- brand context input
- brief building
- mockable Image-2 adapter integration
- deterministic logo and product overlay metadata
- named QA checks
- QA-driven regeneration
- preview gallery model
- local export metadata

This repository does not include real publishing integrations, real Image-2 network calls, a content calendar, A/B testing, or a manual design editor.

## Hermes One-Command Install

Use the installer for both first-time install and existing Hermes-side updates.

Linux / macOS:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/yeaphgel/aurora-os/main/scripts/install.sh)"
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/yeaphgel/aurora-os/main/scripts/install.ps1 | iex
```

The installer clones the public repository from:

```text
https://github.com/yeaphgel/aurora-os.git
```

By default it installs to:

```text
~/aurora-os
```

If the target folder already contains an Aurora OS git checkout, the installer runs:

```bash
git pull --ff-only
npm ci
npm run validate
```

This updates the Aurora OS code and dependencies without deleting `_private/` or an external BrandVault.

To choose another folder, set `AURORA_OS_TARGET` before running the installer.

Linux / macOS:

```bash
export AURORA_OS_TARGET="$HOME/Aurora OS"
bash -c "$(curl -fsSL https://raw.githubusercontent.com/yeaphgel/aurora-os/main/scripts/install.sh)"
```

Windows PowerShell:

```powershell
$env:AURORA_OS_TARGET = "$HOME\Aurora OS"
irm https://raw.githubusercontent.com/yeaphgel/aurora-os/main/scripts/install.ps1 | iex
```

## Hermes Update

Run the same command used for install. The installer is update-safe when the target is a git checkout:

Linux / macOS:

```bash
export AURORA_OS_TARGET="$HOME/aurora-os"
bash -c "$(curl -fsSL https://raw.githubusercontent.com/yeaphgel/aurora-os/main/scripts/install.sh)"
```

Windows PowerShell:

```powershell
$env:AURORA_OS_TARGET = "$HOME\aurora-os"
irm https://raw.githubusercontent.com/yeaphgel/aurora-os/main/scripts/install.ps1 | iex
```

For manual updates:

```bash
cd ~/aurora-os
git pull --ff-only
npm ci
npm run validate
```

Private brand data should live in `_private/` or an external `AURORA_BRAND_VAULT` path. `_private/` is ignored by Git and is not pushed to GitHub.

## Check Version

After install or update:

```bash
cd ~/aurora-os
npm run aurora:version
```

Example output:

```text
Aurora OS 0.1.0
branch: main
commit: abc1234
workingTree: clean
```

## Manual Install

```bash
git clone https://github.com/yeaphgel/aurora-os.git
cd aurora-os
npm ci
npm run validate
```

`npm run validate` runs TypeScript type checking and the Vitest test suite.

## Development

```bash
npm run aurora:version
npm run typecheck
npm test
npm run validate
```

## Development Docs

- [M6 Native Brand Visuals Roadmap](docs/m6-roadmap.md) - public M6 roadmap for BrandVault, ImageBriefV2, Hermes-safe upgrades, visual QA, and native text/logo generation strategy.
- [Brand Assets Intake](docs/brand-assets/README.md) - Brand context initialization and asset intake workflow.

Private planning docs live under `_private/`, which is excluded from Git by `.gitignore`.

## Main Folders

```text
src/contracts     Shared contracts, statuses, error codes, validators
src/fixtures      Deterministic sample data
src/pipeline      Brief, adapter, overlay, QA, regeneration, runners
src/gallery       Gallery preview model
src/export        Export metadata and package writer
tests             Contract and pipeline tests
scripts           Install scripts
```

## Minimal Usage

```ts
import {
  createMockImage2Adapter,
  runMultiImagePipeline,
  sampleBrandContext,
  sampleLogoAsset,
  sampleProductAsset,
} from "./src/index.js";

const result = await runMultiImagePipeline(
  {
    brandId: sampleBrandContext.brandId,
    contentIntent: "Create premium product posters for Aurora.",
    generationCount: 4,
    channelFormat: "portrait",
    brandContext: sampleBrandContext,
    logoAsset: sampleLogoAsset,
    productAssets: [sampleProductAsset],
  },
  {
    imageAdapter: createMockImage2Adapter(),
  },
);

console.log(result.run.status);
```
