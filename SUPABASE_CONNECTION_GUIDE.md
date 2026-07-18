# Supabase Connection - Token Requirements for v0 Autonomous Loop

## Required Tokens (3 Total)

### 1. SUPABASE_URL (Project URL)
**What it is:** Base URL untuk Supabase project Anda
**Where to find:** https://supabase.com/dashboard → Select Project → Settings → API → Project URL
**Format:** `https://your-project-id.supabase.co`
**Example:** `https://abc123def456.supabase.co`

### 2. SUPABASE_ANON_KEY (Anonymous/Public Key)
**What it is:** Public key untuk client-side operations
**Where to find:** https://supabase.com/dashboard → Select Project → Settings → API → Anon public
**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
**Usage:** Used in error-tracker.js for reading error data
**Permissions:** Read-only by default (configurable via RLS)

### 3. SUPABASE_SERVICE_ROLE_KEY (Admin Key)
**What it is:** Private admin key untuk server-side operations
**Where to find:** https://supabase.com/dashboard → Select Project → Settings → API → Service role secret
**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string, KEEP SECRET)
**Usage:** Used for:
  - Creating tables and schema
  - Setting up RLS policies
  - Admin operations (override RLS)
  - Autonomous fixes and logging
**Security:** NEVER expose this in client code or public repos

---

## How to Get These Tokens

### Step-by-Step:

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Select Your Project**
   - If no project, create one first (takes 1 minute)

3. **Navigate to Settings > API**
   - Left sidebar → Settings → API tab

4. **Copy the 3 Keys:**
   ```
   Project URL:           (SUPABASE_URL)
   Anon public:           (SUPABASE_ANON_KEY)
   Service role secret:   (SUPABASE_SERVICE_ROLE_KEY)
   ```

---

## Format When Providing to Me

Provide all 3 in this format:

```
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Or simply copy-paste the values separated by newlines.

---

## What I'll Do With These

### Immediately (Automated):
1. Create Supabase database schema (error_logs, fix_history, error_patterns, etc)
2. Setup Row Level Security (RLS) policies
3. Create database views and indexes
4. Test connection

### Then (Autonomous Loop):
1. Log all detected errors to Supabase
2. Query error patterns to find best fixes
3. Track all fix attempts and results
4. Auto-rollback if needed
5. Learn from patterns to improve fixes

### Security:
- Service role key stored securely in GitHub Secrets (encrypted)
- Anon key used for read operations only
- Each token has specific permissions via RLS

---

## Quick Test - Do You Have Supabase?

If you don't have Supabase yet:
1. Go to https://supabase.com
2. Sign up (free tier available)
3. Create new project (takes ~30 seconds)
4. Get the 3 tokens
5. Provide them to me

**Total time: 5 minutes**

---

## After You Provide Tokens

I will:
1. ✅ Setup all database tables
2. ✅ Configure RLS policies
3. ✅ Add GitHub Secrets (SUPABASE_SERVICE_ROLE_KEY + URL + ANON_KEY)
4. ✅ Update auto-fix engine to use Supabase
5. ✅ Test autonomous loop
6. ✅ Commit all changes

Then autonomous loop starts running 24/7!
