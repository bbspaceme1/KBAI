#!/bin/bash

# Auto-sync script for bb-space-website
# Automatically commits and pushes changes to GitHub

set -e  # Exit on any error

echo "🔄 Starting auto-sync process..."

# Check if there are any changes
if git diff --quiet && git diff --staged --quiet; then
    echo "✅ No changes to sync"
    exit 0
fi

# Add all changes
echo "📁 Adding changes..."
git add .

# Check if there are actually changes to commit
if git diff --staged --quiet; then
    echo "✅ No staged changes to commit"
    exit 0
fi

# Create commit message with timestamp and change summary
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CHANGES=$(git diff --staged --name-only | wc -l)
CHANGED_FILES=$(git diff --staged --name-only | head -5)

if [ "$CHANGES" -eq 1 ]; then
    COMMIT_MSG="auto-sync: $CHANGES file changed - $CHANGED_FILES"
else
    COMMIT_MSG="auto-sync: $CHANGES files changed"
fi

COMMIT_MSG="$COMMIT_MSG ($TIMESTAMP)"

# Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Sync completed successfully!"
echo "📊 Changes: $CHANGES files"
echo "🔗 Commit: $(git rev-parse --short HEAD)"