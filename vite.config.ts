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
              if (id.includes("@tanstack/react-router") || id.includes("@tanstack/react-start")) {
                return "router";
              }
              if (id.includes("@radix-ui")) {
                return "ui";
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
