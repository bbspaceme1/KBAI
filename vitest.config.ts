import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      // Risk-critical KBAI business logic. UI primitives, generated route trees,
      // scripts, E2E specs and tests themselves are not production-code coverage.
      include: [
        "src/lib/ai-quota.ts",
        "src/lib/billing.ts",
        "src/lib/company-operations.ts",
        "src/lib/csv-export.ts",
        "src/lib/emergency-fund-engine.ts",
        "src/lib/entitlements.ts",
        "src/lib/feature-flags.ts",
        "src/lib/idx-bei.ts",
        "src/lib/market-data-provider.ts",
        "src/lib/performance-engine.functions.ts",
        "src/lib/persistent-feature-flags.ts",
        "src/lib/portfolio.functions.ts",
        "src/lib/rate-limiter.ts",
        "src/lib/rbac.ts",
        "src/lib/telegram-verification.server.ts",
        "src/lib/twofa.functions.ts",
        "src/lib/validation.ts",
      ],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "e2e/**",
        "scripts/**",
        "src/routeTree.gen.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.test.*",
        "**/__tests__/**",
        "**/mockData/*",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
