import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireCompanyResearchAccess, requireRole } from "../rbac";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a user without the required role", async () => {
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { role: "viewer" }, error: null }),
    } as never);

    await expect(requireRole("user-1", "admin")).rejects.toThrow("Forbidden: admin role required");
  });
});

describe("requireCompanyResearchAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["user", false],
    ["admin", true],
    ["advisor", true],
  ])("%s role has the expected research access", async (role, allowed) => {
    const fromMock = vi.mocked(supabaseAdmin.from);
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ role }], error: null }),
    } as never);

    if (allowed) {
      await expect(requireCompanyResearchAccess("user-1")).resolves.toBe("user-1");
    } else {
      await expect(requireCompanyResearchAccess("user-1")).rejects.toThrow(
        "Forbidden: company research access required",
      );
    }
  });
});
