#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/yeaphgel/aurora-os.git"
TARGET="${AURORA_OS_TARGET:-$HOME/aurora-os}"

if [ -d "$TARGET/.git" ]; then
  cd "$TARGET"
  git pull --ff-only
else
  if [ -e "$TARGET" ]; then
    echo "Install target already exists but is not a git repository: $TARGET" >&2
    echo "Set AURORA_OS_TARGET to another folder or move the existing folder first." >&2
    exit 1
  fi

  git clone "$REPO" "$TARGET"
  cd "$TARGET"
fi

npm ci
npm run validate

echo "Aurora OS Hermes plugin base is installed and validated."
