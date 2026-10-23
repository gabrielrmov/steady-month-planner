import { Logo, LogoMark } from "@/components/Logo";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  CreditCard,
  CalendarDays,
  Menu,
  User,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlan, PLAN_LABEL } from "@/lib/plan";
import { useTheme } from "@/lib/theme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState, type ReactNode } from "react";
import { QuickAdd } from "@/components/QuickAdd";
import { SECTIONS, sectionOf } from "@/lib/nav";
import { SectionTabs } from "@/components/SectionTabs";

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const uid = sessionRes.session?.user.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string | null } | null;
    },
  });
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const plan = usePlan();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
        <Link to="/dashboard" aria-label="FINLIST">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          className="group flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          ) : (
            <Moon className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {SECTIONS.map((section, index) => {
          const active = sectionOf(location.pathname)?.key === section.key;
          return (
            <Link
              key={section.key}
              to={section.items[0].to}
              onClick={onNavigate}
              style={{ animationDelay: `${index * 45}ms` }}
              className={cn(
                "animate-rise group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-foreground [&>svg]:text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:animate-bar-in before:rounded-full before:bg-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <section.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-110" />
              {section.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-sidebar-border bg-sidebar/80 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border bg-background p-2">
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
              {initials || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold leading-tight text-sidebar-foreground">
              {firstName}
            </p>
            <p className="flex items-center gap-1 text-[10px] text-sidebar-foreground/45">
              <Sparkles className="h-3 w-3" />
              {plan.isTrial ? `Teste · ${plan.trialDaysLeft}d` : PLAN_LABEL[plan.plan]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-sidebar-foreground/45 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {plan.plan !== "pfpj" && (
          <Link
            to="/pricing"
            onClick={onNavigate}
            className="hover-glow mt-3 flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {plan.isTrial
              ? `Assinar (${plan.trialDaysLeft} dias restantes)`
              : plan.plan === "pf"
                ? "Adicionar módulo PJ"
                : "Escolher plano"}
          </Link>
        )}
      </div>
    </>
  );
}

const mobileNav = [
  { section: "dashboard", label: "Início" },
  { section: "contas", label: "Contas" },
  { section: "planejamento", label: "Planejar" },
  { section: "pj", label: "Trabalho" },
  { section: "relatorios", label: "Relatórios" },
] as const;

function MobileTabBar() {
  const location = useLocation();
  const current = sectionOf(location.pathname)?.key;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {mobileNav.map((tab) => {
          const section = SECTIONS.find((s) => s.key === tab.section)!;
          const active = current === section.key;
          return (
            <Link
              key={section.key}
              to={section.items[0].to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-sidebar-foreground/45",
              )}
            >
              <section.icon
                className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")}
              />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { theme } = useTheme();

  // Mirror the theme on <html> so portals (dialogs, popovers, toasts) match.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  return (
    <div className={cn("min-h-screen bg-background text-foreground", theme === "dark" && "dark")}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden">
        <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-sidebar-border bg-sidebar/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex min-w-0 items-center">
            <Logo />
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[85vw] max-w-xs border-sidebar-border bg-sidebar p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
      </div>

      <div className="overflow-x-clip md:pl-64">
        <main key={pathname} className="page-enter px-4 pb-36 pt-5 md:p-8 md:pb-8">
          <SectionTabs />
          {children}
        </main>
      </div>

      {/* Lançamento rápido é pessoal: some na área do trabalho para não confundir com o financeiro PJ */}
      {sectionOf(pathname)?.key !== "pj" && <QuickAdd />}
      <MobileTabBar />
    </div>
  );
}
