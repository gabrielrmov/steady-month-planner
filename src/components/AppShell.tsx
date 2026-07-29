import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  Wallet,
  Tag,
  CreditCard,
  CalendarDays,
  Hourglass,
  ArrowDownCircle,
  ArrowUpCircle,
  Zap,
  BarChart3,
  Settings,
  FileUp,
  Wand2,
  ChevronDown,
  Menu,
  User,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, type ReactNode } from "react";

const transactionSubItems = [
  { to: "/transactions", label: "Recorrentes", tab: undefined, icon: ListChecks },
  { to: "/transactions", label: "Esporádicos", tab: "sporadic", icon: Zap },
  { to: "/transactions", label: "A receber", tab: "receivable", icon: ArrowDownCircle },
  { to: "/transactions", label: "Recebidos", tab: "received", icon: ArrowUpCircle },
] as const;

const groups = [
  {
    title: "Visão geral",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tab: undefined },
      { to: "/calendar", label: "Calendário", icon: CalendarDays, tab: undefined },
    ],
  },
  {
    title: "Lançamentos",
    items: [
      { to: "/transactions", label: "Contas", icon: ListChecks, tab: undefined, sub: transactionSubItems },
      { to: "/cards", label: "Cartões", icon: CreditCard, tab: undefined },
      { to: "/installments", label: "Parcelas", icon: Hourglass, tab: undefined },
    ],
  },
  {
    title: "Análise",
    items: [
      { to: "/reports", label: "Relatórios", icon: BarChart3, tab: undefined },
    ],
  },
  {
    title: "Configuração",
    items: [
      { to: "/categories", label: "Categorias", icon: Tag, tab: undefined },
      { to: "/rules", label: "Regras", icon: Wand2, tab: undefined },
      { to: "/import", label: "Importar", icon: FileUp, tab: undefined },
      { to: "/settings", label: "Configurações", icon: Settings, tab: undefined },
    ],
  },
] as const;

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (path: string, tab?: string) => {
    if (path === "/transactions") {
      const currentTab = (location.search as any)?.tab as string | undefined;
      return location.pathname.startsWith("/transactions") && (currentTab ?? undefined) === tab;
    }
    return location.pathname.startsWith(path);
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.email?.split("@")[0] ?? "Usuário";
  const initials = (profile?.full_name ?? profile?.email ?? "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shadow-lg shadow-indigo-500/20"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Finlist</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {group.title}
            </h3>
            {group.items.map((item) => {
              if ("sub" in item) {
                const anySubActive = item.sub.some((s) => isActive(s.to, s.tab));
                return (
                  <Collapsible key={item.label} defaultOpen={anySubActive}>
                    <CollapsibleTrigger asChild>
                      <button className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white">
                        <div className="flex items-center gap-3">
                          <item.icon className="h-[18px] w-[18px]" />
                          {item.label}
                        </div>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 ml-5 border-l border-slate-800">
                        {item.sub.map((sub) => {
                          const subActive = isActive(sub.to, sub.tab);
                          return (
                            <Link
                              key={sub.label}
                              to={sub.to}
                              search={sub.tab ? { tab: sub.tab } : {}}
                              onClick={onNavigate}
                              className={cn(
                                "relative block py-2 pl-6 text-sm transition-colors before:absolute before:left-0 before:top-1/2 before:h-px before:w-2 before:-translate-y-1/2 before:bg-slate-800",
                                subActive
                                  ? "font-medium text-indigo-400"
                                  : "text-slate-500 hover:text-indigo-400",
                              )}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              const active = isActive(item.to, item.tab);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  search={item.tab ? { tab: item.tab } : {}}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "border border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <div className="mb-3 space-y-1">
          <Link
            to="/import"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-white"
          >
            <FileUp className="h-4 w-4" />
            Importar dados
          </Link>
          <Link
            to="/settings"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-2">
          <Avatar className="h-10 w-10 rounded-xl ring-2 ring-indigo-500/20">
            <AvatarFallback className="bg-slate-800 text-xs font-semibold text-slate-200">
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold leading-tight text-white">{firstName}</p>
            <p className="flex items-center gap-1 text-[10px] text-slate-500">
              <Sparkles className="h-3 w-3" />
              Plano Gratuito
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-slate-500 hover:bg-red-400/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden">
        <header className="flex h-16 items-center justify-between border-b border-border bg-slate-900 px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg shadow-lg shadow-indigo-500/20"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Wallet className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-white">Finlist</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-slate-800 bg-slate-900 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
      </div>

      <div className="md:pl-64">
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
