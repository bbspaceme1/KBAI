import { describe, expect, it } from "vitest";
import {
  canAccessCompanyWorkflow,
  canApproveOwnRequest,
  canTransitionCompanyState,
  getCompanyPermission,
} from "@/lib/company-operations";

describe("company operations access model", () => {
  it("requires authentication, permission, scope, and approval", () => {
    expect(
      canAccessCompanyWorkflow(
        {
          authenticated: true,
          accountType: "FINANCE",
          permissions: ["payment.approve"],
          scope: "domain",
          ownerDomain: "FINANCE",
          requiresApproval: true,
          approvalSatisfied: false,
        },
        "payment.approve",
      ),
    ).toBe(false);

    expect(
      canAccessCompanyWorkflow(
        {
          authenticated: true,
          accountType: "FINANCE",
          permissions: ["payment.approve"],
          scope: "domain",
          ownerDomain: "FINANCE",
          requiresApproval: true,
          approvalSatisfied: true,
        },
        "payment.approve",
      ),
    ).toBe(true);
  });

  it("never permits audit deletion and prevents self approval", () => {
    expect(
      canAccessCompanyWorkflow(
        {
          authenticated: true,
          accountType: "CONTROL",
          permissions: ["audit.delete"],
          scope: "global",
        },
        "audit.delete",
      ),
    ).toBe(false);
    expect(canApproveOwnRequest("same", "same")).toBe(false);
    expect(canApproveOwnRequest("creator", "approver")).toBe(true);
  });

  it("enforces workflow state transitions", () => {
    expect(canTransitionCompanyState("draft", "review")).toBe(true);
    expect(canTransitionCompanyState("published", "draft")).toBe(false);
  });

  it("exposes risk and approval metadata", () => {
    expect(getCompanyPermission("research.publish")).toMatchObject({
      riskLevel: "critical",
      requiresApproval: true,
    });
  });
});
