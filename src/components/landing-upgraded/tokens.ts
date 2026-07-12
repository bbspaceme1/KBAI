/**
 * Landing Page Design Tokens
 * Now unified with global CSS variables for consistency
 */

import { DesignTokens } from "./landing.types";

export const tokens: DesignTokens = {
  color: {
    bg: "var(--background)",
    surface: "var(--card)",
    surfaceElevated: "var(--popover)",
    border: "var(--border)",
    borderHover: "rgba(255,255,255,0.12)",
    text: "var(--foreground)",
    textMuted: "var(--muted-foreground)",
    textSubtle: "var(--muted)",
    accent: "var(--accent)",
    accentDim: "rgba(34,197,94,0.12)",
    accentBorder: "rgba(34,197,94,0.25)",
    warning: "#F59E0B",
    danger: "var(--destructive)",
    blue: "#3B82F6",
    gold: "#D97706",
  },
};

export const mediaQueryBreakpoints = {
  mobile: "max-width: 480px",
  tablet: "max-width: 768px",
  desktop: "min-width: 769px",
};

export const animationDurations = {
  fast: "0.2s",
  normal: "0.5s",
  slow: "0.7s",
  extended: "1s",
};
