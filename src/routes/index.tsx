import { createFileRoute } from "@tanstack/react-router";
import { ImprovedLandingPage } from "@/components/landing-upgraded";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KBAI Terminal — Investment Operating System" },
      {
        name: "description",
        content:
          "KBAI Terminal menggabungkan intelijen pasar IDX, pelacakan portofolio, perbandingan benchmark, dan intelijen komunitas yang terstruktur.",
      },
      { property: "og:title", content: "KBAI Terminal — Investment Operating System" },
      {
        property: "og:description",
        content:
          "Kelola portofolio dengan sistem dan data. Bandingkan performa, pantau alokasi, dan gunakan intelijen pasar serta komunitas secara terstruktur.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return <ImprovedLandingPage />;
}
