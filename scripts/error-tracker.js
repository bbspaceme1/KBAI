import { createClient } from "@supabase/supabase-js";

/**
 * Error Tracker - Autonomous Error Detection & Pattern Recognition
 * Integrates with Supabase for error history, pattern matching, and intelligent fixes
 */

class ErrorTracker {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("[ErrorTracker] Supabase not configured - error tracking disabled");
      this.client = null;
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Log an error to Supabase
   */
  async logError({
    errorType,
    errorCategory,
    errorMessage,
    filePath,
    lineNumber,
    deploymentId,
    commitHash,
    severity = "MEDIUM",
  }) {
    if (!this.client) return null;

    try {
      // Create error hash for pattern matching
      const errorHash = this._hashError(errorMessage, errorType);

      // Check if similar error exists (recurring pattern)
      const { data: existingError } = await this.client
        .from("error_logs")
        .select("*")
        .eq("error_hash", errorHash)
        .limit(1)
        .single()
        .catch(() => ({ data: null }));

      if (existingError) {
        // Update occurrence count
        await this.client
          .from("error_logs")
          .update({
            occurrence_count: existingError.occurrence_count + 1,
            last_seen: new Date(),
          })
          .eq("id", existingError.id);

        return { id: existingError.id, isNewError: false };
      }

      // Insert new error
      const { data, error } = await this.client.from("error_logs").insert({
        error_type: errorType,
        error_category: errorCategory,
        error_message: errorMessage,
        error_hash: errorHash,
        file_path: filePath,
        line_number: lineNumber,
        deployment_id: deploymentId,
        commit_hash: commitHash,
        severity,
      });

      if (error) throw error;
      return { id: data[0].id, isNewError: true };
    } catch (err) {
      console.error("[ErrorTracker] Failed to log error:", err.message);
      return null;
    }
  }

  /**
   * Log a fix attempt
   */
  async logFix({
    errorLogId,
    fixType,
    fixDescription,
    fixCode,
    success,
    resultMessage,
    newErrorIntroduced = false,
  }) {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client.from("fix_history").insert({
        error_log_id: errorLogId,
        fix_type: fixType,
        fix_description: fixDescription,
        fix_code: fixCode,
        success,
        result_message: resultMessage,
        new_error_introduced: newErrorIntroduced,
      });

      if (error) throw error;

      // Update error log with fix status
      if (success) {
        await this.client
          .from("error_logs")
          .update({ is_fixed: true })
          .eq("id", errorLogId);
      }

      // Increment fix attempt count
      await this.client
        .from("error_logs")
        .update({
          fix_attempt_count: this.client
            .rpc("increment_fix_attempts", { error_id: errorLogId }),
        })
        .eq("id", errorLogId)
        .catch(() => {}); // Silent fail if RPC not available

      return data[0];
    } catch (err) {
      console.error("[ErrorTracker] Failed to log fix:", err.message);
      return null;
    }
  }

  /**
   * Get error pattern recommendations
   */
  async getPatternMatch(errorMessage) {
    if (!this.client) return null;

    try {
      const { data: patterns } = await this.client
        .from("error_patterns")
        .select("*")
        .eq("is_active", true)
        .order("fix_confidence_score", { ascending: false });

      if (!patterns) return null;

      // Find matching pattern (simple regex match)
      for (const pattern of patterns) {
        if (pattern.error_regex) {
          const regex = new RegExp(pattern.error_regex, "i");
          if (regex.test(errorMessage)) {
            return {
              patternId: pattern.id,
              patternName: pattern.pattern_name,
              recommendedFix: pattern.recommended_fix_type,
              confidence: pattern.fix_confidence_score,
              successRate:
                pattern.total_occurrences > 0
                  ? pattern.successful_fixes / pattern.total_occurrences
                  : 0,
            };
          }
        }
      }

      return null;
    } catch (err) {
      console.error("[ErrorTracker] Failed to get pattern match:", err.message);
      return null;
    }
  }

  /**
   * Log autonomous action (for audit trail)
   */
  async logAction({
    actionType,
    deploymentId,
    errorLogId,
    fixHistoryId,
    commandExecuted,
    success,
    executionResult,
    executionTimeMs,
    confidenceScore = 0.5,
    riskAssessment = "MEDIUM",
  }) {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from("autonomous_actions")
        .insert({
          action_type: actionType,
          action_status: success ? "SUCCESS" : "FAILED",
          deployment_id: deploymentId,
          error_log_id: errorLogId,
          fix_history_id: fixHistoryId,
          command_executed: commandExecuted,
          execution_result: executionResult,
          execution_time_ms: executionTimeMs,
          confidence_score: confidenceScore,
          risk_assessment: riskAssessment,
        });

      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error("[ErrorTracker] Failed to log action:", err.message);
      return null;
    }
  }

  /**
   * Get error summary for health check
   */
  async getErrorSummary() {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from("v_error_summary")
        .select("*");

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[ErrorTracker] Failed to get summary:", err.message);
      return null;
    }
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limitHours = 24) {
    if (!this.client) return null;

    try {
      const { data, error } = await this.client
        .from("v_recent_errors")
        .select("*")
        .limit(10);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[ErrorTracker] Failed to get recent errors:", err.message);
      return null;
    }
  }

  /**
   * Analyze error patterns and suggest fixes
   */
  async analyzePatterns() {
    if (!this.client) return null;

    try {
      const summary = await this.getErrorSummary();
      const recentErrors = await this.getRecentErrors();

      if (!summary || !recentErrors) return null;

      return {
        totalErrors: summary.reduce((sum, s) => sum + s.total_errors, 0),
        fixedErrors: summary.reduce((sum, s) => sum + s.fixed_count, 0),
        criticalErrorsUnfixed: recentErrors.filter(
          (e) => e.severity === "CRITICAL" && !e.is_fixed
        ).length,
        patterns: summary,
        recentIssues: recentErrors.slice(0, 5),
      };
    } catch (err) {
      console.error("[ErrorTracker] Failed to analyze patterns:", err.message);
      return null;
    }
  }

  /**
   * Create error hash for pattern matching
   */
  _hashError(message, type) {
    // Simple hash: just normalize and take first 50 chars + type
    const normalized = message
      .toLowerCase()
      .replace(/\d+/g, "X") // Replace numbers
      .replace(/['"]/g, '"') // Normalize quotes
      .substring(0, 50);

    return `${type}-${Buffer.from(normalized).toString("base64").substring(0, 20)}`;
  }
}

export default ErrorTracker;
