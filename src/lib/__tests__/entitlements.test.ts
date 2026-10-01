import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, adminMock, fromMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/auth-middleware", () => ({
  requireSupabaseAuth: authMock,
}));
vi.mock("@/lib/rbac", () => ({ requireAdminAccess: adminMock }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: fromMock },
}));

import { getFinanceKpis } from "@/lib/entitlements";

describe("finance KPI authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "session-user" });
    adminMock.mockResolvedValue("session-user");
    fromMock.mockImplementation((table: string) => {
      if (table === "revenue_records") {
        return {
          select: () => ({ gte: async () => ({ data: [], error: null }) }),
        };
      }
      return {
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      };
    });
  });

  it("requires the authenticated admin before reading company-wide totals", async () => {
    await getFinanceKpis();

    expect(authMock).toHaveBeenCalledOnce();
    expect(adminMock).toHaveBeenCalledWith("session-user");
    expect(fromMock).toHaveBeenCalledWith("revenue_records");
    expect(fromMock).toHaveBeenCalledWith("company_subscriptions");
  });

  it("does not query finance data when admin authorization fails", async () => {
    adminMock.mockRejectedValueOnce(new Response("Forbidden", { status: 403 }));

    await expect(getFinanceKpis()).rejects.toMatchObject({ status: 403 });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
