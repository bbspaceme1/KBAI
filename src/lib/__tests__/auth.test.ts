import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStartContext } from "@tanstack/start-storage-context";

type StartContext = {
  request: Request;
  contextAfterGlobalMiddlewares: object;
  executedRequestMiddlewares: Set<unknown>;
  handlerType: string;
  getRouter: () => Promise<unknown>;
  requestAssets: unknown[];
  startOptions: object;
};

vi.mock("@/integrations/supabase/client.server", async () => {
  const actual = await vi.importActual<typeof import("@/integrations/supabase/client.server")>(
    "@/integrations/supabase/client.server",
  );
  return {
    ...actual,
    supabaseAdmin: {
      auth: {
        getUser: vi.fn(),
      },
    },
  };
});

vi.mock("@tanstack/start-storage-context", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/start-storage-context")>(
    "@tanstack/start-storage-context",
  );
  return {
    ...actual,
    getStartContext: vi.fn(),
  };
});

describe("Auth Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("request with valid bearer token returns userId", async () => {
    const mockedContext: StartContext = {
      request: new Request("https://example.com", {
        headers: { Authorization: "Bearer valid-token" },
      }),
      contextAfterGlobalMiddlewares: {},
      executedRequestMiddlewares: new Set(),
      handlerType: "serverFn",
      getRouter: async () => ({}),
      requestAssets: [],
      startOptions: {},
    };

    vi.mocked(getStartContext).mockReturnValue(
      mockedContext as unknown as ReturnType<typeof getStartContext>,
    );
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await requireSupabaseAuth();

    expect(result.userId).toBe("user-123");
    expect(result.claims).toEqual({ sub: "user-123", app_metadata: {} });
    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith("valid-token");
  });

  test("request with admin roles in app metadata returns them in claims", async () => {
    const mockedContext: StartContext = {
      request: new Request("https://example.com", {
        headers: { Authorization: "Bearer valid-token" },
      }),
      contextAfterGlobalMiddlewares: {},
      executedRequestMiddlewares: new Set(),
      handlerType: "serverFn",
      getRouter: async () => ({}),
      requestAssets: [],
      startOptions: {},
    };

    vi.mocked(getStartContext).mockReturnValue(
      mockedContext as unknown as ReturnType<typeof getStartContext>,
    );
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: "admin-123",
          app_metadata: { roles: ["admin"] },
        },
      },
      error: null,
    });

    const result = await requireSupabaseAuth();

    expect(result.userId).toBe("admin-123");
    expect(result.claims).toEqual({ sub: "admin-123", app_metadata: { roles: ["admin"] } });
  });

  test("request without Authorization header throws Authentication required", async () => {
    const mockedContext: StartContext = {
      request: new Request("https://example.com"),
      contextAfterGlobalMiddlewares: {},
      executedRequestMiddlewares: new Set(),
      handlerType: "serverFn",
      getRouter: async () => ({}),
      requestAssets: [],
      startOptions: {},
    };

    vi.mocked(getStartContext).mockReturnValue(
      mockedContext as unknown as ReturnType<typeof getStartContext>,
    );
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("No auth"),
    });

    await expect(requireSupabaseAuth()).rejects.toThrow("Authentication required");
    expect(supabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  test("request with invalid token throws Authentication required", async () => {
    const mockedContext: StartContext = {
      request: new Request("https://example.com", {
        headers: { Authorization: "Bearer invalid-token" },
      }),
      contextAfterGlobalMiddlewares: {},
      executedRequestMiddlewares: new Set(),
      handlerType: "serverFn",
      getRouter: async () => ({}),
      requestAssets: [],
      startOptions: {},
    };

    vi.mocked(getStartContext).mockReturnValue(
      mockedContext as unknown as ReturnType<typeof getStartContext>,
    );
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error("Invalid token"),
    });

    await expect(requireSupabaseAuth()).rejects.toThrow("Authentication required");
    expect(supabaseAdmin.auth.getUser).toHaveBeenCalledWith("invalid-token");
  });
});
