# v0 Autonomous Error Detection & Auto-Fix System

This document explains how to setup and use the autonomous error detection and auto-fix system that allows v0 to loop through errors and execute fixes automatically.

## System Overview

The auto-fix system has 3 tiers:

1. **GitHub Actions Workflow** (`auto-monitor-and-fix.yml`)
   - Runs every 10 minutes
   - Monitors Vercel deployment status via API
   - Detects build and deployment errors
   - Triggers auto-fix engine

2. **Auto-Fix Engine** (`scripts/auto-fix-engine.js`)
   - Comprehensive diagnostics: TypeScript, linting, build, dependencies
   - Detects circular dependencies, bundle size issues, env vars
   - Auto-fixes linting issues with Prettier
   - Flags manual-review items (circular deps, bundle optimization)

3. **Vercel Monitor** (`scripts/vercel-monitor.js`)
   - Real-time deployment monitoring
   - Polls Vercel API for deployment status
   - Parses build logs for errors
   - Triggers alerts when unhealthy

## Setup Instructions

### Step 1: Configure GitHub Secrets

Add these to your GitHub repository settings (Settings > Secrets and variables > Actions):

```
VERCEL_PERSONAL_ACCESS_TOKEN  = Your Vercel Personal Access Token (get from https://vercel.com/account/tokens)
VERCEL_ORG_ID                 = Your Vercel organization ID
VERCEL_PROJECT_ID             = Your Vercel project ID (from project settings)
```

**How to get these values:**

- **VERCEL_PERSONAL_ACCESS_TOKEN**:

  ```bash
  # Go to https://vercel.com/account/tokens
  # Create a new Personal Access Token
  # Recommended scopes: read deployments, read project settings
  ```

- **VERCEL_ORG_ID**:

  ```bash
  npx vercel teams list  # Find your team/org ID
  ```

- **VERCEL_PROJECT_ID**:
  ```bash
  # From project settings: https://vercel.com/[team]/[project]/settings
  # Or run: npx vercel project list
  ```

### Step 2: Enable Workflow

The workflow file is already created at `.github/workflows/auto-monitor-and-fix.yml`

It will run automatically:

- Every 10 minutes on schedule
- On manual trigger via GitHub Actions UI

### Step 3: Test Setup Locally

Test the auto-fix engine:

```bash
# Check for issues (no fixes applied)
npm run auto-fix:check

# Run full diagnostics and auto-fix all auto-fixable issues
npm run auto-fix

# Monitor Vercel deployment (polling every 30 seconds)
npm run monitor:vercel

# Check latest deployment status once
npm run monitor:check

# Get full deployment report with logs
npm run monitor:report
```

## How It Works

### Auto-Fix Loop

```
GitHub Actions Workflow (every 10 min)
  ↓
1. Fetch latest deployment from Vercel API
2. Get build logs and parse for errors
3. If deployment NOT READY or errors found:
   ↓
4. Run Auto-Fix Engine diagnostics
   - Check TypeScript types
   - Check linting
   - Check build
   - Check circular dependencies
   - Check bundle size
   - Check env variables
   ↓
5. Apply auto-fixes:
   - Prettier formatting fixes
   - Type definition fixes (manual flag)
   - Build optimization (manual flag)
   ↓
6. If changes made:
   - Commit with detailed message
   - Push to main
   - Vercel auto-deploys
   - Loop returns to step 1
```

### Manual vs Automated Fixes

**Auto-Fixed (by Prettier & linting tools):**

- Code formatting issues
- Import organization
- Linting rule violations

**Flagged for Manual Review (marked in commits):**

- Circular dependency issues (require refactoring)
- Bundle size optimization (requires code review)
- TypeScript type errors (context-dependent)
- Build failures (need investigation)

**Environment Issues (manual setup):**

- Missing environment variables
- Secret configuration

## Monitoring Output

When the workflow runs, you'll see:

1. **Successful Run:**

   ```
   Deployment State: READY
   Deployment Error: (none)
   Needs Fix: false
   ✓ Auto-monitor workflow completed
   ```

2. **Auto-Fixed Issues:**

   ```
   Deployment State: FAILED
   Deployment Error: Linting errors
   Needs Fix: true
   Changes Committed: true
   ✓ Auto-fixes applied and pushed to main
   ```

3. **Manual Review Issues:**
   ```
   Needs Fix: true
   Changes Committed: false
   ⚠️ Issues flagged for manual review
   → GitHub issue created for critical errors
   ```

## Customization

### Change Monitoring Frequency

Edit `.github/workflows/auto-monitor-and-fix.yml`:

```yaml
schedule:
  # Run every 5 minutes (more frequent)
  - cron: "*/5 * * * *"

  # Run every hour
  - cron: "0 * * * *"

  # Run at 2 AM UTC daily
  - cron: "0 2 * * *"
```

### Add Custom Diagnostics

Edit `scripts/auto-fix-engine.js` and add methods to the `AutoFixEngine` class:

```javascript
async checkCustomRule() {
  try {
    // Your custom check logic
    console.log("✓ Custom check passed");
  } catch (error) {
    this.issues.push({
      type: "custom-rule",
      severity: "high",
      message: "Custom rule violation",
      details: error.message
    });
  }
}
```

Then add to `runFullDiagnostics()`:

```javascript
await this.checkCustomRule();
```

### Adjust Alert Threshold

In `scripts/vercel-monitor.js`, change the consecutive error check:

```javascript
if (consecutiveErrors >= 3) {
  // Change 3 to your threshold
  console.log("\n⚠️  ALERT: Deployment unhealthy");
}
```

## Troubleshooting

### Workflow not triggering

- Check GitHub Actions are enabled in repo settings
- Verify secrets are set correctly
- Check workflow syntax with `GitHub Actions` linter

### Vercel API errors

- Verify `VERCEL_TOKEN` is valid (check expiry)
- Confirm `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Token needs read access to deployments

### Auto-fix not applying

- Run `npm run auto-fix:check` locally to debug
- Check workflow logs in GitHub Actions
- Verify file permissions and git config

### Too many commits

- Increase workflow interval (e.g., every 30 minutes instead of 10)
- Implement fix batching to combine multiple issues

## Integrating with v0

To make v0 aware of this system:

1. **v0 can check deployment status:**

   ```bash
   npm run monitor:check
   ```

2. **v0 can run diagnostics:**

   ```bash
   npm run auto-fix:check
   ```

3. **v0 can execute fixes and deploy:**

   ```bash
   npm run auto-fix
   # This will auto-commit and push if changes exist
   ```

4. **v0 can poll for issues:**
   ```bash
   npm run monitor:report
   # Provides detailed deployment report for analysis
   ```

## Next Steps

1. Configure GitHub Secrets (Step 1)
2. Test locally with `npm run auto-fix:check`
3. Enable workflow and let it run for a few cycles
4. Monitor GitHub Actions tab for results
5. Adjust settings based on your needs

## Support

For issues with the auto-fix system:

- Check workflow logs in GitHub Actions
- Run local diagnostics: `npm run auto-fix:check`
- Review error analysis in deployment reports: `npm run monitor:report`
