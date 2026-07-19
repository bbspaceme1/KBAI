# Admin Orchestration Panel Guide

## Overview

The Admin Orchestration Panel (`/admin/orchestration`) is a unified dashboard for managing code audits, executing fixes, and deploying changes—all from a single web interface using 5 integrated tools: Vercel, Supabase, GitHub, v0, and Copilot.

**Key Principle**: This is a **manual-trigger system** with no automation loops. All execution requires explicit user clicks.

---

## Access Requirements

- Must have `admin` role in `user_roles` table (checked via `requireAdminAccess()`)
- Route is admin-only, redirects to `/community` if unauthorized

---

## 4-Section Workflow

### Section 1: Bug Report from Users

**What it does:**
- Displays all bug reports stored in Supabase `bug_reports` table
- Shows: title, description, severity, status, timestamp
- Each report can be selected for deeper investigation

**"Ringkas dengan GPT" Button:**
1. Calls OpenAI API with bug details
2. GPT generates concise summary (3-5 key points)
3. Summary saved back to `bug_reports.gpt_summary`
4. Preview displayed in the panel

**Output for Next Section:**
- GPT summary becomes input to Claude audit

---

### Section 2: Full Audit by Claude Code

**What it does:**
- Triggers GitHub Actions workflow (`claude-audit.yml`) headless
- Workflow fetches:
  - Complete repo code (via `actions/checkout`)
  - GPT summary from Section 1
  - Latest Vercel deployment logs (via Vercel API)
  - Supabase database warnings (via Management API)
- Claude analyzes all sources in headless mode
- Generates markdown file with:
  - Executive summary
  - Root causes (with evidence)
  - Affected files
  - Specific fix recommendations
  - Priority levels (HIGH/MEDIUM/LOW)
  - Risk assessments

**Status Polling:**
- Real-time status display: queued → running → completed
- Polls GitHub Actions API every 5 seconds
- Auto-saves result to Supabase `audit_results` table

**Output for Next Section:**
- Markdown audit prompt is auto-populated in Section 3

---

### Section 3: Review & Execute

**What it does:**
- Shows markdown audit result in editable textarea
- **User can customize the prompt before execution**
- Checks for sensitive files (see Guardrails below)

**Sensitive File Detection:**
If prompt mentions any of these, **both buttons are disabled**:
- `api/entry.ts` (Midtrans webhook)
- `supabase/migrations/` (database migrations)
- `src/lib/rbac.ts` (role-based access control)
- `src/lib/portfolio.functions.ts` (sensitive business logic)
- `src/auth.tsx` (authentication system)

Message displayed: `"file ini butuh review manual langsung, tidak lewat tombol eksekusi"`

**"Eksekusi via v0" Button:**
1. Sends prompt to v0 Platform API
2. v0 creates new chat from prompt
3. v0 generates code changes
4. v0 creates **new branch + Pull Request** (never commits to main)
5. PR URL returned and displayed in Section 4

**"Eksekusi via Copilot" Button:**
1. Sends prompt to Copilot Agent Tasks API
2. Copilot generates code changes
3. Copilot creates **new branch + Pull Request** (never commits to main)
4. PR URL returned and displayed in Section 4

**Critical Rule**: Both execution paths **MUST create a PR**. Direct commits to main are forbidden by design.

---

### Section 4: Commit Sync

**What it does:**
- Shows PR URL (clickable link to GitHub)
- Shows PR status: `pending` | `approved` | `merged`

**"Approve & Merge" Button:**
- **This is the only button that commits to main**
- Approves PR via GitHub API
- Merges to main via GitHub API (squash merge)
- After merge: `deploy.yml` pipeline runs automatically (with all gates: tsc, lint, test)
- No custom deploy logic created; existing pipeline handles it

---

## Audit Log (Section 5)

Every action is logged to `orchestration_audit_log` table:
- Who performed the action
- What action (summarize, audit, execute, merge)
- When it happened
- What was the result

