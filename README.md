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
npm run typecheck
npm test
npm run validate
```

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
