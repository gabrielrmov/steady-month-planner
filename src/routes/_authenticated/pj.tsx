import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePlan } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/pj")({
  component: PjLayout,
});

function PjLayout() {
  const plan = usePlan();

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
      <Outlet />
    </div>
  );
}
