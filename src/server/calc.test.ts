import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budget,
  kitSummary,
  limitState,
  minHourlyRate,
  monthSummary,
  monthlyDepreciation,
  projectMargins,
  ranking,
  revenueLast12Months,
} from "../lib/pj/calc.ts";
import {
  csvCell,
  daysUntil,
  mmss,
  parseTime,
  shiftMonth,
  toNumber,
  waLink,
} from "../lib/pj/format.ts";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.01, `${a} ≈ ${b}`);

test("depreciação mensal usa 36 meses quando a vida útil não vem", () => {
  close(monthlyDepreciation({ cost: 3600, life_months: 36 }), 100);
  close(monthlyDepreciation({ cost: 3600, life_months: null }), 100);
  close(monthlyDepreciation({ cost: 1200, life_months: 12 }), 100);
  const k = kitSummary([
    { cost: 3600, life_months: 36 },
    { cost: 1200, life_months: 12 },
  ]);
  close(k.invested, 4800);
  close(k.monthly, 200);
});

test("orçamento: preço por markup, mínimo e premium", () => {
  const r = budget({
    days: 1,
    shootHours: 4,
    editHours: 8,
    rate: 80,
    equipment: 0,
    travel: 0,
    extras: 0,
    margin: 30,
    tax: 6,
  });
  close(r.hours, 12);
  close(r.work, 960);
  close(r.price, 960 / (1 - 0.36));
  close(r.min, 960 / 0.94);
  close(r.premium, r.price * 1.25);
  close(r.taxes, r.price * 0.06);
  close(r.profit, r.price - 960 - r.taxes);
  close(r.hourly, r.price / 12);
});

test("orçamento: várias diárias, custos diretos e carga absurda não quebram", () => {
  const r = budget({
    days: 3,
    shootHours: 4,
    editHours: 4,
    rate: 100,
    equipment: 300,
    travel: 100,
    extras: 100,
    margin: 0,
    tax: 0,
  });
  close(r.hours, 24);
  close(r.price, 2400 + 500);
  const extreme = budget({
    days: 1,
    shootHours: 1,
    editHours: 0,
    rate: 100,
    equipment: 0,
    travel: 0,
    extras: 0,
    margin: 90,
    tax: 50,
  });
  assert.ok(Number.isFinite(extreme.price) && extreme.price > 0);
  assert.equal(
    budget({
      days: 0,
      shootHours: 0,
      editHours: 0,
      rate: 0,
      equipment: 0,
      travel: 0,
      extras: 0,
      margin: 0,
      tax: 0,
    }).price,
    0,
  );
});

test("valor/hora mínimo: (renda + fixos + kit) ÷ horas ÷ (1 − imposto)", () => {
  close(
    minHourlyRate({ income: 5000, fixed: 300, kitMonthly: 100, hours: 80, tax: 6 }),
    5400 / 80 / 0.94,
  );
  assert.ok(
    Number.isFinite(minHourlyRate({ income: 1000, fixed: 0, kitMonthly: 0, hours: 0, tax: 0 })),
  );
});

const tx = (
  amount: number,
  type: "income" | "expense",
  status: "paid" | "pending",
  due_date: string,
  extra = {},
) => ({ amount, type, status, due_date, ...extra });

test("resumo do mês: recebido, a receber, despesas, resultado e imposto sobre o recebido", () => {
  const s = monthSummary(
    [
      tx(1000, "income", "paid", "2026-10-05"),
      tx(500, "income", "pending", "2026-10-20"),
      tx(200, "expense", "paid", "2026-10-07"),
      tx(999, "income", "paid", "2026-09-30"),
    ],
    "2026-10",
    6,
  );
  assert.deepEqual(
    { ...s, tax: Math.round(s.tax * 100) / 100 },
    { received: 1000, pending: 500, expenses: 200, result: 800, tax: 60 },
  );
});

test("limite anual: 12 meses de recebido, alerta em 80% e MEI padrão", () => {
  const list = [
    tx(40000, "income", "paid", "2026-01-10"),
    tx(30000, "income", "paid", "2025-10-23"),
    tx(50000, "income", "paid", "2025-10-22"),
    tx(9999, "income", "pending", "2026-05-01"),
  ];
  assert.equal(revenueLast12Months(list, "2026-10-22"), 70000);
  const st = limitState(70000, null, "MEI")!;
  assert.equal(st.limit, 81000);
  assert.ok(st.alert && !st.over);
  assert.equal(limitState(50000, null, "MEI")!.alert, false);
  assert.equal(limitState(10, null, "Simples Nacional"), null);
  assert.equal(limitState(90000, 81000, "MEI")!.over, true);
});

test("ranking e margem por projeto", () => {
  assert.deepEqual(
    ranking([
      ["A", 10],
      ["B", 30],
      ["A", 25],
    ]),
    [
      ["A", 35],
      ["B", 30],
    ],
  );
  const m = projectMargins(
    [{ id: "p1", title: "Job", client_name: "X", value: 1000 }],
    [
      tx(250, "expense", "paid", "2026-10-01", { project_id: "p1" }),
      tx(80, "expense", "paid", "2026-10-02", { project_id: "outro" }),
    ],
  );
  assert.equal(m[0].costs, 250);
  assert.equal(m[0].margin, 750);
  assert.equal(m[0].pct, 75);
});

test("formatação: números, datas, tempo, WhatsApp e CSV seguro", () => {
  assert.equal(toNumber("1.234,56"), 1234.56);
  assert.equal(toNumber("12.5"), 12.5);
  assert.equal(toNumber(""), 0);
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(daysUntil("2026-10-25", "2026-10-22"), 3);
  assert.equal(daysUntil("2026-10-20", "2026-10-22"), -2);
  assert.equal(daysUntil(null), null);
  assert.equal(mmss(125), "2:05");
  assert.equal(parseTime("1:30"), 90);
  assert.equal(parseTime("45"), 45);
  assert.equal(parseTime("x:1"), null);
  assert.equal(parseTime(""), null);
  assert.equal(waLink("(11) 98888-7777"), "https://wa.me/5511988887777");
  assert.equal(waLink("+55 11 98888-7777", "oi"), "https://wa.me/5511988887777?text=oi");
  assert.equal(csvCell('a "b"'), '"a ""b"""');
  assert.equal(csvCell("=HYPERLINK(1)"), `"'=HYPERLINK(1)"`);
});
