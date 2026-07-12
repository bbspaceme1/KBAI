#!/bin/bash

# Watch and auto-sync script for bb-space-website
# Monitors file changes and automatically syncs to GitHub

WATCH_DIR="/workspaces/bb-space-website"
SYNC_INTERVAL=300  # 5 minutes

echo "👀 Starting file watcher for auto-sync..."
echo "📁 Watching: $WATCH_DIR"
echo "⏰ Sync interval: $SYNC_INTERVAL seconds"
echo "Press Ctrl+C to stop"

# Function to sync
sync_changes() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Running auto-sync..."
    /workspaces/bb-space-website/auto-sync.sh 2>&1 | tee -a /workspaces/bb-space-website/auto-sync.log
}

# Initial sync
sync_changes

# Watch for changes and sync periodically
while true; do
    sleep $SYNC_INTERVAL

    # Check if there are changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
        sync_changes
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - No changes detected"
    fi
done