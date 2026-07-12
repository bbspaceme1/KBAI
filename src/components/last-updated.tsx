import { Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function LastUpdated({
  at,
  source,
  className,
}: {
  at?: string | Date | null;
  source?: string;
  className?: string;
}) {
  if (!at) return null;
  const date = typeof at === "string" ? new Date(at) : at;
  const rel = formatDistanceToNow(date, { addSuffix: true, locale: idLocale });
  const abs = format(date, "dd MMM yyyy HH:mm", { locale: idLocale });
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border border-border bg-card/40 px-2 py-1 text-caption text-muted-foreground",
        className,
      )}
      title={`${abs}${source ? ` · ${source}` : ""}`}
    >
      <Clock className="h-3 w-3" aria-hidden />
      <span>Diperbarui {rel}</span>
      {source && <span className="text-muted-foreground/70">· {source}</span>}
    </div>
  );
}
