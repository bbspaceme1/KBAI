export const COMPANY_ACCOUNT_TYPES = [
  "USER",
  "CUSTOMER",
  "ADVISOR",
  "COMMUNITY",
  "MARKET_INTELLIGENCE",
  "OPERATIONS",
  "FINANCE",
  "PRODUCT_GROWTH",
  "TECH_AI",
  "CONTROL",
] as const;

export type CompanyAccountType = (typeof COMPANY_ACCOUNT_TYPES)[number];
export type CompanyScope = "own" | "assigned" | "team" | "domain" | "global";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export const COMPANY_SUB_ROLES = {
  CEO: "OPERATIONS",
  COO: "OPERATIONS",
  CORPORATE_SECRETARY: "OPERATIONS",
  OPERATIONS_MANAGER: "OPERATIONS",
  SOP_OFFICER: "OPERATIONS",
  PROCUREMENT_OFFICER: "OPERATIONS",
  CFO: "FINANCE",
  ACCOUNTING_TAX: "FINANCE",
  FINANCE_OPERATIONS: "FINANCE",
  HEAD_PRODUCT: "PRODUCT_GROWTH",
  PRODUCT_MANAGER: "PRODUCT_GROWTH",
  CUSTOMER_SUCCESS: "PRODUCT_GROWTH",
  GROWTH_MANAGER: "PRODUCT_GROWTH",
  HEAD_MARKET_INTELLIGENCE: "MARKET_INTELLIGENCE",
  RESEARCH_ANALYST: "MARKET_INTELLIGENCE",
  DATA_OPERATIONS: "MARKET_INTELLIGENCE",
  MARKET_DATA_ENGINEER: "MARKET_INTELLIGENCE",
  CTO: "TECH_AI",
  ENGINEER: "TECH_AI",
  AI_ENGINEER: "TECH_AI",
  COMMUNITY_MANAGER: "COMMUNITY",
  SECURITY_CONTROL: "CONTROL",
} as const satisfies Record<string, CompanyAccountType>;

export type CompanySubRole = keyof typeof COMPANY_SUB_ROLES;

export type CompanyPermission = {
  code: string;
  resource: string;
  action: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
};

const permission = (
  resource: string,
  action: string,
  riskLevel: RiskLevel = "low",
  requiresApproval = false,
): CompanyPermission => ({
  code: `${resource}.${action}`,
  resource,
  action,
  riskLevel,
  requiresApproval,
});

export const COMPANY_PERMISSIONS: readonly CompanyPermission[] = [
  permission("research", "create"),
  permission("research", "edit"),
  permission("research", "submit", "medium"),
  permission("research", "approve", "high", true),
  permission("research", "publish", "critical", true),
  permission("intelligence", "view"),
  permission("intelligence", "publish", "high", true),
  permission("methodology", "view"),
  permission("methodology", "manage", "critical", true),
  permission("payment", "create", "medium"),
  permission("payment", "approve", "critical", true),
  permission("procurement", "create", "medium"),
  permission("procurement", "approve", "high", true),
  permission("deployment", "request", "high"),
  permission("deployment", "approve", "critical", true),
  permission("role", "assign", "critical", true),
  permission("audit", "view", "high"),
] as const;

export type CompanyAccessContext = {
  authenticated: boolean;
  accountType?: CompanyAccountType;
  subRoles?: readonly CompanySubRole[];
  permissions?: readonly string[];
  scope?: CompanyScope;
  resourceOwnerId?: string;
  actorId?: string;
  ownerDomain?: CompanyAccountType;
  resourceState?: "draft" | "review" | "approved" | "published";
  requiresApproval?: boolean;
  approvalSatisfied?: boolean;
};

export function canAccessCompanyWorkflow(
  context: CompanyAccessContext,
  requiredPermission: string,
): boolean {
  if (!context.authenticated || !context.accountType) return false;
  if (!context.permissions?.includes(requiredPermission)) return false;
  if (context.requiresApproval && !context.approvalSatisfied) return false;
  if (requiredPermission === "audit.delete") return false;

  switch (context.scope) {
    case "own":
      return Boolean(context.actorId && context.actorId === context.resourceOwnerId);
    case "assigned":
      return true;
    case "team":
      return Boolean(context.subRoles?.length);
    case "domain":
      return Boolean(context.ownerDomain && context.ownerDomain === context.accountType);
    case "global":
      return context.accountType === "CONTROL";
    default:
      return false;
  }
}

export function canApproveOwnRequest(requestedBy: string, approver: string): boolean {
  return Boolean(requestedBy && approver && requestedBy !== approver);
}

export function getCompanyPermission(code: string): CompanyPermission | undefined {
  return COMPANY_PERMISSIONS.find((item) => item.code === code);
}

export const COMPANY_OPERATIONAL_STATE = ["draft", "review", "approved", "published"] as const;

export function canTransitionCompanyState(
  current: (typeof COMPANY_OPERATIONAL_STATE)[number],
  next: (typeof COMPANY_OPERATIONAL_STATE)[number],
): boolean {
  const transitions: Record<string, string[]> = {
    draft: ["review"],
    review: ["approved", "draft"],
    approved: ["published", "draft"],
    published: [],
  };
  return transitions[current]?.includes(next) ?? false;
}
