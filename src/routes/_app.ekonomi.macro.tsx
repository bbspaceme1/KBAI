import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMacroSnapshot } from "@/lib/ekonomi.functions";
import { DataState } from "@/components/data-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useState } from "react";

export const Route = createFileRoute("/_app/ekonomi/macro")({
  component: MacroPage,
});

const COUNTRIES = [
  { code: "IDN", label: "Indonesia" },
  { code: "MYS", label: "Malaysia" },
  { code: "THA", label: "Thailand" },
  { code: "PHL", label: "Filipina" },
  { code: "VNM", label: "Vietnam" },
];

function MacroPage() {
  const [country, setCountry] = useState("IDN");
  const fetchMacro = getMacroSnapshot;
  const q = useQuery({
    queryKey: ["ekonomi-macro", country],
    queryFn: () => fetchMacro({ country }),
    staleTime: 1000 * 60 * 60,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-border bg-card p-1">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setCountry(c.code)}
            className={`rounded-sm px-3 py-1.5 text-xs font-medium ${country === c.code ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <DataState
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        data={q.data}
        onRetry={() => q.refetch()}
        skeletonRows={4}
        isEmpty={(d) => !d.gdpGrowth.length}
      >
        {(d) => (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="GDP Growth (%)" data={d.gdpGrowth} />
            <ChartCard title="Inflasi CPI YoY (%)" data={d.cpi} />
            <ChartCard title="Pengangguran (%)" data={d.unemployment} />
            <ChartCard title="Current Account (% GDP)" data={d.currentAccountPctGdp} />
            <ChartCard
              title="Cadangan Devisa (USD Miliar)"
              data={d.reservesUsd.map((p) => ({ year: p.year, value: p.value / 1e9 }))}
            />
            <ChartCard
              title="GDP Total (USD Miliar)"
              data={d.gdpUsd.map((p) => ({ year: p.year, value: p.value / 1e9 }))}
            />
          </div>
        )}
      </DataState>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: { year: number; value: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Tidak ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" />
              <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} width={40} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
