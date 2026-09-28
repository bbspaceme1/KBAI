import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/emergency-fund/history")({
  component: EmergencyFundHistoryPage,
});
function EmergencyFundHistoryPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/emergency-fund" aria-label="Kembali ke Dana Darurat">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dana Darurat</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Riwayat perhitungan</h2>
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <History className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Riwayat akan tersedia setelah setup tersimpan</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Versi tanpa migrasi ini menyediakan alur dan preview engine tanpa menulis data finansial.
          Penyimpanan append-only, RLS, dan riwayat reproducible akan diaktifkan setelah migration
          disetujui.
        </p>
        <Button className="mt-5" asChild>
          <Link to="/emergency-fund/setup">Mulai setup</Link>
        </Button>
      </div>
    </div>
  );
}
