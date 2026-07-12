import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/auth";
import { IDX_EMITEN } from "@/lib/idx-tickers";
import {
  Users,
  Briefcase,
  Newspaper,
  LineChart,
  Search,
  Calculator,
  TrendingUp,
  Activity,
  Coins,
  Star,
  PieChart,
  Sparkles,
  Megaphone,
  ShieldCheck,
  Settings,
  ScrollText,
  Receipt,
  LogOut,
  BarChart3,
  Hash,
} from "lucide-react";

type Item = {
  to: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MEMBER: Item[] = [
  { to: "/community", label: "Dashboard", group: "Workspace", icon: Users },
  { to: "/portfolio", label: "Portfolio", group: "Workspace", icon: Briefcase },
  { to: "/watchlist", label: "Watchlist", group: "Workspace", icon: Star },
  { to: "/market-insight", label: "Market Insight", group: "Workspace", icon: Newspaper },
];

const ADVISOR: Item[] = [
  { to: "/community", label: "Dashboard", group: "Advisor", icon: Users },
  { to: "/analisis", label: "Analisis · Hub", group: "Analisis", icon: LineChart },
  { to: "/analisis/screener", label: "Stock Screener", group: "Analisis", icon: Search },
  { to: "/analisis/valuation", label: "DCF Valuation", group: "Analisis", icon: Calculator },
  { to: "/analisis/earnings", label: "Earnings Analysis", group: "Analisis", icon: TrendingUp },
  {
    to: "/analisis/portfolio",
    label: "Portfolio Construction",
    group: "Analisis",
    icon: Briefcase,
  },
  { to: "/analisis/technical", label: "Technical Analysis", group: "Analisis", icon: Activity },
  { to: "/analisis/dividend", label: "Dividend Strategy", group: "Analisis", icon: Coins },
  { to: "/watchlist", label: "Watchlist", group: "Personal", icon: Star },
  { to: "/admin/holdings", label: "Holdings", group: "Advisor", icon: PieChart },
  { to: "/admin/user-portfolios", label: "User Portfolios", group: "Advisor", icon: BarChart3 },
  { to: "/admin/insight", label: "Insight", group: "Advisor", icon: LineChart },
  { to: "/admin/insight-ai", label: "Insight AI", group: "Advisor", icon: Sparkles },
  { to: "/admin/broadcast", label: "Broadcast", group: "Advisor", icon: Megaphone },
  { to: "/market-insight", label: "Market Insight", group: "Advisor", icon: Newspaper },
];

const ADMIN: Item[] = [
  { to: "/admin/users", label: "Users", group: "Administration", icon: ShieldCheck },
  { to: "/admin/settings", label: "System Settings", group: "Administration", icon: Settings },
  { to: "/admin/prices", label: "Market Data", group: "Administration", icon: Activity },
  { to: "/admin/transactions", label: "Transactions", group: "Administration", icon: Receipt },
  { to: "/admin/audit", label: "Audit Log", group: "Administration", icon: ScrollText },
  { to: "/admin/security", label: "Security", group: "Administration", icon: ShieldCheck },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tickerMatches = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (q.length < 1) return [];
    return IDX_EMITEN.filter((e) => e.code.includes(q) || e.name.toUpperCase().includes(q)).slice(
      0,
      8,
    );
  }, [query]);

  if (!auth.isAuthenticated) return null;

  const items = auth.isAdmin ? ADMIN : auth.isAdvisor ? ADVISOR : MEMBER;
  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] ??= []).push(it);
    return acc;
  }, {});

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Cari halaman, ticker IDX, atau aksi..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Tidak ditemukan.</CommandEmpty>
        {tickerMatches.length > 0 && (
          <>
            <CommandGroup heading="Ticker IDX">
              {tickerMatches.map((t) => (
                <CommandItem
                  key={t.code}
                  value={`ticker ${t.code} ${t.name}`}
                  onSelect={() => {
                    setOpen(false);
                    setQuery("");
                    navigate({ to: "/watchlist", search: { add: t.code } });
                  }}
                >
                  <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-semibold">{t.code}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{t.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {Object.entries(groups).map(([group, list], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {list.map((it) => (
                <CommandItem key={it.to} value={`${group} ${it.label}`} onSelect={() => go(it.to)}>
                  <it.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {it.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Akun">
          <CommandItem
            onSelect={async () => {
              setOpen(false);
              await auth.signOut();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4 text-muted-foreground" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
