import React from "react";
import { tokens } from "./tokens";

interface SectionLabelProps {
  number: string;
  text: string;
  className?: string;
}

/**
 * Section label with number for visual hierarchy
 */
export const SectionLabel: React.FC<SectionLabelProps> = ({ number, text, className = "" }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
      }}
      className={className}
    >
      <span
        style={{
          fontFamily: '"DM Mono", monospace',
          fontSize: "14px",
          fontWeight: "500",
          color: tokens.color.accent,
          opacity: 0.7,
          letterSpacing: "0.5px",
        }}
      >
        {number}
      </span>
      <h3
        style={{
          fontSize: "24px",
          fontWeight: "600",
          color: tokens.color.text,
          margin: 0,
          fontFamily: '"Syne", sans-serif',
          letterSpacing: "-0.5px",
        }}
      >
        {text}
      </h3>
    </div>
  );
};
