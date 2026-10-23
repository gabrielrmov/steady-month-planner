import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PJ_NAV } from "@/lib/pj/nav";
import { usePlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pj")({
  component: PjLayout,
});

const isActive = (pathname: string, to: string) =>
  pathname === to || (to !== "/pj" && pathname.startsWith(`${to}/`));

function PjLayout() {
  const plan = usePlan();
  const { pathname } = useLocation();

  if (!plan.hasPj) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <Card className="animate-rise flex flex-col items-center gap-3 p-8 text-center">
          <Lock className="h-6 w-6 text-primary" />
          <p className="font-medium">Meu trabalho (PJ) está no plano Pessoal + PJ</p>
          <p className="text-sm text-muted-foreground">
            CRM, propostas, contratos, projetos e financeiro do seu negócio num lugar só.
          </p>
          <Button asChild className="hover-glow">
            <Link to="/pricing">Ver planos</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <nav
        aria-label="Meu trabalho (PJ)"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
      >
        {PJ_NAV.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
