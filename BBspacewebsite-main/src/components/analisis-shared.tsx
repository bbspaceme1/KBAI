import { Card, CardContent } from "@/components/ui/card";

export function ModuleHeader({
  role,
  title,
  description,
}: {
  role: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border pb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {role}
      </div>
      <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground">
      Informasi yang disajikan hanya untuk tujuan edukasi dan riset. Bukan merupakan rekomendasi
      investasi. Selalu konsultasikan keputusan investasi dengan penasihat keuangan berlisensi.
    </p>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <Card className="border-dashed border-border bg-card/40">
      <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Module Output
        </div>
        <div className="font-serif text-base text-foreground/80">
          Siap dikoneksikan ke engine analisis
        </div>
        <p className="max-w-md text-[12px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
