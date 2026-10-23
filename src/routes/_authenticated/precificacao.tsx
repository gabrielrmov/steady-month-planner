import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetCalculator } from "@/components/pj/BudgetCalculator";
import { kitSummary, minHourlyRate } from "@/lib/pj/calc";
import { usePjProfile, useRows } from "@/lib/pj/data";
import type { PjEquipment } from "@/lib/pj/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Clock, Percent, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { usePlan } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação de serviços PJ | FINLIST" },
      {
        name: "description",
        content:
          "Calcule quanto cobrar por serviço considerando custos fixos, pró-labore, impostos e margem de lucro.",
      },
      { property: "og:title", content: "Precificação de serviços PJ | FINLIST" },
      {
        property: "og:description",
        content:
          "Calcule quanto cobrar por serviço considerando custos fixos, pró-labore, impostos e margem de lucro.",
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
  const [rate, setRate] = useState(80);
  const [tab, setTab] = useState("service");
  const plan = usePlan();

  // Valores do perfil PJ (renda desejada, custos fixos, horas, imposto) entram como ponto de partida.
  const profile = usePjProfile();
  const equipment = useRows<PjEquipment>("pj_equipment");
  const kit = useMemo(() => kitSummary(equipment.data ?? []), [equipment.data]);
  const p = profile.data;
  useEffect(() => {
    if (!p?.id) return;
    if (p.fixed_costs != null) setFixedCosts(p.fixed_costs);
    if (p.desired_income != null) setProLabore(p.desired_income);
    if (p.billable_hours != null) setHoursMonth(p.billable_hours);
    if (p.tax_rate != null) setTaxRate(p.tax_rate);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = (v: number) => (Number.isFinite(v) ? v : 0);
  const minRate = minHourlyRate({
    income: n(proLabore),
    fixed: n(fixedCosts),
    kitMonthly: kit.monthly,
    hours: n(hoursMonth),
    tax: n(taxRate),
  });
  const hourCost =
    n(hoursMonth) > 0 ? (n(fixedCosts) + n(proLabore) + kit.monthly) / n(hoursMonth) : 0;
  const base = hourCost * n(serviceHours) + n(directCosts);
  const loadPct = Math.min(n(taxRate) + n(margin), 95) / 100;
  const price = base / (1 - loadPct);
  const taxes = price * (n(taxRate) / 100);
  const profit = price - base - taxes;
  const pricePerHour = n(serviceHours) > 0 ? price / n(serviceHours) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-rise">
        <h1 className="text-[26px] font-bold tracking-tight sm:text-[32px]">
          Precificação de serviços
        </h1>
        <p className="text-sm text-muted-foreground">
          Descubra quanto cobrar por projeto cobrindo custos, impostos e lucro.
        </p>
      </div>

      {!plan.hasPj && (
        <Card
          className="animate-rise flex flex-wrap items-center justify-between gap-4 border-primary/40 p-5"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Painel PJ disponível no plano Pessoal + PJ</p>
              <p className="text-xs text-muted-foreground">
                Você pode simular abaixo, mas os valores ficam bloqueados até assinar o módulo PJ.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="hover-glow">
            <Link to="/pricing">Ver planos</Link>
          </Button>
        </Card>
      )}

      <Tabs
        value={tab}
        onValueChange={setTab}
        className={plan.hasPj ? "" : "pointer-events-none select-none opacity-60"}
      >
        <TabsList>
          <TabsTrigger value="service">Por serviço</TabsTrigger>
          <TabsTrigger value="budget">Orçamento de vídeo</TabsTrigger>
        </TabsList>
        <TabsContent value="service" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Card className="animate-rise space-y-6 p-6" style={{ animationDelay: "120ms" }}>
              <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Estrutura da empresa
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumField
                    label="Custos fixos mensais"
                    value={fixedCosts}
                    onChange={setFixedCosts}
                    suffix="R$"
                  />
                  <NumField
                    label="Pró-labore desejado"
                    value={proLabore}
                    onChange={setProLabore}
                    suffix="R$"
                  />
                  <NumField
                    label="Horas produtivas por mês"
                    value={hoursMonth}
                    onChange={setHoursMonth}
                    suffix="h"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Kit de equipamentos: <span className="num">{brl(kit.monthly)}</span> de
                  depreciação por mês entram no custo da hora (cadastre os itens em Equipamentos).
                </p>
              </section>

              <section className="space-y-4 border-t border-border pt-6">
                <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Impostos e margem
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumField
                    label="Impostos sobre a nota"
                    value={taxRate}
                    onChange={setTaxRate}
                    suffix="%"
                  />
                  <NumField
                    label="Margem de lucro"
                    value={margin}
                    onChange={setMargin}
                    suffix="%"
                  />
                </div>
              </section>

              <section className="space-y-4 border-t border-border pt-6">
                <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Este serviço
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumField
                    label="Horas estimadas"
                    value={serviceHours}
                    onChange={setServiceHours}
                    suffix="h"
                  />
                  <NumField
                    label="Custos diretos do projeto"
                    value={directCosts}
                    onChange={setDirectCosts}
                    suffix="R$"
                  />
                </div>
              </section>
            </Card>

            <div className="space-y-4">
              <Card className="animate-rise glow-ring p-6" style={{ animationDelay: "180ms" }}>
                <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Preço sugerido do serviço
                </p>
                <p className="num mt-2 text-4xl">{brl(price)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="num">{brl(pricePerHour)}</span> por hora trabalhada
                </p>
              </Card>

              <Card
                className="animate-rise divide-y divide-border p-6"
                style={{ animationDelay: "240ms" }}
              >
                <Row label="Custo por hora da empresa (com o kit)" value={brl(hourCost)} />
                <Row label="Custo total do serviço" value={brl(base)} />
                <Row label="Impostos estimados" value={brl(taxes)} />
                <Row label="Lucro estimado" value={brl(profit)} strong />
              </Card>

              <Card className="animate-rise space-y-3 p-6" style={{ animationDelay: "270ms" }}>
                <p className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quanto cobrar por hora (mínimo)
                </p>
                <p className="num text-3xl">{brl(minRate)}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  (renda desejada + custos fixos + depreciação do kit) ÷ horas faturáveis ÷ (1 −
                  imposto).
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRate(Math.ceil(minRate));
                    setTab("budget");
                  }}
                >
                  Usar como valor da hora no orçamento
                </Button>
              </Card>

              <Card className="animate-rise p-5" style={{ animationDelay: "300ms" }}>
                <div className="flex gap-3">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    O preço é calculado por markup: custo total dividido por (1 − impostos −
                    margem), garantindo que a margem seja sobre o valor final cobrado, e não sobre o
                    custo.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="budget" className="mt-6">
          <BudgetCalculator rate={rate} onRateChange={setRate} tax={n(taxRate)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num ${strong ? "text-base" : ""}`}>{value}</span>
    </div>
  );
}
