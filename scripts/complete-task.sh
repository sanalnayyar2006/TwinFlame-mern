#!/bin/bash

set -e

echo ""
echo "======================================"
echo " TwinFlame Task Completion "
echo "======================================"
echo ""

echo "Running TypeScript..."
pnpm typecheck

echo ""
echo "Running ESLint..."
pnpm lint

echo ""
echo "Building Project..."
pnpm build

echo ""
echo "Staging changes..."
git add .

echo ""
echo "Staged files:"
git status --short
echo ""

read -p "Enter commit message: " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Commit cancelled. No message provided."
    exit 1
fi

echo ""
echo "Creating commit..."
git commit -m "$COMMIT_MSG"

echo ""
echo "✅ Commit created successfully!"
echo ""
git log --oneline -1

echo ""
echo "Push when ready:"
echo "git push origin main"