/**
 * Landing Page Type Definitions
 * Centralized types for the improved landing page component
 */

export interface DesignTokens {
  color: {
    bg: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    borderHover: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    accent: string;
    accentDim: string;
    accentBorder: string;
    warning: string;
    danger: string;
    blue: string;
    gold: string;
  };
}

export interface NavLink {
  label: string;
  href: string;
}

export interface TickerItem {
  label: string;
  value: string;
  change: string;
  up?: boolean | null;
}

export interface FrameworkLayer {
  num: string;
  title: string;
  sub: string;
  desc: string;
  tags: string[];
  icon: string;
}

export interface Metric {
  label: string;
  value: string;
  change: string;
  up?: boolean | null;
}

export interface AllocationItem {
  name: string;
  pct: number;
  color: string;
}

export interface Scenario {
  type: string;
  title: string;
  desc: string;
  ret: string;
  prob: string;
  color: string;
}

export interface Trigger {
  condition: string;
  action: string;
  status: "ACTIVE" | "WATCH" | "STANDBY";
}

export interface Leaderboard {
  rank: string;
  id: string;
  type: string;
  alpha: string;
  ret: string;
  isBaseline?: boolean;
}

export interface EngineCard {
  num: string;
  title: string;
  desc: string;
  tags: string[];
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  icon: string;
  status: string;
  color: string;
  items: string[];
  done: boolean[];
}

export interface SocialProof {
  val: string;
  label: string;
}
