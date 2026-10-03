// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, componentTagger (dev-only),
//     VITE_* env injection, @ path alias, React/TanStack dedupe, error logger plugins,
//     and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolve } from "node:path";

export default defineConfig({
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL ??
          process.env.NEXT_PUBLIC_SUPABASE_URL ??
          process.env.SUPABASE_URL,
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          process.env.SUPABASE_PUBLISHABLE_KEY,
      ),
    },
    resolve: {
      alias: [
        {
          find: "node:async_hooks",
          replacement: resolve(__dirname, "src/shims/node-async-hooks.ts"),
        },
      ],
    },
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              // Consolidate all core vendor libraries into single chunk to avoid circular deps
              if (
                id.includes("@tanstack/react-router") ||
                id.includes("@tanstack/react-start") ||
                id.includes("@radix-ui")
              ) {
                return "vendor-core";
              }
              if (id.includes("recharts")) {
                return "charts";
              }
              if (
                id.includes("date-fns") ||
                id.includes("clsx") ||
                id.includes("class-variance-authority")
              ) {
                return "utils";
              }
            }
          },
        },
      },
    },
  },
});
