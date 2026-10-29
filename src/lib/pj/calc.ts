/** Contas da área PJ: orçamento, valor/hora, depreciação, financeiro e limite MEI. Funções puras. */
import { monthEnd, shiftMonth, toNumber } from "./format.ts";

/* ------------------------------- equipamentos ------------------------------ */

export type EquipmentLike = { cost: number | null; life_months: number | null };

/** Depreciação mensal em linha reta: valor pago ÷ vida útil (36 meses se não informada). */
export const monthlyDepreciation = (e: EquipmentLike) =>
  toNumber(e.cost) / Math.max(1, toNumber(e.life_months) || 36);

export const kitSummary = (items: EquipmentLike[]) => ({
  invested: items.reduce((s, e) => s + toNumber(e.cost), 0),
  monthly: items.reduce((s, e) => s + monthlyDepreciation(e), 0),
  count: items.length,
});

/* --------------------------------- orçamento -------------------------------- */

export type BudgetInput = {
  days: number;
  shootHours: number;
  editHours: number;
  rate: number;
  equipment: number;
  travel: number;
  extras: number;
  margin: number;
  tax: number;
};

export type BudgetResult = {
  hours: number;
  work: number;
  costs: number;
  base: number;
  price: number;
  min: number;
  premium: number;
  taxes: number;
  profit: number;
  hourly: number;
};

const MAX_LOAD = 0.95;

/** Preço por markup: custo ÷ (1 − imposto − margem), com a carga limitada a 95% para não explodir. */
export function budget(i: BudgetInput): BudgetResult {
  const days = Math.max(1, toNumber(i.days));
  const hours = (toNumber(i.shootHours) + toNumber(i.editHours)) * days;
  const work = hours * toNumber(i.rate);
  const costs = toNumber(i.equipment) + toNumber(i.travel) + toNumber(i.extras);
  const base = work + costs;
  const t = Math.min(toNumber(i.tax) / 100, MAX_LOAD);
  const m = toNumber(i.margin) / 100;
  const price = base / (1 - Math.min(t + m, MAX_LOAD));
  const min = base / (1 - t);
  return {
    hours,
    work,
    costs,
    base,
    price,
    min,
    premium: price * 1.25,
    taxes: price * t,
    profit: price - base - price * t,
    hourly: hours > 0 ? price / hours : 0,
  };
}

export type HourlyInput = {
  income: number;
  fixed: number;
  kitMonthly: number;
  hours: number;
  tax: number;
};

/** Quanto cobrar por hora: (renda desejada + custos fixos + depreciação do kit) ÷ horas faturáveis ÷ (1 − imposto). */
export function minHourlyRate(i: HourlyInput): number {
  const t = Math.min(toNumber(i.tax) / 100, MAX_LOAD);
  return (
    (toNumber(i.income) + toNumber(i.fixed) + toNumber(i.kitMonthly)) /
    Math.max(1, toNumber(i.hours)) /
    (1 - t)
  );
}

/* -------------------------------- financeiro -------------------------------- */

export type TxLike = {
  amount: number;
  type: "income" | "expense";
  status: "pending" | "paid";
  due_date: string;
  project_id?: string | null;
  category_id?: string | null;
  categories?: { name: string } | null;
};

export function monthSummary(tx: TxLike[], ym: string, taxRate: number) {
  const mon = tx.filter((t) => t.due_date.startsWith(ym));
  const sum = (f: (t: TxLike) => boolean) =>
    mon.filter(f).reduce((s, t) => s + toNumber(t.amount), 0);
  const received = sum((t) => t.type === "income" && t.status === "paid");
  const pending = sum((t) => t.type === "income" && t.status !== "paid");
  const expenses = sum((t) => t.type === "expense");
  return {
    received,
    pending,
    expenses,
    result: received - expenses,
    tax: (received * toNumber(taxRate)) / 100,
  };
}

/** Recebido (pago) nos 12 meses até `today` (inclusive). */
export function revenueLast12Months(tx: TxLike[], today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const from = `${y - 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return tx
    .filter(
      (t) => t.type === "income" && t.status === "paid" && t.due_date > from && t.due_date <= today,
    )
    .reduce((s, t) => s + toNumber(t.amount), 0);
}

export type LimitState = {
  limit: number;
  used: number;
  pct: number;
  alert: boolean;
  over: boolean;
};

/** Limite anual (MEI = 81 mil se o perfil não informar) e uso; alerta a partir de 80%. */
export function limitState(
  used: number,
  annualLimit: number | null,
  regime: string,
  meiLimit = 81000,
): LimitState | null {
  const limit = toNumber(annualLimit) || (regime === "MEI" ? meiLimit : 0);
  if (limit <= 0) return null;
  const pct = used / limit;
  return { limit, used, pct, alert: pct >= 0.8, over: pct > 1 };
}

export function lastMonths(n: number, from: string): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(from, i - (n - 1)));
}

/* -------------------------------- relatórios -------------------------------- */

export function monthlySeries(tx: TxLike[], months: string[]) {
  return months.map((ym) => {
    const mon = tx.filter((t) => t.due_date.startsWith(ym));
    const inn = mon
      .filter((t) => t.type === "income" && t.status === "paid")
      .reduce((s, t) => s + toNumber(t.amount), 0);
    const out = mon.filter((t) => t.type === "expense").reduce((s, t) => s + toNumber(t.amount), 0);
    return { ym, income: inn, expense: out };
  });
}

export function ranking(entries: [string, number][], top = 6): [string, number][] {
  const acc = new Map<string, number>();
  for (const [k, v] of entries) acc.set(k, (acc.get(k) ?? 0) + v);
  return [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
}

export type ProjectLike = { id: string; title: string; client_name: string | null; value: number };

/** Margem por projeto: valor do projeto menos as despesas ligadas a ele. */
export function projectMargins(projects: ProjectLike[], tx: TxLike[]) {
  return projects
    .map((p) => {
      const costs = tx
        .filter((t) => t.type === "expense" && t.project_id === p.id)
        .reduce((s, t) => s + toNumber(t.amount), 0);
      const revenue = toNumber(p.value);
      return {
        id: p.id,
        title: p.title,
        client: p.client_name ?? "",
        revenue,
        costs,
        margin: revenue - costs,
        pct: revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.margin - a.margin);
}

export const monthRange = (ym: string) => ({ from: `${ym}-01`, to: monthEnd(ym) });

export type AdjustInput = {
  current: number;
  /** Índice acumulado no período (IPCA, IGP-M…), em %. */
  index: number;
  /** Ganho real sobre a inflação, em %. */
  real: number;
  /** Arredonda para o múltiplo mais próximo (0 = sem arredondar). */
  round: number;
};

export type AdjustResult = { value: number; diff: number; pct: number };

/** Reajuste composto: (1 + índice) × (1 + ganho real). `pct` é o aumento efetivo, já com o arredondamento. */
export function adjust(i: AdjustInput): AdjustResult {
  const raw = i.current * (1 + i.index / 100) * (1 + i.real / 100);
  const value = i.round > 0 ? Math.round(raw / i.round) * i.round : Math.round(raw * 100) / 100;
  return {
    value,
    diff: Math.round((value - i.current) * 100) / 100,
    pct: i.current > 0 ? (value / i.current - 1) * 100 : 0,
  };
}

/** Percentual necessário para sair de `current` e chegar em `target`. */
export const requiredPct = (current: number, target: number) =>
  current > 0 ? (target / current - 1) * 100 : 0;
