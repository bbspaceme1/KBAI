import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { tokens } from "./tokens";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Footer } from "./Footer";
import { SectionLabel } from "./SectionLabel";
import { Tag } from "./Tag";
import { TickerItem, Metric, FrameworkLayer } from "./landing.types";

interface ImprovedLandingPageProps {
  showDisclaimer?: boolean;
  metrics?: Metric[];
  frameworks?: FrameworkLayer[];
}

/**
 * Improved Landing Page Component
 * Fully modularized, accessible, and mobile-optimized
 */
export const ImprovedLandingPage: React.FC<ImprovedLandingPageProps> = ({
  showDisclaimer = true,
  metrics = [
    { label: "Total AUM Komunitas", value: "Rp 48.2M", change: "▲ 12.4% YTD" },
    { label: "Sharpe Ratio", value: "1.84", change: "▲ 0.18 vs benchmark" },
    { label: "Avg Drawdown", value: "−8.2%", change: "▼ −3.6% vs S&P" },
    { label: "Members Aktif", value: "3,247", change: "↑ +28% MoM" },
  ],
  frameworks = [
    {
      num: "01",
      title: "Data Aggregation Layer",
      sub: "Multi-broker, multi-asset",
      desc: "Konsolidasi data real-time dari berbagai broker dan exchange ke dalam satu dashboard terpadu.",
      tags: ["Real-time", "REST API", "WebSocket"],
      icon: "⚡",
    },
    {
      num: "02",
      title: "Intelligence Engine",
      sub: "AI-powered analysis",
      desc: "Analisis teknikal, fundamental, dan sentiment dengan machine learning untuk memberikan signal yang akurat.",
      tags: ["ML", "NLP", "Backtesting"],
      icon: "🧠",
    },
    {
      num: "03",
      title: "Trigger System",
      sub: "Automated alerts",
      desc: "Set trigger berbasis kondisi pasar dan alert real-time untuk opportunity dan risk management.",
      tags: ["Alerts", "Rules Engine", "Webhooks"],
      icon: "🎯",
    },
    {
      num: "04",
      title: "Community Layer",
      sub: "Peer insights",
      desc: "Share analysis, ideas, dan track record dengan komunitas. Learn dari track record terbaik.",
      tags: ["Social", "Leaderboard", "Alpha"],
      icon: "👥",
    },
    {
      num: "05",
      title: "Portfolio Manager",
      sub: "Risk-aware allocation",
      desc: "Optimasi portfolio berdasarkan risk profile, diversifikasi, dan correlation analysis.",
      tags: ["Optimization", "Risk", "Rebalance"],
      icon: "📊",
    },
  ],
}) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const navLinks = [
    { label: "Performance", href: "#performance" },
    { label: "Framework", href: "#framework" },
    { label: "Intelligence", href: "#advisor" },
    { label: "Community", href: "#community" },
    { label: "System", href: "#system" },
  ];

  const handleHeroAction = (action: "demo" | "learn") => {
    if (action === "demo") {
      navigate({ to: "/request-access" });
    } else {
      const target = document.querySelector("#framework");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSecondaryScroll = (scrolledState: boolean) => {
    setScrolled(scrolledState);
  };

  return (
    <div
      style={{
        background: tokens.color.bg,
        color: tokens.color.text,
        overflow: "hidden",
      }}
    >
      {/* Navbar */}
      <Navbar links={navLinks} onScroll={handleSecondaryScroll} />

      {/* Hero Section */}
      <Hero onCTA={handleHeroAction} />

      {/* Stats Section */}
      <section
        id="performance"
        style={{
          padding: "80px 24px",
          background: tokens.color.surface,
          borderTop: `1px solid ${tokens.color.border}`,
          borderBottom: `1px solid ${tokens.color.border}`,
        }}
        className="section-padding"
        role="region"
        aria-label="Performance metrics"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {showDisclaimer && (
            <div
              style={{
                marginBottom: "32px",
                padding: "12px 16px",
                background: `rgba(${245},${158},${11}, 0.1)`,
                borderLeft: `3px solid ${tokens.color.warning}`,
                borderRadius: "4px",
              }}
              role="alert"
            >
              <p
                style={{
                  fontSize: "11px",
                  color: tokens.color.textMuted,
                  fontFamily: '"DM Mono", monospace',
                  margin: 0,
                  fontWeight: "500",
                }}
              >
                ⚠️ DATA ILLUSTRATIF · Berdasarkan historis komunitas KBAI. Data aktual tersedia
                setelah login untuk member terverifikasi.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "24px",
            }}
            className="stats-strip"
          >
            {metrics.map((metric, idx) => (
              <div
                key={idx}
                style={{
                  padding: "24px",
                  background: tokens.color.bg,
                  border: `1px solid ${tokens.color.border}`,
                  borderRadius: "8px",
                  animation: `slideInUp 0.6s ease-out ${idx * 0.1}s backwards`,
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: tokens.color.textMuted,
                    fontFamily: '"DM Mono", monospace',
                    margin: "0 0 8px 0",
                  }}
                >
                  {metric.label}{" "}
                  <span style={{ color: tokens.color.warning, fontSize: "10px" }}>SAMPLE</span>
                </p>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: tokens.color.text,
                    fontFamily: '"Syne", sans-serif',
                    margin: "0 0 8px 0",
                  }}
                >
                  {metric.value}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: tokens.color.accent,
                    fontFamily: '"DM Mono", monospace',
                    margin: 0,
                  }}
                >
                  {metric.change}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Framework Section */}
      <section
        id="framework"
        style={{
          padding: "80px 24px",
          borderBottom: `1px solid ${tokens.color.border}`,
        }}
        className="section-padding"
        role="region"
        aria-label="5-layer framework"
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <SectionLabel number="02" text="5-Layer Framework" />
          <p
            style={{
              fontSize: "16px",
              color: tokens.color.textMuted,
              lineHeight: "1.6",
              marginBottom: "60px",
              fontFamily: '"Instrument Sans", sans-serif',
              maxWidth: "600px",
            }}
          >
            Sistem KBAI dibangun dari lima lapisan yang saling terintegrasi untuk memberikan
            pemahaman menyeluruh tentang pasar dan portfolio Anda.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "32px",
            }}
            className="layers-grid"
          >
            {frameworks.map((fw, idx) => (
              <div
                key={fw.num}
                style={{
                  padding: "32px",
                  background: tokens.color.surface,
                  border: `1px solid ${tokens.color.border}`,
                  borderRadius: "8px",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  animation: `fadeUp 0.6s ease-out ${idx * 0.1}s backwards`,
                }}
                className="layer-card"
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-8px)";
                  el.style.borderColor = tokens.color.accent;
                  el.style.boxShadow = `0 20px 40px rgba(34,197,94,0.1)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.borderColor = tokens.color.border;
                  el.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    marginBottom: "12px",
                  }}
                  aria-hidden="true"
                >
                  {fw.icon}
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: tokens.color.accent,
                    fontFamily: '"DM Mono", monospace',
                    margin: "0 0 4px 0",
                    letterSpacing: "0.5px",
                  }}
                >
                  Layer {fw.num}
                </p>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: tokens.color.text,
                    fontFamily: '"Syne", sans-serif',
                    margin: "0 0 4px 0",
                  }}
                >
                  {fw.title}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: tokens.color.textMuted,
                    fontFamily: '"DM Mono", monospace',
                    margin: "0 0 12px 0",
                  }}
                >
                  {fw.sub}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: tokens.color.textMuted,
                    fontFamily: '"Instrument Sans", sans-serif',
                    margin: "0 0 16px 0",
                  }}
                >
                  {fw.desc}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {fw.tags.map((tag) => (
                    <Tag key={tag} variant="neutral">
                      {tag}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call-to-action Section */}
      <section
        style={{
          padding: "80px 24px",
          background: `linear-gradient(135deg, ${tokens.color.surface}, ${tokens.color.bg})`,
          borderTop: `1px solid ${tokens.color.border}`,
          textAlign: "center",
        }}
        role="region"
        aria-label="Call-to-action"
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "clamp(32px, 6vw, 48px)",
              fontWeight: "700",
              fontFamily: '"Syne", sans-serif',
              color: tokens.color.text,
              marginBottom: "16px",
              letterSpacing: "-0.5px",
            }}
          >
            Siap untuk mengambil kontrol?
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: tokens.color.textMuted,
              fontFamily: '"Instrument Sans", sans-serif',
              lineHeight: "1.6",
              marginBottom: "32px",
            }}
          >
            Bergabunglah dengan ribuan investor dan advisor yang telah mengubah cara mereka
            mengelola portfolio dan membuat keputusan investasi.
          </p>
          <button
            onClick={() => navigate({ to: "/request-access" })}
            style={{
              padding: "14px 40px",
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 20px 40px rgba(34,197,94,0.3)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            Mulai Sekarang
          </button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};
