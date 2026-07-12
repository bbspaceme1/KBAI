import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Users,
  BarChart3,
  Activity,
  LineChart,
  Briefcase,
  Newspaper,
  Sparkles,
  Megaphone,
  Receipt,
  PieChart,
  ShieldCheck,
  ScrollText,
  Settings,
  Star,
  Command as CommandIcon,
  ChevronDown,
  User as UserIcon,
  Globe,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useEffect, useState } from "react";
import { writeAuditLog } from "@/lib/admin.functions";
import { featureFlags, FeatureFlag } from "@/lib/feature-flags";
import { CommandPalette } from "@/components/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { OnboardingTour } from "@/components/onboarding-tour";

// Member nav: Dashboard + Portfolio + Market Insight
type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

// Member: investor pribadi — fokus pada portfolio diri sendiri & riset
const MEMBER_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { to: "/community", label: "Dashboard", icon: Users },
      { to: "/portfolio", label: "Portfolio", icon: Briefcase },
      { to: "/watchlist", label: "Watchlist", icon: Star },
      { to: "/market-insight", label: "Market Insight", icon: Newspaper },
    ],
  },
  {
    label: "Research",
    items: [
      { to: "/analisis", label: "Analisis", icon: LineChart },
      { to: "/idx/screener", label: "IDX Screener", icon: Search },
      { to: "/idx/markets", label: "IDX Markets", icon: BarChart3 },
      { to: "/ekonomi", label: "Ekonomi", icon: Globe },
    ],
  },
  {
    label: "Personal",
    items: [
      { to: "/activity", label: "Activity", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Advisor: kelola klien — TIDAK ada portfolio pribadi, fokus advisory & broadcast
const ADVISOR_GROUPS: NavGroup[] = [
  {
    label: "Market",
    items: [
      { to: "/community", label: "Dashboard", icon: Users },
      { to: "/market-insight", label: "Market Insight", icon: Newspaper },
      { to: "/watchlist", label: "Watchlist", icon: Star },
    ],
  },
  {
    label: "Research",
    items: [
      { to: "/analisis", label: "Analisis", icon: LineChart },
      { to: "/idx/screener", label: "IDX Screener", icon: Search },
      { to: "/idx/markets", label: "IDX Markets", icon: BarChart3 },
      { to: "/ekonomi", label: "Ekonomi", icon: Globe },
      { to: "/admin/insight", label: "Insight", icon: LineChart },
      { to: "/admin/insight-ai", label: "Insight AI", icon: Sparkles },
    ],
  },
  {
    label: "Advisory Operations",
    items: [
      { to: "/admin/holdings", label: "Holdings", icon: PieChart },
      { to: "/admin/user-portfolios", label: "User Portfolios", icon: BarChart3 },
      { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
    ],
  },
  {
    label: "Personal",
    items: [
      { to: "/activity", label: "Activity", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// Admin: pengelolaan sistem — fokus user, data, audit & security
const ADMIN_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/community", label: "Dashboard", icon: Users }],
  },
  {
    label: "Administration",
    items: [
      { to: "/admin/users", label: "Users", icon: ShieldCheck },
      { to: "/admin/settings", label: "System Settings", icon: Settings },
      { to: "/admin/prices", label: "Market Data", icon: Activity },
      { to: "/admin/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    label: "Compliance",
    items: [
      { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
      { to: "/admin/security", label: "Security", icon: ShieldCheck },
    ],
  },
  {
    label: "Personal",
    items: [
      { to: "/activity", label: "Activity", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/community": { title: "Community Dashboard", subtitle: "KBAI · IHSG · GOLD" },
  "/portfolio": { title: "Portfolio", subtitle: "Holdings & transactions" },
  "/market-insight": { title: "Market Insight", subtitle: "Broadcast advisor" },
  "/analisis": { title: "Analisis", subtitle: "Equity Intelligence Platform" },
  "/analisis/screener": { title: "Analisis", subtitle: "Stock Screener" },
  "/idx/screener": { title: "IDX Screener", subtitle: "Free IDX fundamental screener" },
  "/idx/markets": { title: "IDX Markets", subtitle: "IDX indices, gainers, sectors" },
  "/analisis/valuation": { title: "Analisis", subtitle: "DCF Valuation" },
  "/analisis/earnings": { title: "Analisis", subtitle: "Earnings Analysis" },
  "/analisis/portfolio": { title: "Analisis", subtitle: "Portfolio Construction" },
  "/analisis/technical": { title: "Analisis", subtitle: "Technical Analysis" },
  "/analisis/dividend": { title: "Analisis", subtitle: "Dividend Strategy" },
  "/watchlist": { title: "Watchlist", subtitle: "Saham yang dipantau" },
  "/admin/users": { title: "Administration", subtitle: "User Management" },
  "/admin/settings": { title: "Administration", subtitle: "System Settings" },
  "/admin/prices": { title: "Administration", subtitle: "Market Data" },
  "/admin/transactions": { title: "Administration", subtitle: "Transactions" },
  "/admin/audit": { title: "Administration", subtitle: "Audit Log" },
  "/admin/security": { title: "Administration", subtitle: "Security · Sessions" },
  "/admin/holdings": { title: "Advisor", subtitle: "Analisis · Holdings" },
  "/admin/user-portfolios": { title: "Advisor", subtitle: "Analisis · User Portfolios" },
  "/admin/insight": { title: "Advisor", subtitle: "Analisis · Insight" },
  "/admin/insight-ai": { title: "Advisor", subtitle: "Analisis · Insight AI" },
  "/admin/broadcast": { title: "Advisor", subtitle: "Broadcast" },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState<Date | null>(null);
  const navGroups = auth.isAdmin ? ADMIN_GROUPS : auth.isAdvisor ? ADVISOR_GROUPS : MEMBER_GROUPS;
  const flatNav = navGroups.flatMap((g) => g.items);

  // Mini ticker — latest KBAI value
  const kbaiQ = useQuery({
    queryKey: ["kbai-mini"],
    enabled: auth.isAuthenticated,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("kbai_index")
        .select("value, pct_change, date")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    if (auth.user) {
      writeAuditLog({
        username: auth.username ?? undefined,
        action: "auth.logout",
        user_agent: navigator.userAgent,
      }).catch(() => null);
    }
    // Clear TanStack Query cache to prevent session hijacking
    queryClient.clear();
    await auth.signOut();
    // Hard redirect to prevent back-button cache
    window.location.href = "/login";
  };

  const meta =
    ROUTE_TITLES[pathname] ??
    (pathname.startsWith("/admin")
      ? { title: "Administration", subtitle: pathname.replace("/admin/", "") }
      : { title: "KBAI", subtitle: "" });

  const initials =
    (auth.username ?? auth.user?.email ?? "?")
      .split(/[.@\s_-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CommandPalette />
      <OnboardingTour />
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-sidebar-border bg-sidebar-accent">
              <Activity className="h-3.5 w-3.5 text-sidebar-primary" />
            </span>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-wide text-sidebar-primary">
                KBAI
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Terminal
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {navGroups.map((g) => (
              <SidebarSection key={g.label} label={g.label}>
                {g.items
                  .filter((item) => {
                    // Feature flag checks for navigation items
                    if (
                      item.to === "/settings" &&
                      !featureFlags.isEnabled(FeatureFlag.ENABLE_DARK_MODE)
                    ) {
                      return false;
                    }
                    if (
                      item.to === "/analisis" &&
                      !featureFlags.isEnabled(FeatureFlag.ENABLE_PERFORMANCE_MONITORING)
                    ) {
                      return false;
                    }
                    if (
                      item.to === "/community" &&
                      !featureFlags.isEnabled(FeatureFlag.ENABLE_ONBOARDING)
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => (
                    <SidebarLink key={item.to} {...item} />
                  ))}
              </SidebarSection>
            ))}
          </nav>

          <div className="border-t border-sidebar-border px-3 py-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-sidebar-border bg-sidebar-accent text-[11px] font-semibold tracking-wide">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[12px] font-medium">
                      {auth.username ?? auth.user?.email}
                    </div>
                    <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                      {auth.isAdmin ? "Administrator" : auth.isAdvisor ? "Advisor" : "Member"}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Akun
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:px-8">
            <div className="flex items-baseline gap-3 leading-none">
              <h1 className="text-[15px] font-semibold tracking-tight">{meta.title}</h1>
              {meta.subtitle && (
                <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
                  {meta.subtitle}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {kbaiQ.data && (
                <Link
                  to="/community"
                  className="hidden items-center gap-2 rounded-sm border border-border bg-card/40 px-2.5 py-1 hover:border-foreground/40 lg:inline-flex"
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    KBAI
                  </span>
                  <span className="font-mono text-[12px] font-semibold tabular-nums">
                    {Number(kbaiQ.data.value).toFixed(2)}
                  </span>
                  {kbaiQ.data.pct_change != null && (
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        Number(kbaiQ.data.pct_change) >= 0 ? "text-pos" : "text-neg",
                      )}
                    >
                      {Number(kbaiQ.data.pct_change) >= 0 ? "+" : ""}
                      {Number(kbaiQ.data.pct_change).toFixed(2)}%
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => {
                  const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                  window.dispatchEvent(ev);
                }}
                className="hidden items-center gap-1.5 rounded-sm border border-border bg-card/60 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground sm:inline-flex"
                aria-label="Open command palette"
              >
                <CommandIcon className="h-3 w-3" />
                <span>K</span>
              </button>
              <div
                className="hidden flex-col items-end leading-tight sm:flex"
                suppressHydrationWarning
              >
                <span className="font-mono text-[11px] tabular text-muted-foreground">
                  {now ? format(now, "EEE, dd MMM yyyy", { locale: idLocale }) : "—"}
                </span>
                <span className="font-mono text-[11px] tabular text-foreground/80">
                  {now ? `${format(now, "HH:mm")} WIB` : "— WIB"}
                </span>
              </div>
              <span className="hidden h-5 w-px bg-border sm:block" />
              <NotificationBell />
              <ThemeToggle />
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-pos" />
                EOD
              </span>
            </div>
          </header>

          <MobileBottomNav items={flatNav} />

          <main className="flex-1 px-5 pb-24 pt-6 md:px-8 md:pb-8 md:pt-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[13px] font-medium text-sidebar-foreground/80",
        "transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
      activeProps={{
        className:
          "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-foreground/60 -ml-px",
      }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80 group-hover:opacity-100" />
      {label}
    </Link>
  );
}

function MobileBottomNav({ items }: { items: NavItem[] }) {
  const primary = items.slice(0, 4);
  const overflow = items.slice(4);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-background/95 backdrop-blur md:hidden"
      aria-label="Navigasi utama"
    >
      {primary.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          activeProps={{ className: "text-foreground" }}
        >
          <item.icon className="h-4 w-4" />
          <span className="leading-none">{item.label}</span>
        </Link>
      ))}
      {overflow.length > 0 && (
        <Sheet>
          <SheetTrigger className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
            <span className="leading-none">More</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 pt-4">
              {overflow.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center gap-1 rounded-sm border border-border p-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  activeProps={{ className: "bg-accent text-foreground" }}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  );
}
