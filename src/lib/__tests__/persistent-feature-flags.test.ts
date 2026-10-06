import { afterEach, describe, expect, it } from "vitest";
import {
  FeatureFlag,
  evaluatePersistentFeatureFlag,
  resetPersistentFeatureFlags,
  setPersistentFeatureFlag,
} from "../persistent-feature-flags";

afterEach(() => resetPersistentFeatureFlags());

describe("persistent feature flags", () => {
  it("fails closed when a flag is not registered", () => {
    expect(evaluatePersistentFeatureFlag(FeatureFlag.ENABLE_STRUCTURED_LOGGING)).toBe(false);
  });

  it("supports expiry, kill switches, and cohorts", () => {
    setPersistentFeatureFlag(FeatureFlag.ENABLE_STRUCTURED_LOGGING, {
      enabled: true,
      expiresAt: new Date(Date.now() + 60_000),
      cohort: ["user-a"],
    });
    expect(
      evaluatePersistentFeatureFlag(FeatureFlag.ENABLE_STRUCTURED_LOGGING, { userId: "user-a" }),
    ).toBe(true);
    expect(
      evaluatePersistentFeatureFlag(FeatureFlag.ENABLE_STRUCTURED_LOGGING, { userId: "user-b" }),
    ).toBe(false);

    setPersistentFeatureFlag(FeatureFlag.ENABLE_STRUCTURED_LOGGING, {
      enabled: true,
      killSwitch: true,
    });
    expect(evaluatePersistentFeatureFlag(FeatureFlag.ENABLE_STRUCTURED_LOGGING)).toBe(false);
  });
});
