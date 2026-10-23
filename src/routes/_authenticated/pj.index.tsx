import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Bar, Kpi, KpiGrid, PageHeader } from "@/components/pj/ui";
import {
  useBusinessTransactions,
  usePjProfile,
  useRows,
  useUnseenInteractions,
} from "@/lib/pj/data";
import { limitState, monthSummary, revenueLast12Months } from "@/lib/pj/calc";
import { brl, dateBR, daysUntil, today } from "@/lib/pj/format";
import type { PjLead, PjProject, PjProposal } from "@/lib/pj/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pj/")({
  head: () => ({ meta: [{ title: "Início PJ | FINLIST" }] }),
  component: InicioPjPage,
});

const DONE = ["Entregue", "Pago"];

function InicioPjPage() {
  const profile = usePjProfile();
  const tx = useBusinessTransactions();
  const projects = useRows<PjProject>("pj_projects");
  const leads = useRows<PjLead>("pj_leads");
  const proposals = useRows<PjProposal>("pj_proposals");
  const interactions = useUnseenInteractions();

  const d = useMemo(() => {
    const now = today();
    const ym = now.slice(0, 7);
    const all = tx.data ?? [];
    const month = monthSummary(all, ym, profile.data?.tax_rate ?? 0);
    const toReceive = all
      .filter((t) => t.type === "income" && t.status !== "paid")
      .reduce((s, t) => s + t.amount, 0);
    const openLeads = (leads.data ?? []).filter(
      (l) => l.stage !== "Fechado" && l.stage !== "Perdido",
    );
    const followUps = openLeads.filter((l) => l.follow_up && (daysUntil(l.follow_up) ?? 1) <= 0);
    const active = (projects.data ?? []).filter((p) => !DONE.includes(p.stage));
    const late = active.filter((p) => p.due_date && (daysUntil(p.due_date) ?? 0) < 0);
    const waiting = (proposals.data ?? []).filter((p) => p.status === "Enviada");
    const agenda = [
      ...(projects.data ?? []).flatMap((p) => [
        p.shoot_date ? { date: p.shoot_date, text: `Captação: ${p.title}` } : null,
        p.due_date && !DONE.includes(p.stage)
          ? { date: p.due_date, text: `Entrega: ${p.title}` }
          : null,
      ]),
      ...followUps.map((l) => ({ date: l.follow_up!, text: `Follow-up: ${l.name}` })),
      ...openLeads
        .filter((l) => l.follow_up && (daysUntil(l.follow_up) ?? -1) > 0)
        .map((l) => ({ date: l.follow_up!, text: `Follow-up: ${l.name}` })),
    ]
      .filter((e): e is { date: string; text: string } => !!e)
      .filter((e) => {
        const n = daysUntil(e.date, now);
        return n != null && n >= 0 && n <= 14;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const limit = limitState(
      revenueLast12Months(all, now),
      profile.data?.annual_limit ?? null,
      profile.data?.regime ?? "",
    );
    return { month, toReceive, openLeads, followUps, active, late, waiting, agenda, limit };
  }, [tx.data, projects.data, leads.data, proposals.data, profile.data]);

  const first = (profile.data?.full_name ?? "").split(" ")[0];
  const alerts: { tone: "bad" | "info"; to: string; text: string }[] = [
    ...(interactions.data ?? []).map((i) => ({
      tone: "info" as const,
      to: i.kind === "proposal" ? "/pj/propostas" : "/pj/projetos",
      text: `Cliente interagiu: ${i.title} (${i.n} novo(s) comentário(s)/aprovação(ões))`,
    })),
    ...(d.late.length
      ? [
          {
            tone: "bad" as const,
            to: "/pj/projetos",
            text: `${d.late.length} projeto(s) atrasado(s): ${d.late.map((p) => p.title).join(", ")}`,
          },
        ]
      : []),
    ...(d.followUps.length
      ? [
          {
            tone: "info" as const,
            to: "/pj/crm",
            text: `${d.followUps.length} follow-up(s) para hoje ou atrasados: ${d.followUps.map((l) => l.name).join(", ")}`,
          },
        ]
      : []),
    ...(d.waiting.length
      ? [
          {
            tone: "info" as const,
            to: "/pj/propostas",
            text: `${d.waiting.length} proposta(s) enviada(s) aguardando resposta`,
          },
        ]
      : []),
    ...(d.limit?.alert
      ? [
          {
            tone: "bad" as const,
            to: "/pj/perfil",
            text: `Faturamento dos últimos 12 meses em ${Math.round(d.limit.pct * 100)}% do limite (${brl(d.limit.limit)})`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá${first ? `, ${first}` : ""}`}
        subtitle="O que precisa da sua atenção hoje no seu trabalho."
      />

      <KpiGrid cols={6}>
        <Kpi label="Recebido no mês" value={brl(d.month.received)} />
        <Kpi label="Despesas no mês" value={brl(d.month.expenses)} />
        <Kpi
          label="Resultado"
          value={brl(d.month.result)}
          tone={d.month.result < 0 ? "neg" : undefined}
          dark
        />
        <Kpi label="A receber" value={brl(d.toReceive)} />
        <Kpi label="Leads em aberto" value={d.openLeads.length} />
        <Kpi label="Projetos ativos" value={d.active.length} />
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-rise space-y-1 p-5">
          <h2 className="mb-2 text-sm font-bold tracking-tight">Alertas</h2>
          {alerts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Tudo em dia.
            </p>
          ) : (
            alerts.map((a, i) => (
              <Link
                key={i}
                to={a.to}
                className={cn(
                  "flex items-start gap-2 border-b border-border py-2.5 text-sm last:border-0 hover:underline",
                  a.tone === "bad" && "text-destructive",
                )}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {a.text}
              </Link>
            ))
          )}
        </Card>

        <Card className="animate-rise space-y-1 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-tight">
            <CalendarDays className="h-4 w-4 text-muted-foreground" /> Próximos 14 dias
          </h2>
          {d.agenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada agendado.</p>
          ) : (
            d.agenda.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-0"
              >
                <span className="truncate">{e.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {dateBR(e.date)}
                  {daysUntil(e.date) === 0 ? " · hoje" : ""}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>

      {d.limit && (
        <Card className="animate-rise space-y-2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <b>Limite anual ({profile.data?.regime || "personalizado"})</b>
            <span className="num">
              {brl(d.limit.used)} de {brl(d.limit.limit)}
            </span>
          </div>
          <Bar value={d.limit.used} max={d.limit.limit} danger={d.limit.alert} />
        </Card>
      )}
    </div>
  );
}
