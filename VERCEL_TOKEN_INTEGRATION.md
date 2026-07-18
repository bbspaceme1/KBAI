# Vercel Personal Access Token Integration Guide

## Overview

The v0 autonomous error detection and auto-fix system now fully integrated with Vercel via `VERCEL_PERSONAL_ACCESS_TOKEN`.

## Token Setup

### 1. Generate Vercel Personal Access Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Give it a name: `v0-auto-fix-system`
4. Select expiration (recommended: 90 days)
5. Copy the token immediately (you won't see it again)

### 2. Add to GitHub Secrets

In your GitHub repository:

1. Go to **Settings > Secrets and variables > Actions**
2. Click "New repository secret"
3. Add these three secrets:

```
Name: VERCEL_PERSONAL_ACCESS_TOKEN
Value: (your token from step 1)

Name: VERCEL_ORG_ID
Value: Run: npx vercel whoami

Name: VERCEL_PROJECT_ID
Value: Run: npx vercel project list
```

### 3. Verify Integration

The system uses `VERCEL_PERSONAL_ACCESS_TOKEN` automatically in:

- `.github/workflows/auto-monitor-and-fix.yml` - GitHub Actions workflow
- `scripts/vercel-monitor.js` - Vercel API monitoring
- `scripts/auto-fix-engine.js` - Auto-fix diagnostics

### 4. Test Locally

Test with your local environment:

```bash
# Set token locally for testing
export VERCEL_PERSONAL_ACCESS_TOKEN=your_token_here
export VERCEL_PROJECT_ID=your_project_id
export VERCEL_ORG_ID=your_org_id

# Run monitoring
npm run monitor:check

# Run auto-fix diagnostics
npm run auto-fix:check
```

## How It Works

### Workflow Loop (Every 10 Minutes)

```
GitHub Actions triggered
  ↓
1. Uses VERCEL_PERSONAL_ACCESS_TOKEN to call Vercel API
2. Fetches latest deployment status
3. Gets build logs if deployment failed
4. Runs auto-fix engine diagnostics
5. Auto-fixes issues and commits if needed
6. Pushes to GitHub
7. Vercel auto-deploys
  ↓
Loop returns to step 1
```

### What the Token Can Access

The workflow uses the token to:

- List deployments: `GET /v6/deployments`
- Get build logs: `GET /v6/deployments/{id}/logs`
- Get deployment status: Included in deployments response

The token is **read-only** for deployment and build information.

## Environment Variables Used

| Variable | Source | Used In |
|----------|--------|---------|
| `VERCEL_PERSONAL_ACCESS_TOKEN` | GitHub Secrets | All Vercel API calls |
| `VERCEL_ORG_ID` | GitHub Secrets | Optional org context |
| `VERCEL_PROJECT_ID` | GitHub Secrets | Required for fetching deployments |
| `GH_TOKEN` | GitHub auto | GitHub API calls (comments, issues) |

## Troubleshooting

### "Missing VERCEL_PERSONAL_ACCESS_TOKEN"

- Check GitHub Secrets are set correctly
- Verify workflow file references `secrets.VERCEL_PERSONAL_ACCESS_TOKEN`
- Check secret name exactly matches: `VERCEL_PERSONAL_ACCESS_TOKEN`

### "401 Unauthorized from Vercel API"

- Token may be expired or invalid
- Generate new token from https://vercel.com/account/tokens
- Update GitHub secret with new token

### "Cannot find project"

- Verify `VERCEL_PROJECT_ID` is correct
- Run: `npx vercel project list` to find correct ID
- Update GitHub secret with correct project ID

## Security

- Token is stored as GitHub Secret (encrypted, not visible in logs)
- Token is read-only for deployment access
- Token expires automatically (set during creation)
- Rotate token every 90 days for security

## Next Steps

1. Add the 3 GitHub secrets
2. The workflow will automatically start running in 10 minutes
3. Monitor in GitHub Actions tab
4. Check deployment status at https://kbaiterminal.vercel.app

Your autonomous error detection and fixing system is now fully operational!
