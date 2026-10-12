import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined" && posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "memory",
    loaded: (client) => {
      if (import.meta.env.DEV) console.log("PostHog loaded");
    },
  });
}

export { posthog };
