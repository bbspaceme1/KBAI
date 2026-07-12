/**
 * Landing Page Global Styles
 * Animations, keyframes, and utility styles for landing components
 */

export const globalStyles = `
  /* ══ ANIMATIONS ══ */
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes scrollLeft {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }

  @keyframes glow {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  @keyframes drawLine {
    from {
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
    }
    to {
      stroke-dasharray: 1000;
      stroke-dashoffset: 0;
    }
  }

  /* ══ UTILITY CLASSES ══ */
  .reveal {
    animation: fadeUp 0.6s ease-out 0s forwards;
    opacity: 0;
  }

  .reveal.in {
    opacity: 1;
  }

  .hover-lift {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  }

  .focus-ring:focus {
    outline: 2px solid #22C55E;
    outline-offset: 2px;
  }

  .pointer-none {
    pointer-events: none;
  }

  .pointer-auto {
    pointer-events: auto;
  }

  .truncate-line {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .truncate-lines-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ══ RESPONSIVE BREAKPOINTS ══ */

  /* Tablet and smaller desktop */
  @media (max-width: 1100px) {
    .hero-section {
      padding: 80px 24px 60px !important;
    }

    .hero-title {
      font-size: clamp(48px, 8vw, 96px) !important;
    }

    .hero-subtitle {
      font-size: clamp(16px, 2.5vw, 20px) !important;
    }

    .layers-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 24px !important;
    }

    .stats-strip {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }

  /* Tablet */
  @media (max-width: 768px) {
    .hero-section {
      padding: 100px 20px 60px !important;
      min-height: auto !important;
    }

    .hero-title {
      font-size: clamp(36px, 10vw, 60px) !important;
    }

    .hero-subtitle {
      font-size: clamp(14px, 2vw, 18px) !important;
    }

    .hero-actions {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 16px !important;
    }

    .layers-grid {
      grid-template-columns: 1fr !important;
    }

    .stats-strip {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .kpi-strip {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    .section-padding {
      padding: 60px 20px !important;
    }

    .asset-row {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }

  /* Mobile */
  @media (max-width: 480px) {
    .hero-section {
      padding: 80px 16px 40px !important;
    }

    .hero-title {
      font-size: clamp(32px, 9vw, 48px) !important;
    }

    .hero-subtitle {
      font-size: clamp(14px, 2.5vw, 16px) !important;
    }

    .hero-actions {
      width: 100% !important;
    }

    .hero-cta {
      width: 100% !important;
      text-align: center !important;
    }

    .stats-strip {
      grid-template-columns: 1fr !important;
    }

    .asset-row {
      grid-template-columns: 1fr !important;
    }

    .layers-grid {
      grid-template-columns: 1fr !important;
    }

    .nav-right .nav-cta {
      display: none !important;
    }

    .section-padding {
      padding: 40px 16px !important;
    }

    .layer-card {
      padding: 24px 20px !important;
    }
  }
`;

export const cssModule = `
/* Landing page animations module */

.fadeUp {
  animation: fadeUp 0.6s ease-out forwards;
}

.slideInLeft {
  animation: slideInFromLeft 0.8s ease-out forwards;
}

.slideInRight {
  animation: slideInFromRight 0.8s ease-out forwards;
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.scrollLeft {
  animation: scrollLeft 20s linear infinite;
}

.glow {
  animation: glow 3s ease-in-out infinite;
}

.shimmer {
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

.drawLine {
  animation: drawLine 1s ease-out forwards;
}
`;
