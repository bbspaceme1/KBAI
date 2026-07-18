# v0 Auto-Fix System - Quick Start

## What You Now Have

A fully autonomous error detection and fixing system that:

1. Monitors Vercel deployments every 10 minutes
2. Detects build errors and deployment issues
3. Automatically runs diagnostics and applies fixes
4. Commits and pushes changes to GitHub
5. Triggers automatic redeploy
6. Loops back to step 1 - **no human intervention needed**

## Quick Setup (5 minutes)

### Step 1: Get Your Vercel Credentials

```bash
# Get your Vercel token (read-only, deployment access)
# Visit: https://vercel.com/account/tokens
# Copy the token

# Get your org/project IDs
npx vercel whoami
npx vercel project list
```

### Step 2: Add GitHub Secrets

In your GitHub repo > Settings > Secrets and variables > Actions, add:

```
VERCEL_PERSONAL_ACCESS_TOKEN  = (your token from above)
VERCEL_ORG_ID                 = (your org ID)
VERCEL_PROJECT_ID             = (your project ID)
```

### Step 3: Done! The system is active

The workflow will run every 10 minutes automatically.

## Test It Locally

```bash
# Check for issues (no changes applied)
npm run auto-fix:check

# Auto-fix all issues and commit
npm run auto-fix

# Monitor Vercel deployment
npm run monitor:vercel

# Check current deployment status
npm run monitor:check
```

## How to Monitor

### In GitHub Actions

1. Go to your repo > Actions tab
2. Select "Auto Monitor & Fix Deployment Issues"
3. Watch it run every 10 minutes
4. See detailed logs for each check

### In Your Terminal

```bash
# Watch deployment status in real-time
npm run monitor:vercel
```

## What It Automatically Fixes

✓ **Auto-Fixed:**

- Code formatting issues (Prettier)
- Import organization (ESLint)
- Common linting violations

⚠️ **Flagged for Review:**

- Circular dependencies
- Bundle size issues
- TypeScript type errors

## The Loop Explained

```
┌─────────────────────────────────────────────────┐
│ Every 10 minutes:                               │
│ 1. Check Vercel deployment status               │
│ 2. Get build logs                               │
│ 3. Analyze for errors                           │
│ 4. Run auto-fix diagnostics                     │
│ 5. Apply auto-fixes                             │
│ 6. Commit & push if changes                     │
│ 7. Vercel auto-deploys                          │
│ 8. Back to step 1...                            │
└─────────────────────────────────────────────────┘
```

## Customization

### Run Every 5 Minutes (faster)

Edit `.github/workflows/auto-monitor-and-fix.yml`:

```yaml
schedule:
  - cron: "*/5 * * * *" # Changed from */10
```

### Run Every Hour (slower)

```yaml
schedule:
  - cron: "0 * * * *"
```

### Run Only on Manual Trigger

Remove the schedule and keep only workflow_dispatch:

```yaml
on:
  workflow_dispatch:
    inputs:
      force_check:
        description: "Force check deployment status"
```

## Troubleshooting

### Workflow not running?

1. Check Actions are enabled in repo settings
2. Verify secrets are set (typo-free)
3. Check workflow syntax in GitHub Actions

### Getting too many commits?

1. Increase interval from 10 to 30 minutes
2. Or run manual fixes with `npm run auto-fix` locally

### Want to disable it?

Rename `.github/workflows/auto-monitor-and-fix.yml` to `.github/workflows/auto-monitor-and-fix.yml.disabled`

## Full Documentation

See `AUTO_FIX_SETUP.md` for complete setup and advanced options.

## All Available Commands

```bash
npm run type-check          # TypeScript type checking
npm run auto-fix:check      # Diagnostic report (read-only)
npm run auto-fix            # Apply all auto-fixes and commit
npm run monitor:vercel      # Watch Vercel status (polling)
npm run monitor:check       # Check latest deployment once
npm run monitor:report      # Get full deployment analysis
```

## That's It!

Your system is now continuously monitoring and self-healing.
Check the Actions tab in GitHub to watch it work.
