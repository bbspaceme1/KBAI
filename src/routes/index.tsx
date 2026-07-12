import { createFileRoute } from "@tanstack/react-router";
import { ImprovedLandingPage } from "@/components/landing-upgraded";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KBAI — Investment Operating System" },
      {
        name: "description",
        content:
          "KBAI adalah sistem intelijen investasi multi-layer untuk advisor, komunitas, dan investor yang ingin mengambil keputusan berbasis data.",
      },
      { property: "og:title", content: "KBAI — Investment Operating System" },
      {
        property: "og:description",
        content:
          "Kelola portofolio dengan sistem, bukan feeling. Framework 5-layer, trigger engine, dan community alpha.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return <ImprovedLandingPage />;
}
