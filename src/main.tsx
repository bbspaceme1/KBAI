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
    const currentUrl = `${window.location.origin}${window.location.pathname}`;
    posthog.capture("$pageview", { $current_url: currentUrl });
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
