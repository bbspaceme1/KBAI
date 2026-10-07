import { FeatureFlag, featureFlags } from "./feature-flags";

export type PersistentFeatureFlag = {
  enabled: boolean;
  expiresAt?: Date | null;
  killSwitch?: boolean;
  cohort?: string[] | null;
};

const registry = new Map<FeatureFlag, PersistentFeatureFlag>();

function isExpired(expiresAt?: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function setPersistentFeatureFlag(flag: FeatureFlag, value: PersistentFeatureFlag): void {
  registry.set(flag, {
    ...value,
    cohort: value.cohort ? [...new Set(value.cohort)] : null,
  });
}

export function clearPersistentFeatureFlag(flag: FeatureFlag): void {
  registry.delete(flag);
}

export function evaluatePersistentFeatureFlag(
  flag: FeatureFlag,
  context: { userId?: string | null; cohort?: string | null } = {},
): boolean {
  const value = registry.get(flag);
  if (!value || value.killSwitch || isExpired(value.expiresAt) || !value.enabled) {
    return false;
  }

  if (value.cohort?.length) {
    const matchesUser = context.userId && value.cohort.includes(context.userId);
    const matchesCohort = context.cohort && value.cohort.includes(context.cohort);
    if (!matchesUser && !matchesCohort) return false;
  }

  return value.enabled && featureFlags.isEnabled(flag);
}

export function resetPersistentFeatureFlags(): void {
  registry.clear();
}

export { FeatureFlag };
