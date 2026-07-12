import React, { useEffect, useState } from "react";
import { tokens } from "./tokens";
import { TickerItem } from "./landing.types";

interface HeroProps {
  title?: string;
  subtitle?: string;
  tickers?: TickerItem[];
  onCTA?: (action: "demo" | "learn") => void;
}

/**
 * Hero section with animated title and ticker
 */
export const Hero: React.FC<HeroProps> = ({
  title = "Kelola portofolio. Dengan sistem, bukan feeling.",
  subtitle = "KBAI adalah sistem intelijen investasi multi-layer yang dirancang untuk advisor, komunitas, dan investor yang ingin mengambil keputusan berbasis data.",
  tickers = [
    { label: "BTC/USD", value: "94,210", change: "+2.14%", up: true },
    { label: "IHSG", value: "7,218", change: "−0.38%", up: false },
    { label: "GOLD", value: "3,342", change: "+0.82%", up: true },
    { label: "BI Rate", value: "5.75%", change: "Stagnan", up: null },
  ],
  onCTA,
}) => {
  const [scrollHint, setScrollHint] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrollHint(window.scrollY < 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px 60px",
        background: `linear-gradient(135deg, ${tokens.color.bg}, ${tokens.color.surface})`,
        overflow: "hidden",
        textAlign: "center",
      }}
      className="hero-section"
      id="home"
      role="region"
      aria-label="Hero section"
    >
      {/* Background Orbs */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(34,197,94,0.1), transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          animation: "pulse 6s ease-in-out infinite",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: "10%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(59,130,246,0.1), transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          animation: "pulse 8s ease-in-out infinite",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: "800px" }}>
        {/* Eyebrow */}
        <p
          style={{
            fontSize: "12px",
            fontWeight: "500",
            color: tokens.color.accent,
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "24px",
            fontFamily: '"DM Mono", monospace',
            opacity: 0.8,
            animation: "fadeUp 0.8s ease-out",
          }}
        >
          Investment Operating System · Indonesia
        </p>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(32px, 8vw, 64px)",
            fontWeight: "700",
            fontFamily: '"Syne", sans-serif',
            lineHeight: "1.2",
            color: tokens.color.text,
            marginBottom: "24px",
            animation: "fadeUp 0.8s ease-out 0.1s backwards",
            letterSpacing: "-1px",
          }}
          className="hero-title"
        >
          Kelola portofolio.
          <br />
          <em
            style={{
              color: tokens.color.accent,
              fontStyle: "italic",
              fontWeight: "800",
            }}
          >
            Dengan sistem,
          </em>
          <br />
          bukan feeling.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "clamp(16px, 2vw, 18px)",
            lineHeight: "1.6",
            color: tokens.color.textMuted,
            marginBottom: "40px",
            fontFamily: '"Instrument Sans", sans-serif',
            maxWidth: "700px",
            animation: "fadeUp 0.8s ease-out 0.2s backwards",
          }}
          className="hero-subtitle"
        >
          {subtitle}
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            marginBottom: "60px",
            flexWrap: "wrap",
            animation: "fadeUp 0.8s ease-out 0.3s backwards",
          }}
          className="hero-actions"
        >
          <button
            onClick={() => onCTA?.("demo")}
            style={{
              padding: "12px 32px",
              background: tokens.color.accent,
              color: tokens.color.bg,
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: '"Instrument Sans", sans-serif',
              transition: "all 0.3s ease",
            }}
            className="hero-cta"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 20px 40px rgba(34,197,94,0.3)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            Lihat Intelligence Panel
          </button>
          <button
            onClick={() => onCTA?.("learn")}
            style={{
              padding: "12px 32px",
              background: "transparent",
              color: tokens.color.text,
              border: `1px solid ${tokens.color.border}`,
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: '"Instrument Sans", sans-serif',
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.color.accent;
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.color.border;
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text;
            }}
          >
            Pelajari Framework
          </button>
        </div>

        {/* Ticker */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            animation: "fadeUp 0.8s ease-out 0.4s backwards",
          }}
          aria-label="Live market ticker (illustrative data for demonstration)"
        >
          {tickers.map((ticker) => (
            <div
              key={ticker.label}
              style={{
                background: tokens.color.surface,
                border: `1px solid ${tokens.color.border}`,
                borderRadius: "8px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: tokens.color.textMuted,
                  marginBottom: "4px",
                  fontFamily: '"DM Mono", monospace',
                }}
              >
                {ticker.label}
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: tokens.color.text,
                  marginBottom: "4px",
                  fontFamily: '"DM Mono", monospace',
                }}
                aria-live="polite"
                aria-atomic="true"
              >
                {ticker.value}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color:
                    ticker.up === true
                      ? tokens.color.accent
                      : ticker.up === false
                        ? tokens.color.danger
                        : tokens.color.textMuted,
                  fontFamily: '"DM Mono", monospace',
                }}
              >
                {ticker.change}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Hint */}
      {scrollHint && (
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            animation: "fadeUp 1s ease-out 0.6s backwards",
            zIndex: 1,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: "1px",
              height: "20px",
              background: `linear-gradient(to bottom, ${tokens.color.accent}, transparent)`,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: tokens.color.textMuted,
              fontFamily: '"DM Mono", monospace',
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Scroll
          </span>
        </div>
      )}
    </section>
  );
};