Last 10 logs displayed at bottom of page.

---

## Environment Variables (Server-Side Only)

These must be set as GitHub Secrets or Vercel environment variables. **Never exposed in UI or logs.**

| Variable | Used By | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | GPT summarization | Call OpenAI API |
| `GITHUB_TOKEN` | All sections | Trigger workflows, create/merge PRs |
| `VERCEL_PERSONAL_ACCESS_TOKEN` | Claude audit | Fetch deployment logs |
| `ANTHROPIC_API_KEY` | Claude audit | Claude Code headless |
| `V0_API_KEY` | Execute v0 | Create chat + changes |
| `COPILOT_API_KEY` | Execute Copilot | Agent Tasks API |
| `SUPABASE_URL` | All sections | Database access |
| `SUPABASE_SERVICE_ROLE_KEY` | All sections | Admin database ops |

---

## Sensitive Files Guardrail

### Why These Files Are Protected

1. **api/entry.ts**: Midtrans payment webhook
   - Changes here could break payment processing
   - Requires manual review + testing
   - Risk: Data loss or payment failures

2. **supabase/migrations/**: Database schema
   - Changes here are irreversible in production
   - Could cause data loss
   - Must be reviewed with DB team

3. **src/lib/rbac.ts**: Role-based access control
   - Changes here could create security holes
   - Could grant unauthorized access
   - Risk: Data breach

4. **src/lib/portfolio.functions.ts**: Business logic
   - Critical calculation functions
   - Changes could affect all users
   - Risk: Financial calculations wrong

5. **src/auth.tsx**: Authentication
   - Changes could break login
   - Could create auth bypasses
   - Risk: Security vulnerability

### What Happens If Sensitive Files Detected

1. Both "Execute" buttons **become disabled** (grayed out)
2. Red alert shows: `"Sensitive files detected: [list]. Execution disabled."`
3. User must:
   - Either edit prompt to remove those files, OR
   - Remove those files from the code change in v0/Copilot manually, OR
   - Perform manual code review and merge via GitHub directly (bypass this panel)

---

## Security & Audit Rules

### No Direct Main Commits
- Every code change must go through PR + approval + merge
- Protects against accidental deployments
- Preserves audit trail

### Action Logging
- Every button click logged to `orchestration_audit_log`
- Includes: user ID, timestamp, action type, result
- Immutable audit trail for compliance

### Credential Protection
- All API keys/tokens stored in environment variables
- Never returned in API responses
- Never logged to browser console
- Server-side functions only

### Manual-Trigger Only
- No scheduled runs (no cron jobs)
- No automatic loops
- No AI auto-executes unless user clicks
- All decisions are human-driven

---

## Typical Workflow Example

### Scenario: Production bug reported

1. **User clicks "Ringkas dengan GPT"**
   - GPT summary generated
   - Saved: `bug_reports.gpt_summary`

2. **User clicks "Jalankan Claude Code Audit"**
   - GitHub Actions triggered
   - Claude analyzes full context
   - Generates audit markdown

3. **Audit completes, Section 3 auto-populates**
   - User reads markdown in textarea
   - Optional: User edits prompt
   - Checks for sensitive files (auto-detected)

4. **User clicks "Eksekusi via v0" (or Copilot)**
   - v0 creates branch + applies changes
   - PR created automatically
   - PR URL shows in Section 4

5. **User checks PR on GitHub**
   - Reviews code changes
   - Sees CI checks running (tsc, lint, test)
   - Approves PR (on GitHub UI) if looks good

6. **User clicks "Approve & Merge"**
   - PR approved + merged
   - `deploy.yml` pipeline runs
   - Production deployment starts

7. **Audit logged**
   - All actions recorded in `orchestration_audit_log`
   - Timestamp, user ID, results all captured

---

## Database Schema

### bug_reports
```sql
- id (uuid, PK)
- title (text)
- description (text)
- severity (LOW | MEDIUM | HIGH | CRITICAL)
- status (open | acknowledged | in_progress | resolved)
- reported_by (user_id)
- gpt_summary (text) -- populated by Section 1
- created_at, updated_at
```

### audit_results
```sql
- id (uuid, PK)
- job_id (text, unique) -- GitHub Actions run ID
- markdown (text) -- audit report markdown
- status (pending | running | completed | failed)
- created_at, completed_at
```

### orchestration_audit_log
```sql
- id (uuid, PK)
- performed_by (user_id) -- who clicked button
- action (text) -- summarize | audit | execute_v0 | execute_copilot | approve_merge
- target_id (text) -- bug ID, job ID, PR number, etc
- result (text) -- what happened (success message or error)
- performed_at (timestamp)
```

### pull_requests
```sql
- id (uuid, PK)
- pr_url (text, unique)
- pr_number (int)
- created_by (user_id)
- status (pending | approved | merged | rejected)
- created_at, merged_at
```

---

## API Integrations

### 1. OpenAI API (Section 1)
- Endpoint: `POST https://api.openai.com/v1/chat/completions`
- Model: `gpt-4-turbo-preview`
- Auth: `OPENAI_API_KEY`

### 2. GitHub Actions (Section 2)
- Endpoint: `POST /repos/{org}/{repo}/actions/workflows/claude-audit.yml/dispatches`
- Also: `GET /repos/{org}/{repo}/actions/runs/{run_id}`
- Auth: `GITHUB_TOKEN`

### 3. Vercel API (Section 2, Claude context)
- Endpoints: `/v6/deployments`, `/v6/deployments/{id}/logs`
- Auth: `VERCEL_PERSONAL_ACCESS_TOKEN`

### 4. Anthropic Claude (Section 2)
- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Model: `claude-3-5-sonnet-20241022`
- Auth: `ANTHROPIC_API_KEY`

### 5. v0 Platform API (Section 3)
- Endpoint: `POST https://api.v0.dev/chats`
- Auth: `V0_API_KEY`
- Returns: chat ID + generated code

### 6. Copilot Agent Tasks (Section 3)
- Endpoint: `POST https://api.github.com/copilot/tasks`
- Auth: `COPILOT_API_KEY`
- Returns: task ID + PR URL

### 7. GitHub API (Section 4)
- Endpoints: `/repos/{org}/{repo}/pulls/{number}/reviews`, `/repos/{org}/{repo}/pulls/{number}/merge`
- Auth: `GITHUB_TOKEN`

---

## Troubleshooting

### "File not found" when opening /admin/orchestration
- Check: Do you have `admin` role?
- Check: Is route registered in `_app.admin.tsx`?
- Run: `npx tsc --noEmit` to verify TypeScript

### GPT summary fails with 401
- Check: `OPENAI_API_KEY` is set in environment
- Check: Key has access to GPT-4 models (not just text-davinci-003)

### Claude Audit job stuck in "queued"
- Check: GitHub Actions workflow file exists (`.github/workflows/claude-audit.yml`)
- Check: `GITHUB_TOKEN` has `actions:write` permission
- Check: `ANTHROPIC_API_KEY` is configured

### PR creation fails
- Check: v0 or Copilot API keys are valid
- Check: GitHub user has write access to repo
- Check: Prompt doesn't trigger sensitive file detection

### Merge button doesn't work
- Check: PR is in "pending" state (not already merged)
- Check: `GITHUB_TOKEN` has `pull-requests:write` permission
- Check: Admin user logged in (check `user_roles` table)

---

## Notes

- This panel is **read-only** for Vercel and Supabase—it queries logs but doesn't configure deployments or database settings
- The `deploy.yml` pipeline remains the source of truth for what gets deployed; this panel just triggers it
- All credential rotation/renewal happens via GitHub Secrets UI or Vercel dashboard, not through this panel
- If you need to audit logs further, query `orchestration_audit_log` directly from Supabase dashboard
