$ErrorActionPreference = "Stop"

$Repo = "https://github.com/yeaphgel/aurora-os.git"
$Target = if ($env:AURORA_OS_TARGET) { $env:AURORA_OS_TARGET } else { Join-Path $HOME "aurora-os" }

if (Test-Path (Join-Path $Target ".git")) {
  Set-Location $Target
  git pull --ff-only
} else {
  if (Test-Path $Target) {
    Write-Error "Install target already exists but is not a git repository: $Target. Set AURORA_OS_TARGET to another folder or move the existing folder first."
  }

  git clone $Repo $Target
  Set-Location $Target
}

npm ci
npm run validate

Write-Host "Aurora OS Hermes plugin base is installed and validated."
