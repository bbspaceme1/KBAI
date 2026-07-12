import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { tokens } from "./tokens";
import { NavLink as NavLinkType } from "./landing.types";

interface NavbarProps {
  links: NavLinkType[];
  onScroll?: (scrolled: boolean) => void;
}

/**
 * Fixed navigation bar with scroll detection and mobile menu
 */
export const Navbar: React.FC<NavbarProps> = ({ links, onScroll }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
      onScroll?.(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [onScroll]);

  const handleNavClick = (href: string) => {
    if (href === "#login") {
      navigate({ to: "/login" });
    } else if (href.startsWith("#")) {
      // Smooth scroll to section
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileOpen(false);
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        background: scrolled ? `rgba(${7}, ${8}, ${10}, 0.95)` : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? `1px solid ${tokens.color.border}` : "transparent",
        transition: "all 0.3s ease",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            background: tokens.color.accent,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "14px",
            color: tokens.color.bg,
            fontFamily: '"Syne", sans-serif',
          }}
        >
          KB
        </div>
        <span
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: tokens.color.text,
            fontFamily: '"Syne", sans-serif',
          }}
        >
          KB<span style={{ color: tokens.color.accent }}>AI</span>
        </span>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-10">
        {links.map((link) => (
          <button
            key={link.href}
            onClick={() => handleNavClick(link.href)}
            style={{
              background: "none",
              border: "none",
              color: tokens.color.text,
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "color 0.2s ease",
              fontFamily: '"Instrument Sans", sans-serif',
              padding: "8px 0",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.accent;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = tokens.color.text;
            }}
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={() => handleNavClick("#login")}
          style={{
            background: "none",
            border: `1px solid ${tokens.color.border}`,
            color: tokens.color.text,
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.2s ease",
            fontFamily: '"Instrument Sans", sans-serif',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = tokens.color.accent;
            btn.style.color = tokens.color.accent;
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = tokens.color.border;
            btn.style.color = tokens.color.text;
          }}
        >
          Login
        </button>
        <button
          onClick={() => navigate({ to: "/request-access" })}
          style={{
            background: tokens.color.accent,
            border: "none",
            color: tokens.color.bg,
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
            fontFamily: '"Instrument Sans", sans-serif',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          Mulai Sekarang
        </button>
      </div>

      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex md:hidden flex-col gap-1.5 p-2"
        style={{
          background: "none",
          border: "none",
          color: tokens.color.text,
          cursor: "pointer",
        }}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
      >
        <span
          style={{
            width: "24px",
            height: "2px",
            background: tokens.color.text,
            transition: "all 0.3s ease",
            transform: mobileOpen ? "rotate(45deg) translateY(10px)" : "none",
          }}
        />
        <span
          style={{
            width: "24px",
            height: "2px",
            background: tokens.color.text,
            transition: "all 0.3s ease",
            opacity: mobileOpen ? 0 : 1,
          }}
        />
        <span
          style={{
            width: "24px",
            height: "2px",
            background: tokens.color.text,
            transition: "all 0.3s ease",
            transform: mobileOpen ? "rotate(-45deg) translateY(-10px)" : "none",
          }}
        />
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: tokens.color.bg,
            borderBottom: `1px solid ${tokens.color.border}`,
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            gap: "8px",
          }}
          role="menu"
        >
          {links.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              style={{
                background: "none",
                border: "none",
                color: tokens.color.text,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                padding: "12px",
                textAlign: "left",
                fontFamily: '"Instrument Sans", sans-serif',
              }}
              role="menuitem"
            >
              {link.label}
            </button>
          ))}
          <div
            style={{
              height: "1px",
              background: tokens.color.border,
              margin: "8px 0",
            }}
          />
          <button
            onClick={() => handleNavClick("#login")}
            style={{
              background: "none",
              border: "none",
              color: tokens.color.text,
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              padding: "12px",
              textAlign: "left",
              fontFamily: '"Instrument Sans", sans-serif',
            }}
            role="menuitem"
          >
            Login
          </button>
          <button
            onClick={() => navigate({ to: "/request-access" })}
            style={{
              background: tokens.color.accent,
              border: "none",
              color: tokens.color.bg,
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              padding: "12px",
              borderRadius: "6px",
              fontFamily: '"Instrument Sans", sans-serif',
            }}
            role="menuitem"
          >
            Mulai Sekarang
          </button>
        </div>
      )}
    </nav>
  );
};
