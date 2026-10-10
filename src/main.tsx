import "./lib/monitoring";
import { posthog } from "./lib/posthog";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
});

if (import.meta.env.VITE_POSTHOG_KEY) {
  router.subscribe("onResolved", () => {
    // Use the route template, not the raw pathname, so IDs and user-provided
    // path segments are never sent to analytics.
    const routeId = router.state.matches.at(-1)?.routeId;
    const safeRoute = routeId?.startsWith("/") ? routeId : "/";
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${safeRoute}`,
    });
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
