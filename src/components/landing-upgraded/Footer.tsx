import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { tokens } from "./tokens";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  sections?: {
    title: string;
    links: FooterLink[];
  }[];
}

/**
 * Footer with links and branding
 */
export const Footer: React.FC<FooterProps> = ({
  sections = [
    {
      title: "Produk",
      links: [
        { label: "Platform", href: "#system" },
        { label: "Intelligence", href: "#advisor" },
        { label: "Community", href: "#community" },
        { label: "Pricing", href: "#pricing" },
      ],
    },
    {
      title: "Perusahaan",
      links: [
        { label: "Tentang", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Karir", href: "/careers" },
        { label: "Hubungi Kami", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privasi", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Keamanan", href: "/security" },
        { label: "Compliance", href: "/compliance" },
      ],
    },
  ],
}) => {
  const navigate = useNavigate();

  const handleLinkClick = (href: string) => {
    if (href.startsWith("#")) {
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate({ to: href });
    }
  };

  return (
    <footer
      style={{
        background: tokens.color.bg,
        borderTop: `1px solid ${tokens.color.border}`,
        padding: "60px 24px 40px",
      }}
      role="contentinfo"
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top Section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "40px",
            marginBottom: "60px",
            paddingBottom: "40px",
            borderBottom: `1px solid ${tokens.color.border}`,
          }}
          className="asset-row"
        >
          {sections.map((section) => (
            <div key={section.title}>
              <h4
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: tokens.color.textMuted,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                  fontFamily: '"DM Mono", monospace',
                }}
              >
                {section.title}
              </h4>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {section.links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleLinkClick(link.href)}
                      style={{
                        background: "none",
                        border: "none",
                        color: tokens.color.textMuted,
                        fontSize: "14px",
                        fontWeight: "400",
                        cursor: "pointer",
                        transition: "color 0.2s ease",
                        fontFamily: '"Instrument Sans", sans-serif',
                        padding: "4px 0",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = tokens.color.accent;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = tokens.color.textMuted;
                      }}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                background: tokens.color.accent,
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "12px",
                color: tokens.color.bg,
                fontFamily: '"Syne", sans-serif',
              }}
            >
              KB
            </div>
            <span
              style={{
                fontSize: "14px",
                color: tokens.color.text,
                fontFamily: '"Syne", sans-serif',
              }}
            >
              KB<span style={{ color: tokens.color.accent }}>AI</span>
            </span>
          </div>

          <p
            style={{
              fontSize: "12px",
              color: tokens.color.textMuted,
              margin: 0,
              fontFamily: '"Instrument Sans", sans-serif',
            }}
          >
            © 2026 KBAI. Semua hak dilindungi. Data dan insight tunduk pada compliance dan regulasi
            lokal.
          </p>

          {/* Social Links */}
          <div
            style={{
              display: "flex",
              gap: "16px",
            }}
          >
            {[
              { label: "Twitter", href: "https://twitter.com" },
              { label: "LinkedIn", href: "https://linkedin.com" },
              { label: "GitHub", href: "https://github.com" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "12px",
                  color: tokens.color.textMuted,
                  textDecoration: "none",
                  transition: "color 0.2s ease",
                  fontFamily: '"Instrument Sans", sans-serif',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = tokens.color.accent;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = tokens.color.textMuted;
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
