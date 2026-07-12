import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Star } from "lucide-react";
import {
  addToWatchlist as addWatchlist,
  getWatchlist as listWatchlist,
  removeFromWatchlist as removeWatchlist,
} from "@/lib/watchlist.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/watchlist")({
  validateSearch: (s: Record<string, unknown>) => z.object({ add: z.string().optional() }).parse(s),
  component: WatchlistPage,
});

function WatchlistPage() {
  const search = Route.useSearch();
  const [ticker, setTicker] = useState(search.add?.toUpperCase() ?? "");
  const [note, setNote] = useState("");
  const q = useQuery({ queryKey: ["watchlist"], queryFn: () => listWatchlist() });

  useEffect(() => {
    if (search.add) setTicker(search.add.toUpperCase());
  }, [search.add]);

  const add = useMutation({
    mutationFn: () => addWatchlist({ ticker, note: note || undefined }),
    onSuccess: () => {
      setTicker("");
      setNote("");
      toast.success("Ditambahkan ke watchlist");
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeWatchlist({ id }),
    onSuccess: () => q.refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Personal
        </div>
        <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
          Watchlist
        </h2>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
          Daftar saham yang ingin Anda pantau. Disimpan privat per akun.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              Tambah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Ticker (BBCA)"
              className="font-mono uppercase"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
            <Input
              placeholder="Catatan (opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={!ticker || add.isPending}
              onClick={() => add.mutate()}
            >
              <Plus className="mr-2 h-4 w-4" /> Tambah
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
              {q.data?.length ?? 0} saham dipantau
            </CardTitle>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (q.data?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Star className="h-6 w-6 text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground">
                  Watchlist kosong. Tambahkan ticker pertama Anda.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {q.data!.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold">{w.ticker}</div>
                      {w.note && (
                        <div className="truncate text-[11px] text-muted-foreground">{w.note}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove.mutate(w.id)}
                      aria-label={`Hapus ${w.ticker}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
