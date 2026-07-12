import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listEconomicEvents } from "@/lib/economic.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays } from "lucide-react";
import { format, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/ekonomi/calendar")({
  component: EkonomiCalendarPage,
});

function EkonomiCalendarPage() {
  const [country, setCountry] = useState<string>("ALL");
  const range = useMemo(
    () => ({
      from: format(addDays(new Date(), -7), "yyyy-MM-dd"),
      to: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    }),
    [],
  );

  const q = useQuery({
    queryKey: ["economic-events", range, country],
    queryFn: () =>
      listEconomicEvents({
        from: range.from,
        to: range.to,
        country: country === "ALL" ? undefined : country,
      }),
  });

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Economic
        </div>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Economic Calendar
        </h2>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
          Jadwal rilis indikator ekonomi penting. Sumber: BPS, BI, FRED, World Bank (di-ingest oleh
          admin).
        </p>
      </div>

      <Card className="rounded-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
          <CardTitle className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em]">
            <CalendarDays className="h-4 w-4" /> {q.data?.length ?? 0} event ({range.from} →{" "}
            {range.to})
          </CardTitle>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-8 w-32 rounded-sm text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="IDN">Indonesia</SelectItem>
              <SelectItem value="USA">United States</SelectItem>
              <SelectItem value="CHN">China</SelectItem>
              <SelectItem value="EUR">Euro Area</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Tanggal</TableHead>
                  <TableHead>Negara</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Importance</TableHead>
                  <TableHead className="text-right">Forecast</TableHead>
                  <TableHead className="text-right">Previous</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[13px] tabular">
                {q.isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Memuat…
                    </TableCell>
                  </TableRow>
                )}
                {!q.isLoading && (q.data?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      Belum ada event terjadwal. Admin dapat menambahkan via Supabase.
                    </TableCell>
                  </TableRow>
                )}
                {(q.data ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {format(new Date(e.event_date), "EEE, dd MMM", { locale: idLocale })}
                      {e.event_time && <span className="ml-1">{e.event_time.slice(0, 5)}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {e.country}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {e.category}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          e.importance === 3
                            ? "text-neg"
                            : e.importance === 2
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {"●".repeat(e.importance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {e.forecast ?? "—"}
                      {e.unit && e.forecast != null ? ` ${e.unit}` : ""}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {e.previous ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        e.actual != null && e.forecast != null
                          ? Number(e.actual) >= Number(e.forecast)
                            ? "text-pos"
                            : "text-neg"
                          : ""
                      }`}
                    >
                      {e.actual ?? "—"}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{e.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
