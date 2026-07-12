import React from "react";
import { tokens } from "./tokens";

interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "neutral";
  className?: string;
}

/**
 * Tag/Badge component for labeling sections and features
 */
export const Tag: React.FC<TagProps> = ({ children, variant = "accent", className = "" }) => {
  const baseStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    fontFamily: '"DM Mono", monospace',
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    transition: "all 0.2s ease",
    border: "1px solid",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      ...baseStyle,
      backgroundColor: tokens.color.surface,
      color: tokens.color.text,
      borderColor: tokens.color.border,
    },
    accent: {
      ...baseStyle,
      backgroundColor: tokens.color.accentDim,
      color: tokens.color.accent,
      borderColor: tokens.color.accentBorder,
    },
    neutral: {
      ...baseStyle,
      backgroundColor: "transparent",
      color: tokens.color.textMuted,
      borderColor: tokens.color.border,
    },
  };

  return (
    <span style={variantStyles[variant]} className={className}>
      {children}
    </span>
  );
};
