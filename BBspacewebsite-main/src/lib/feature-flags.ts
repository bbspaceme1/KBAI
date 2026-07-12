/**
 * Feature Flags System
 * Enables/disables features for canary deployments, A/B testing, etc.
 */

export enum FeatureFlag {
  // Observability features
  ENABLE_STRUCTURED_LOGGING = "enable_structured_logging",
  ENABLE_CORRELATION_IDS = "enable_correlation_ids",
  ENABLE_PERFORMANCE_MONITORING = "enable_performance_monitoring",

  // Enterprise features
  ENABLE_SAML_AUTH = "enable_saml_auth",
  ENABLE_API_KEYS = "enable_api_keys",
  ENABLE_IP_WHITELIST = "enable_ip_whitelist",
  ENABLE_SESSION_LIMITS = "enable_session_limits",

  // Payment features
  ENABLE_SUBSCRIPTIONS = "enable_subscriptions",
  ENABLE_BILLING = "enable_billing",

  // Data features
  ENABLE_EXPORT_PDF = "enable_export_pdf",
  ENABLE_EXPORT_CSV = "enable_export_csv",
  ENABLE_BULK_OPERATIONS = "enable_bulk_operations",

  // UI features
  ENABLE_DARK_MODE = "enable_dark_mode",
  ENABLE_ONBOARDING = "enable_onboarding",
  ENABLE_TOUR = "enable_tour",
}

interface FeatureFlags {
  [key: string]: boolean;
}

// Default flags (can be overridden via environment or API)
const defaultFlags: FeatureFlags = {
  [FeatureFlag.ENABLE_STRUCTURED_LOGGING]: true,
  [FeatureFlag.ENABLE_CORRELATION_IDS]: true,
  [FeatureFlag.ENABLE_PERFORMANCE_MONITORING]: true,
  [FeatureFlag.ENABLE_SAML_AUTH]: false, // Planned feature
  [FeatureFlag.ENABLE_API_KEYS]: false, // Planned feature
  [FeatureFlag.ENABLE_IP_WHITELIST]: false, // Planned feature
  [FeatureFlag.ENABLE_SESSION_LIMITS]: false, // Planned feature
  [FeatureFlag.ENABLE_SUBSCRIPTIONS]: false, // Planned feature
  [FeatureFlag.ENABLE_BILLING]: false, // Planned feature
  [FeatureFlag.ENABLE_EXPORT_PDF]: true, // Available
  [FeatureFlag.ENABLE_EXPORT_CSV]: true, // Available
  [FeatureFlag.ENABLE_BULK_OPERATIONS]: false, // Planned feature
  [FeatureFlag.ENABLE_DARK_MODE]: true, // Available
  [FeatureFlag.ENABLE_ONBOARDING]: false, // Planned feature
  [FeatureFlag.ENABLE_TOUR]: true, // Available
};

class FeatureFlagManager {
  private flags: FeatureFlags = { ...defaultFlags };
  private userFlags: Map<string, FeatureFlags> = new Map(); // Per-user overrides

  /**
   * Check if feature is enabled globally
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] ?? defaultFlags[flag] ?? false;
  }

  /**
   * Check if feature is enabled for specific user
   */
  isEnabledForUser(flag: FeatureFlag, userId: string): boolean {
    const userFlags = this.userFlags.get(userId);
    if (userFlags && flag in userFlags) {
      return userFlags[flag];
    }
    return this.isEnabled(flag);
  }

  /**
   * Enable feature globally
   */
  enable(flag: FeatureFlag): void {
    this.flags[flag] = true;
  }

  /**
   * Disable feature globally
   */
  disable(flag: FeatureFlag): void {
    this.flags[flag] = false;
  }

  /**
   * Set feature for specific user (canary deployment)
   */
  setForUser(flag: FeatureFlag, userId: string, enabled: boolean): void {
    if (!this.userFlags.has(userId)) {
      this.userFlags.set(userId, {});
    }
    this.userFlags.get(userId)![flag] = enabled;
  }

  /**
   * Get all enabled features
   */
  getEnabled(): FeatureFlag[] {
    return Object.entries(this.flags)
      .filter(([_, enabled]) => enabled)
      .map(([flag]) => flag as FeatureFlag);
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.flags = { ...defaultFlags };
    this.userFlags.clear();
  }
}

export const featureFlags = new FeatureFlagManager();

// Initialize from environment variables if available
if (typeof process !== "undefined" && process.env) {
  if (process.env.FEATURE_STRUCTURED_LOGGING === "false")
    featureFlags.disable(FeatureFlag.ENABLE_STRUCTURED_LOGGING);
  if (process.env.FEATURE_SAML === "true") featureFlags.enable(FeatureFlag.ENABLE_SAML_AUTH);
  if (process.env.FEATURE_SUBSCRIPTIONS === "true")
    featureFlags.enable(FeatureFlag.ENABLE_SUBSCRIPTIONS);
}
