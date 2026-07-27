import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, LogOut, Wallet, Tag, CreditCard, CalendarDays, Hourglass, ArrowDownCircle, Zap, BarChart3, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tab: undefined },
  { to: "/transactions", label: "Contas", icon: ListChecks, tab: undefined },
  { to: "/transactions", label: "Esporádicos", icon: Zap, tab: "sporadic" as const },
  { to: "/transactions", label: "Recebimentos", icon: ArrowDownCircle, tab: "received" as const },
  { to: "/calendar", label: "Calendário", icon: CalendarDays, tab: undefined },
  { to: "/cards", label: "Cartões", icon: CreditCard, tab: undefined },
  { to: "/installments", label: "Parcelas", icon: Hourglass, tab: undefined },
  { to: "/reports", label: "Relatórios", icon: BarChart3, tab: undefined },
  { to: "/categories", label: "Categorias", icon: Tag, tab: undefined },
  { to: "/settings", label: "Configurações", icon: Settings, tab: undefined },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">Finlist</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const currentTab = (location.search as any)?.tab as string | undefined;
            const active =
              item.to === "/transactions"
                ? location.pathname.startsWith("/transactions") && (currentTab ?? undefined) === item.tab
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.tab ? { tab: item.tab } : {}}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="md:pl-60">
        {/* mobile top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Finlist</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
          {nav.map((item) => {
            const currentTab = (location.search as any)?.tab as string | undefined;
            const active =
              item.to === "/transactions"
                ? location.pathname.startsWith("/transactions") && (currentTab ?? undefined) === item.tab
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.tab ? { tab: item.tab } : {}}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-center text-xs font-medium",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
