import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Status = "loading" | "error" | "empty" | "ready";

export interface DataStateProps<T> {
  status?: Status;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  data?: T;
  isEmpty?: (d: T) => boolean;
  /** Skeleton count, default 4 */
  skeletonRows?: number;
  /** Custom skeleton override */
  skeleton?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  onRetry?: () => void;
  className?: string;
  children: (data: T) => ReactNode;
}

/**
 * Standard wrapper for fetched data: loading -> error -> empty -> ready.
 * Pairs well with React Query: pass `isLoading`, `isError`, `error`, `data`.
 */
export function DataState<T>({
  status,
  isLoading,
  isError,
  error,
  data,
  isEmpty,
  skeletonRows = 4,
  skeleton,
  emptyTitle = "Belum ada data",
  emptyDescription = "Data akan muncul di sini setelah tersedia.",
  emptyAction,
  emptyIcon,
  onRetry,
  className,
  children,
}: DataStateProps<T>) {
  const resolved: Status =
    status ??
    (isLoading
      ? "loading"
      : isError
        ? "error"
        : data === undefined || data === null
          ? "loading"
          : isEmpty?.(data)
            ? "empty"
            : "ready");

  if (resolved === "loading") {
    return (
      <div className={cn("space-y-2", className)}>
        {skeleton ??
          Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
      </div>
    );
  }

  if (resolved === "error") {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.";
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card/40 px-6 py-12 text-center",
          className,
        )}
        role="alert"
      >
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Gagal memuat data</h3>
          <p className="max-w-md text-xs text-muted-foreground">{msg}</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="h-8 text-xs">
            <Loader2 className="mr-1.5 h-3 w-3" /> Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (resolved === "empty") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-border bg-card/30 px-6 py-12 text-center",
          className,
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-accent/40">
          {emptyIcon ?? <Inbox className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{emptyTitle}</h3>
          <p className="max-w-md text-xs text-muted-foreground">{emptyDescription}</p>
        </div>
        {emptyAction}
      </div>
    );
  }

  return <>{children(data as T)}</>;
}
