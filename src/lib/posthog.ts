import posthog from "posthog-js";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY?.trim();
const posthogHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

if (typeof window !== "undefined" && posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    persistence: "memory",
    person_profiles: "identified_only",
    loaded: () => {
      if (import.meta.env.DEV) console.info("PostHog analytics initialized");
    },
  });
}

export { posthog };
