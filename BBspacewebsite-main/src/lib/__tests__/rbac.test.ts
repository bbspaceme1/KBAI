import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireRole } from "../rbac";
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
