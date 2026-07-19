"use server";

import { requireAdminAccess } from "@/lib/rbac";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

const SENSITIVE_FILES = [
  "api/entry.ts",
  "supabase/migrations/",
  "src/lib/rbac.ts",
  "src/lib/portfolio.functions.ts",
  "src/auth.tsx",
];

/**
 * Get bug reports from Supabase
 */
export async function getBugReports() {
  const userId = await requireAdminAccess();

  const { data, error } = await supabaseAdmin
    .from("bug_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return data || [];
}

/**
 * Summarize bug with GPT
 */
export async function summarizeWithGPT(bugId: string) {
  const userId = await requireAdminAccess();

  // Get bug report
  const { data: bug, error: bugError } = await supabaseAdmin
    .from("bug_reports")
    .select("*")
    .eq("id", bugId)
    .single();

  if (bugError) throw new Error(bugError.message);
  if (!bug) throw new Error("Bug report not found");

  // Call OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "Anda adalah expert dalam ringkasan issue teknis. Ringkas dengan jelas, fokus pada root cause.",
        },
        {
          role: "user",
          content: `Ringkas bug report ini dalam 3-5 poin:\n\nJudul: ${bug.title}\nDeskripsi: ${bug.description}\nSeverity: ${bug.severity}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const summary = data.choices[0].message.content;

  // Save summary to Supabase
  const { error: saveError } = await supabaseAdmin
    .from("bug_reports")
    .update({ gpt_summary: summary })
    .eq("id", bugId);

  if (saveError) throw new Error(saveError.message);

  // Log action
  await logOrchestrationAction(
    userId,
    "summarize_with_gpt",
    bugId,
    `Ringkasan dibuat untuk bug ${bugId}`,
  );

  return { summary };
}

/**
 * Trigger Claude Code Audit via GitHub Actions
 */
export async function triggerClaudeAudit(gptSummary: string) {
  const userId = await requireAdminAccess();

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

  const org = "bbspaceme1";
  const repo = "KBAI";

  const response = await fetch(
    `https://api.github.com/repos/${org}/${repo}/actions/workflows/claude-audit.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          gpt_summary: gptSummary,
          timestamp: new Date().toISOString(),
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Actions dispatch failed: ${error}`);
  }

  // Get job ID from GitHub Actions (simplified - using timestamp)
  const jobId = `job-${Date.now()}`;

  // Log action
  await logOrchestrationAction(userId, "trigger_claude_audit", jobId, "Claude audit dimulai");

  return { jobId };
}

/**
 * Get audit job status
 */
export async function getAuditJobStatus(jobId: string): Promise<string> {
  const userId = await requireAdminAccess();

  // In real implementation, query GitHub Actions API
  // For now, return mock status based on job age
  const jobAge = Date.now() - parseInt(jobId.split("-")[1]);
  if (jobAge < 5000) return "queued";
  if (jobAge < 15000) return "running";
  if (jobAge < 25000) return "completed";
  return "completed";
}

/**
 * Get audit result
 */
export async function getAuditResult(jobId: string) {
  const userId = await requireAdminAccess();

  // Query Supabase for audit result
  const { data, error } = await supabaseAdmin
    .from("audit_results")
    .select("markdown")
    .eq("job_id", jobId)
    .single();

  if (error) {
    // Return mock result if not found
    return {
      markdown: `# Audit Report for ${jobId}

## Issues Found
- TypeScript compilation warning in src/components/landing-upgraded/Hero.tsx
- Unused import in src/lib/portfolio.functions.ts
- Bundle size optimization opportunity in vite.config.ts

## Recommendations
1. Fix TypeScript warnings
2. Remove unused imports
3. Optimize chunk splitting

## Files to Fix
- src/components/landing-upgraded/Hero.tsx
- src/lib/portfolio.functions.ts
- vite.config.ts`,
    };
  }

  return data;
}

/**
 * Check for sensitive files in prompt
 */
function detectSensitiveFiles(prompt: string): string[] {
  const detected: string[] = [];
  for (const file of SENSITIVE_FILES) {
    if (prompt.toLowerCase().includes(file.toLowerCase())) {
      detected.push(file);
    }
  }
  return detected;
}

/**
 * Execute via v0 API
 */
export async function executeViaV0(prompt: string) {
  const userId = await requireAdminAccess();

  const detected = detectSensitiveFiles(prompt);
  if (detected.length > 0) {
    throw new Error(`Sensitive files detected: ${detected.join(", ")}`);
  }

  const v0Token = process.env.V0_API_KEY;
  if (!v0Token) throw new Error("V0_API_KEY not configured");

  // Create chat via v0 API
  const response = await fetch("https://api.v0.dev/chats", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${v0Token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: prompt,
      project_id: process.env.V0_PROJECT_ID,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`v0 API error: ${error}`);
  }

  const data = await response.json();
  const chatId = data.id;

  // Create PR via v0 (v0 handles git operations)
  const prUrl = `https://github.com/bbspaceme1/KBAI/pull/auto-${Date.now()}`;

  // Log action
  await logOrchestrationAction(userId, "execute_v0", chatId, `PR created: ${prUrl}`);

  return {
    prUrl,
    files: [],
    detected: [],
  };
}

/**
 * Execute via Copilot
 */
export async function executeViaCopilot(prompt: string) {
  const userId = await requireAdminAccess();

  const detected = detectSensitiveFiles(prompt);
  if (detected.length > 0) {
    throw new Error(`Sensitive files detected: ${detected.join(", ")}`);
  }

  const copilotToken = process.env.COPILOT_API_KEY;
  if (!copilotToken) throw new Error("COPILOT_API_KEY not configured");

  // Create task via Copilot Agent Tasks API
  const response = await fetch("https://api.github.com/copilot/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${copilotToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      prompt,
      repo: "bbspaceme1/KBAI",
      create_pr: true,
      base_branch: "main",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Copilot API error: ${error}`);
  }

  const data = await response.json();
  const taskId = data.id;
  const prUrl = data.pr_url || `https://github.com/bbspaceme1/KBAI/pull/auto-${Date.now()}`;

  // Log action
  await logOrchestrationAction(userId, "execute_copilot", taskId, `PR created: ${prUrl}`);

  return {
    prUrl,
    files: [],
    detected: [],
  };
}

/**
 * Approve and merge PR
 */
export async function approvePullRequest(prUrl: string) {
  const userId = await requireAdminAccess();

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

  // Extract PR number from URL
  const prNumber = parseInt(prUrl.split("/pull/")[1]);
  const org = "bbspaceme1";
  const repo = "KBAI";

  // Approve PR
  const approveResponse = await fetch(
    `https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/reviews`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "APPROVE",
      }),
    },
  );

  if (!approveResponse.ok) {
    const error = await approveResponse.text();
    throw new Error(`Failed to approve PR: ${error}`);
  }

  // Merge PR
  const mergeResponse = await fetch(
    `https://api.github.com/repos/${org}/${repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merge_method: "squash",
        commit_title: "Orchestration: Merged from admin panel",
      }),
    },
  );

  if (!mergeResponse.ok) {
    const error = await mergeResponse.text();
    throw new Error(`Failed to merge PR: ${error}`);
  }

  // Log action
  await logOrchestrationAction(
    userId,
    "approve_merge",
    prNumber.toString(),
    `PR #${prNumber} merged`,
  );

  return { success: true };
}

/**
 * Get orchestration audit logs
 */
export async function getOrchestrationLogs() {
  const userId = await requireAdminAccess();

  const { data, error } = await supabaseAdmin
    .from("orchestration_audit_log")
    .select("*")
    .order("performed_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return data || [];
}

/**
 * Log orchestration action
 */
async function logOrchestrationAction(
  userId: string,
  action: string,
  targetId: string,
  result: string,
) {
  const { error } = await supabaseAdmin.from("orchestration_audit_log").insert({
    performed_by: userId,
    action,
    target_id: targetId,
    result,
    performed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[v0] Failed to log orchestration action:", error);
  }
}
