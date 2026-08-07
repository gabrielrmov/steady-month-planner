import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Clock, Percent, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { usePlan } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação de serviços PJ | Finlist" },
      {
        name: "description",
        content: "Calcule quanto cobrar por serviço considerando custos fixos, pró-labore, impostos e margem de lucro.",
      },
      { property: "og:title", content: "Precificação de serviços PJ | Finlist" },
      {
        property: "og:description",
        content: "Calcule quanto cobrar por serviço considerando custos fixos, pró-labore, impostos e margem de lucro.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pricing,
});

const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Pricing() {
  const [fixedCosts, setFixedCosts] = useState(3000);
  const [proLabore, setProLabore] = useState(6000);
  const [hoursMonth, setHoursMonth] = useState(120);
  const [taxRate, setTaxRate] = useState(6);
  const [margin, setMargin] = useState(20);
  const [serviceHours, setServiceHours] = useState(20);
  const [directCosts, setDirectCosts] = useState(0);
  const plan = usePlan();

  const n = (v: number) => (Number.isFinite(v) ? v : 0);
  const hourCost = n(hoursMonth) > 0 ? (n(fixedCosts) + n(proLabore)) / n(hoursMonth) : 0;
  const base = hourCost * n(serviceHours) + n(directCosts);
  const loadPct = Math.min(n(taxRate) + n(margin), 95) / 100;
  const price = base / (1 - loadPct);
  const taxes = price * (n(taxRate) / 100);
  const profit = price - base - taxes;
  const pricePerHour = n(serviceHours) > 0 ? price / n(serviceHours) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Precificação de serviços</h1>
        <p className="text-sm text-muted-foreground">
          Descubra quanto cobrar por projeto cobrindo custos, impostos e lucro.
        </p>
      </div>

      {!plan.hasPj && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/40 p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Painel PJ disponível no plano Pessoal + PJ</p>
              <p className="text-xs text-muted-foreground">
                Você pode simular abaixo, mas os valores ficam bloqueados até assinar o módulo PJ.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/pricing">Ver planos</Link>
          </Button>
        </Card>
      )}

      <div className={`grid gap-6 lg:grid-cols-[1.1fr_1fr] ${plan.hasPj ? "" : "pointer-events-none select-none opacity-60"}`}>
        <Card className="space-y-6 p-6">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              Estrutura da empresa
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Custos fixos mensais" value={fixedCosts} onChange={setFixedCosts} suffix="R$" />
              <NumField label="Pró-labore desejado" value={proLabore} onChange={setProLabore} suffix="R$" />
              <NumField label="Horas produtivas por mês" value={hoursMonth} onChange={setHoursMonth} suffix="h" />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Impostos e margem
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Impostos sobre a nota" value={taxRate} onChange={setTaxRate} suffix="%" />
              <NumField label="Margem de lucro" value={margin} onChange={setMargin} suffix="%" />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Este serviço
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumField label="Horas estimadas" value={serviceHours} onChange={setServiceHours} suffix="h" />
              <NumField label="Custos diretos do projeto" value={directCosts} onChange={setDirectCosts} suffix="R$" />
            </div>
          </section>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preço sugerido do serviço
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight">{brl(price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{brl(pricePerHour)} por hora trabalhada</p>
          </Card>

          <Card className="divide-y divide-border p-6">
            <Row label="Custo por hora da empresa" value={brl(hourCost)} />
            <Row label="Custo total do serviço" value={brl(base)} />
            <Row label="Impostos estimados" value={brl(taxes)} />
            <Row label="Lucro estimado" value={brl(profit)} strong />
          </Card>

          <Card className="p-5">
            <div className="flex gap-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                O preço é calculado por markup: custo total dividido por (1 − impostos − margem), garantindo que a
                margem seja sobre o valor final cobrado, e não sobre o custo.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold" : "font-semibold"}>{value}</span>
    </div>
  );
}
