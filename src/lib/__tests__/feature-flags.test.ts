import { describe, test, expect, beforeEach } from "vitest";
import { featureFlags, FeatureFlag } from "../feature-flags";

describe("Feature Flags", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    featureFlags.reset();
  });

  describe("Flag Management", () => {
    test("enables feature globally", () => {
      featureFlags.enable(FeatureFlag.ENABLE_SAML_AUTH);
      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_SAML_AUTH)).toBe(true);
    });

    test("disables feature globally", () => {
      featureFlags.disable(FeatureFlag.ENABLE_SUBSCRIPTIONS);
      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_SUBSCRIPTIONS)).toBe(false);
    });

    test("respects default flag state", () => {
      // ENABLE_STRUCTURED_LOGGING is enabled by default
      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_STRUCTURED_LOGGING)).toBe(true);

      // ENABLE_SAML_AUTH is disabled by default
      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_SAML_AUTH)).toBe(false);
    });
  });

  describe("Per-User Flags", () => {
    test("enables feature for specific user", () => {
      const userId = "user-123";

      featureFlags.setForUser(FeatureFlag.ENABLE_SAML_AUTH, userId, true);

      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_SAML_AUTH, userId)).toBe(true);
    });

    test("disables feature for specific user", () => {
      const userId = "user-456";

      featureFlags.setForUser(FeatureFlag.ENABLE_STRUCTURED_LOGGING, userId, false);

      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_STRUCTURED_LOGGING, userId)).toBe(
        false,
      );
    });

    test("respects global setting when no user override", () => {
      const userId = "user-789";

      // No user override set
      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_PERFORMANCE_MONITORING, userId)).toBe(
        true,
      ); // Default is enabled
    });

    test("user override takes precedence over global", () => {
      const userId = "user-override";

      featureFlags.enable(FeatureFlag.ENABLE_API_KEYS);
      featureFlags.setForUser(FeatureFlag.ENABLE_API_KEYS, userId, false);

      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_API_KEYS)).toBe(true);
      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_API_KEYS, userId)).toBe(false);
    });
  });

  describe("Feature Status Queries", () => {
    test("returns all enabled features", () => {
      featureFlags.reset();

      const enabled = featureFlags.getEnabled();

      expect(enabled).toContain(FeatureFlag.ENABLE_STRUCTURED_LOGGING);
      expect(enabled).toContain(FeatureFlag.ENABLE_CORRELATION_IDS);
      expect(enabled).not.toContain(FeatureFlag.ENABLE_SAML_AUTH);
    });

    test("returns different enabled features after changes", () => {
      featureFlags.reset();
      const initialEnabled = featureFlags.getEnabled();

      featureFlags.enable(FeatureFlag.ENABLE_SAML_AUTH);
      const afterEnable = featureFlags.getEnabled();

      expect(afterEnable.length).toBeGreaterThan(initialEnabled.length);
      expect(afterEnable).toContain(FeatureFlag.ENABLE_SAML_AUTH);
    });
  });

  describe("Reset Functionality", () => {
    test("resets to default state", () => {
      featureFlags.enable(FeatureFlag.ENABLE_SAML_AUTH);
      featureFlags.setForUser(FeatureFlag.ENABLE_API_KEYS, "user-123", true);

      featureFlags.reset();

      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_SAML_AUTH)).toBe(false);
      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_API_KEYS, "user-123")).toBe(false);
    });
  });

  describe("Canary Deployment Pattern", () => {
    test("enables feature for subset of users (canary)", () => {
      const canaryUsers = ["user-1000", "user-1001", "user-1002"];

      // Feature is disabled globally
      expect(featureFlags.isEnabled(FeatureFlag.ENABLE_SUBSCRIPTIONS)).toBe(false);

      // But enabled for canary users
      for (const userId of canaryUsers) {
        featureFlags.setForUser(FeatureFlag.ENABLE_SUBSCRIPTIONS, userId, true);
      }

      // Verify canary users can access
      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_SUBSCRIPTIONS, "user-1000")).toBe(
        true,
      );

      // But not others
      expect(featureFlags.isEnabledForUser(FeatureFlag.ENABLE_SUBSCRIPTIONS, "user-2000")).toBe(
        false,
      );
    });
  });

  describe("Enterprise Feature Control", () => {
    test("enterprise security features available as flags", () => {
      const enterpriseFeatures = [
        FeatureFlag.ENABLE_SAML_AUTH,
        FeatureFlag.ENABLE_API_KEYS,
        FeatureFlag.ENABLE_IP_WHITELIST,
        FeatureFlag.ENABLE_SESSION_LIMITS,
      ];

      for (const feature of enterpriseFeatures) {
        // All should be defined and disabled by default
        expect(featureFlags.isEnabled(feature)).toBe(false);

        // Can be enabled for specific deployment
        featureFlags.enable(feature);
        expect(featureFlags.isEnabled(feature)).toBe(true);

        featureFlags.disable(feature);
      }
    });
  });
});
