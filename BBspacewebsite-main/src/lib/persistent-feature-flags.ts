/**
 * Persistent Feature Flags with Database Caching
 * Enables safe feature rollouts and A/B testing
 * Replaces in-memory feature flags with DB-backed persistence
 *
 * Usage:
 * const isFeatureEnabled = await featureFlagManager.isEnabled('NEW_PORTFOLIO_UI', userId)
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  rolloutPercentage?: number; // 0-100: gradually roll out feature
  targetRoles?: string[]; // ['member', 'advisor', 'admin'] for role-based flags
  targetUserIds?: string[]; // Specific users to target
}

interface FeatureFlagCache {
  flags: Map<string, FeatureFlag>;
  expiresAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class PersistentFeatureFlagManager {
  private cache: FeatureFlagCache | null = null;

  /**
   * Check if a feature is enabled for a user
   * Checks cache first, then fetches from DB if expired
   */
  async isEnabled(featureKey: string, userId?: string, userRole?: string): Promise<boolean> {
    try {
      const flag = await this.getFlag(featureKey);

      if (!flag) return false;
      if (!flag.enabled) return false;

      // Check expiration
      if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
        return false;
      }

      // Check role restriction
      if (flag.targetRoles && userRole && !flag.targetRoles.includes(userRole)) {
        return false;
      }

      // Check user-specific restriction
      if (flag.targetUserIds && userId && !flag.targetUserIds.includes(userId)) {
        return false;
      }

      // Check rollout percentage (hash-based for consistent rollout)
      if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
        if (!userId) return false;
        const hash = this.hashUserId(userId, featureKey);
        const isInRollout = hash % 100 < flag.rolloutPercentage;
        return isInRollout;
      }

      return true;
    } catch (error) {
      console.error(`Error checking feature flag ${featureKey}:`, error);
      // Fail open: disable feature on error (conservative approach)
      return false;
    }
  }

  /**
   * Get flag from cache or database
   */
  private async getFlag(featureKey: string): Promise<FeatureFlag | null> {
    // Check cache first
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.flags.get(featureKey) || null;
    }

    // Fetch from database
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("*")
      .eq("key", featureKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Update cache
    await this.refreshCache();
    return this.cache?.flags.get(featureKey) || null;
  }

  /**
   * Refresh entire flag cache from database
   * Called periodically or after updates
   */
  async refreshCache(): Promise<void> {
    try {
      const { data, error } = await supabaseAdmin
        .from("feature_flags")
        .select("*")
        .eq("enabled", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (error) throw error;

      const flagMap = new Map<string, FeatureFlag>();
      for (const flag of data || []) {
        flagMap.set(flag.key, {
          id: flag.id,
          key: flag.key,
          enabled: flag.enabled,
          description: flag.description,
          createdAt: flag.created_at,
          updatedAt: flag.updated_at,
          expiresAt: flag.expires_at,
          rolloutPercentage: flag.rollout_percentage,
          targetRoles: flag.target_roles,
          targetUserIds: flag.target_user_ids,
        });
      }

      this.cache = {
        flags: flagMap,
        expiresAt: Date.now() + CACHE_TTL,
      };
    } catch (error) {
      console.error("Error refreshing feature flags cache:", error);
      // Keep old cache if refresh fails
    }
  }

  /**
   * Create or update a feature flag (Admin only)
   */
  async setFlag(flag: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
    const { key, enabled, description, rolloutPercentage, targetRoles, expiresAt } = flag;

    if (!key) throw new Error("Feature key is required");

    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key,
          enabled,
          description,
          rollout_percentage: rolloutPercentage,
          target_roles: targetRoles,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache to force refresh
    this.cache = null;

    return data;
  }

  /**
   * Disable a feature flag
   */
  async disableFlag(featureKey: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .update({ enabled: false })
      .eq("key", featureKey);

    if (error) throw error;

    this.cache = null;
  }

  /**
   * Get all flags for dashboard
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((flag) => ({
      id: flag.id,
      key: flag.key,
      enabled: flag.enabled,
      description: flag.description,
      createdAt: flag.created_at,
      updatedAt: flag.updated_at,
      expiresAt: flag.expires_at,
      rolloutPercentage: flag.rollout_percentage,
      targetRoles: flag.target_roles,
      targetUserIds: flag.target_user_ids,
    }));
  }

  /**
   * Hash userId for deterministic rollout percentage
   * Same user always gets same result for same feature
   */
  private hashUserId(userId: string, featureKey: string): number {
    let hash = 0;
    const str = `${userId}:${featureKey}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Singleton instance
export const featureFlagManager = new PersistentFeatureFlagManager();

/**
 * React hook for feature flags
 * Usage: const isEnabled = useFeatureFlag('NEW_PORTFOLIO_UI')
 */
export function useFeatureFlag(featureKey: string) {
  const { userId, userRole } = useAuth(); // Assuming useAuth hook exists
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const enabled = await featureFlagManager.isEnabled(featureKey, userId, userRole);
      setIsEnabled(enabled);
      setLoading(false);
    })();
  }, [featureKey, userId, userRole]);

  return { isEnabled, loading };
}

/**
 * Common feature flags
 */
export const FEATURE_FLAGS = {
  // Portfolio features
  NEW_PORTFOLIO_UI: "NEW_PORTFOLIO_UI",
  PORTFOLIO_V2_ANALYTICS: "PORTFOLIO_V2_ANALYTICS",
  PORTFOLIO_TAX_REPORTING: "PORTFOLIO_TAX_REPORTING",

  // AI features
  AI_MARKET_BRIEF: "AI_MARKET_BRIEF",
  AI_DCF_VALUATION: "AI_DCF_VALUATION",
  AI_SENTIMENT_ANALYSIS: "AI_SENTIMENT_ANALYSIS",

  // Community features
  COMMUNITY_CHAT: "COMMUNITY_CHAT",
  COMMUNITY_SIGNALS: "COMMUNITY_SIGNALS",

  // Admin features
  ADMIN_BULK_USER_MANAGEMENT: "ADMIN_BULK_USER_MANAGEMENT",
  ADMIN_EXPORT_REPORTS: "ADMIN_EXPORT_REPORTS",

  // Experimental
  EXPERIMENTAL_MOBILE_APP: "EXPERIMENTAL_MOBILE_APP",
  EXPERIMENTAL_CRYPTO_SUPPORT: "EXPERIMENTAL_CRYPTO_SUPPORT",
} as const;
