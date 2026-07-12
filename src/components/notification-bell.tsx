import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth";
import { listNotifications, markNotificationRead } from "@/lib/notifications.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications"],
    enabled: auth.isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () => listNotifications(),
  });

  const items = Array.isArray(q.data) ? q.data : [];
  const unread = items.filter((n) => !n.read_at).length;

  const markAll = useMutation({
    mutationFn: () => markNotificationRead({ all: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (open && unread > 0) {
      markAll.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!auth.isAuthenticated) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-card/60 text-muted-foreground hover:text-foreground"
        aria-label={`Notifikasi (${unread} baru)`}
      >
        <Bell className="h-3.5 w-3.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2 text-caption uppercase tracking-wider text-muted-foreground">
          <span>Notifikasi</span>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-accent"
            >
              <CheckCheck className="h-3 w-3" /> Tandai dibaca
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-caption text-muted-foreground">
              Belum ada notifikasi.
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border/60 px-3 py-2 last:border-0",
                  !n.read_at && "bg-accent/40",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="truncate text-body font-semibold">{n.title}</h4>
                  <span
                    className="font-mono text-[10px] text-muted-foreground"
                    title={format(new Date(n.created_at), "dd MMM yyyy HH:mm", {
                      locale: idLocale,
                    })}
                  >
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                      locale: idLocale,
                    })}
                  </span>
                </div>
                {n.body && (
                  <p className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">{n.body}</p>
                )}
                <div className="mt-1 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {n.kind}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
