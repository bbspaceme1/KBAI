import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Globe, Coins, BarChart3, Sparkles, CalendarDays } from "lucide-react";

type UserWithRoles = { app_metadata?: { roles?: Array<string | null> } } | null;

function getRolesFromUser(user: UserWithRoles) {
  const roles = user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles.map(String) : [];
}

export const Route = createFileRoute("/_app/ekonomi")({
  beforeLoad: async () => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) return;

    // First check JWT claims (fast path)
    const jwtRoles = getRolesFromUser(userData.user);
    let isAllowed = ["advisor", "admin"].some((r) => jwtRoles.includes(r));

    // Fallback to DB query if JWT claims don't have role info
    if (!isAllowed) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      isAllowed = !!roles?.some((r) => ["advisor", "admin"].includes(String(r.role)));
    }

    if (!isAllowed) throw redirect({ to: "/community" });
  },
  component: EkonomiLayout,
});

const TABS: Array<{
  to:
    | "/ekonomi"
    | "/ekonomi/macro"
    | "/ekonomi/global"
    | "/ekonomi/komoditas"
    | "/ekonomi/calendar"
    | "/ekonomi/ai-brief";
  label: string;
  icon: typeof BarChart3;
  exact?: boolean;
}> = [
  { to: "/ekonomi", label: "Dashboard", icon: BarChart3, exact: true },
  { to: "/ekonomi/macro", label: "Makro", icon: TrendingUp },
  { to: "/ekonomi/global", label: "Global", icon: Globe },
  { to: "/ekonomi/komoditas", label: "Komoditas", icon: Coins },
  { to: "/ekonomi/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/ekonomi/ai-brief", label: "AI Brief", icon: Sparkles },
];

function EkonomiLayout() {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Economic Intelligence · Indonesia
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Ekonomi Terminal</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monitoring makroekonomi nasional & global. Sumber data publik: World Bank, Yahoo Finance,
          FRED. Selalu validasi sebelum mengambil keputusan investasi.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border" role="tablist">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "border-foreground text-foreground" }}
            activeOptions={t.exact ? { exact: true } : undefined}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
