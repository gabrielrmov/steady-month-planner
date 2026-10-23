import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Bar, Empty, Kpi, KpiGrid, PageHeader } from "@/components/pj/ui";
import { useBusinessTransactions, useRows } from "@/lib/pj/data";
import { lastMonths, monthlySeries, projectMargins, ranking } from "@/lib/pj/calc";
import { brl, today } from "@/lib/pj/format";
import type { PjLead, PjProject } from "@/lib/pj/types";

export const Route = createFileRoute("/_authenticated/pj/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios PJ | FINLIST" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const tx = useBusinessTransactions();
  const projects = useRows<PjProject>("pj_projects");
  const leads = useRows<PjLead>("pj_leads");

  const data = useMemo(() => {
    const all = tx.data ?? [];
    const paidIn = all.filter((t) => t.type === "income" && t.status === "paid");
    const projById = new Map((projects.data ?? []).map((p) => [p.id, p]));
    const byClient = ranking(
      paidIn.map((t): [string, number] => [
        projById.get(t.project_id ?? "")?.client_name || "Sem projeto/cliente",
        t.amount,
      ]),
    );
    const byCategory = ranking(
      all
        .filter((t) => t.type === "expense")
        .map((t): [string, number] => [t.categories?.name || "Sem categoria", t.amount]),
    );
    const total = paidIn.reduce((s, t) => s + t.amount, 0);
    const won = (leads.data ?? []).filter((l) => l.stage === "Fechado").length;
    const lost = (leads.data ?? []).filter((l) => l.stage === "Perdido").length;
    const months = lastMonths(6, today().slice(0, 7));
    return {
      total,
      ticket: paidIn.length ? total / paidIn.length : 0,
      won,
      rate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
      series: monthlySeries(all, months).map((m) => ({
        mes: `${m.ym.slice(5)}/${m.ym.slice(2, 4)}`,
        Entradas: m.income,
        Despesas: m.expense,
      })),
      byClient,
      byCategory,
      margins: projectMargins(projects.data ?? [], all).filter((m) => m.revenue > 0),
    };
  }, [tx.data, projects.data, leads.data]);

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios PJ" subtitle="Para onde vai o dinheiro e de onde ele vem." />

      <KpiGrid>
        <Kpi label="Ticket médio" value={brl(data.ticket)} />
        <Kpi label="Total recebido" value={brl(data.total)} />
        <Kpi label="Leads fechados" value={data.won} />
        <Kpi label="Taxa de fechamento" value={data.rate == null ? "—" : `${data.rate}%`} />
      </KpiGrid>

      <Card className="animate-rise p-5">
        <h2 className="mb-3 text-sm font-bold tracking-tight">Últimos 6 meses</h2>
        <div className="h-64" role="img" aria-label="Entradas e despesas dos últimos 6 meses">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={56}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
              />
              <Legend />
              <RBar
                dataKey="Entradas"
                fill="var(--chart-1)"
                radius={[8, 8, 3, 3]}
                maxBarSize={26}
              />
              <RBar
                dataKey="Despesas"
                fill="var(--chart-2)"
                radius={[8, 8, 3, 3]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Ranking title="Quem mais pagou" rows={data.byClient} />
        <Ranking title="Maiores despesas por categoria" rows={data.byCategory} />
      </div>

      <Card className="animate-rise p-5">
        <h2 className="mb-3 text-sm font-bold tracking-tight">Margem por projeto</h2>
        {data.margins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre projetos com valor e ligue despesas a eles no Financeiro para ver a margem.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Projeto</th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 text-right font-medium">Despesas</th>
                  <th className="px-3 py-2 text-right font-medium">Margem</th>
                  <th className="py-2 pl-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.margins.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 pr-3">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.client}</p>
                    </td>
                    <td className="num px-3 py-2 text-right">{brl(m.revenue)}</td>
                    <td className="num px-3 py-2 text-right">{brl(m.costs)}</td>
                    <td className="num px-3 py-2 text-right">{brl(m.margin)}</td>
                    <td className="num py-2 pl-3 text-right">{Math.round(m.pct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Ranking({ title, rows }: { title: string; rows: [string, number][] }) {
  if (rows.length === 0) {
    return <Empty title={title}>Sem dados ainda.</Empty>;
  }
  const max = rows[0][1];
  return (
    <Card className="animate-rise space-y-3 p-5">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {rows.map(([k, v]) => (
        <div key={k} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{k}</span>
            <span className="num shrink-0">{brl(v)}</span>
          </div>
          <Bar value={v} max={max} />
        </div>
      ))}
    </Card>
  );
}
