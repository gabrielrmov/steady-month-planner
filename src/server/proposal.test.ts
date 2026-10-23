import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PROPOSAL_TYPES,
  fillProposal,
  suggestPrice,
  typicalHours,
} from "../lib/pj/proposal-templates.ts";

test("todos os tipos preenchem título, abertura, prazo e pagamento sozinhos", () => {
  for (const type of PROPOSAL_TYPES) {
    const f = fillProposal(
      type,
      { name: "Maria Silva", company: "Padaria Bom Pão" },
      { company: "Estúdio X" },
    );
    assert.ok(f.title && f.intro && f.payment_terms && f.validity, type);
    if (type !== "Outro") assert.ok(f.scope_of_work && f.deliverables && f.timeline, type);
    assert.ok(f.intro.startsWith("Olá, Maria!"), "usa o primeiro nome");
    assert.ok(f.intro.includes("Padaria Bom Pão"));
  }
});

test("sem nome do cliente a abertura continua natural", () => {
  const f = fillProposal("Evento", {}, {});
  assert.ok(!f.intro.includes("undefined") && !f.intro.includes("Olá, !"));
  assert.ok(f.intro.includes("sua empresa"));
});

test("conteúdo mensal usa a quantidade de vídeos", () => {
  const f = fillProposal("Conteúdo mensal", { name: "Ana" }, {}, 8);
  assert.ok(f.scope_of_work.includes("8 vídeos") && f.deliverables.startsWith("8 vídeos"));
  assert.equal(typicalHours("Conteúdo mensal", 8).edit, 16);
});

test("preço sugerido cresce com o trabalho e com o imposto, e é múltiplo de 10", () => {
  const ctx = {
    desiredIncome: 6000,
    fixedCosts: 500,
    billableHours: 80,
    taxRate: 6,
    kitMonthly: 300,
  };
  const diaria = suggestPrice("Diária avulsa", ctx).price;
  const evento = suggestPrice("Evento", ctx).price;
  const casamento = suggestPrice("Casamento", ctx).price;
  assert.ok(diaria < evento && evento < casamento, `${diaria} < ${evento} < ${casamento}`);
  assert.equal(evento % 10, 0);
  assert.ok(suggestPrice("Evento", { ...ctx, taxRate: 15 }).price > evento);
  assert.ok(
    suggestPrice("Conteúdo mensal", ctx, 8).price > suggestPrice("Conteúdo mensal", ctx, 4).price,
  );
});

test("sem perfil preenchido ainda sugere um preço razoável", () => {
  const s = suggestPrice("Institucional");
  assert.ok(Number.isFinite(s.price) && s.price > 0 && s.hourly > 0);
});

import { proposalNumber } from "../lib/pj/proposal-templates.ts";
import { proposalBlocks } from "../lib/pj/doc.ts";

test("número da proposta só existe depois de salvar", () => {
  assert.equal(proposalNumber("2026-10-23", null), "");
  assert.equal(
    proposalNumber("2026-10-23", "ab12cd34-0000-4000-8000-000000000000"),
    "PROP-20261023-AB12",
  );
});

test("documento novo: cabeçalho, capa, investimento, Pix e aceite (só no PDF, não na página do cliente)", () => {
  const d = {
    title: "T",
    client_name: "Ana",
    company: "Loja",
    price: 1500,
    payment_terms: "50% + 50%",
    proposal_date: "2026-10-23",
    validity: "7 dias",
    deliverables: "A\nB",
  };
  const brand = { name: "Estúdio", pix: "chave@pix.com", city: "Salvador/BA" };
  const pdf = proposalBlocks(d, brand, { number: "PROP-1" });
  const kinds = pdf.map((b) => b.t);
  assert.deepEqual(kinds.slice(0, 2), ["header", "hero"]);
  assert.ok(kinds.includes("invest") && kinds.includes("accept"));
  const inv = pdf.find((b) => b.t === "invest") as { pix: string; total: string };
  assert.equal(inv.pix, "chave@pix.com");
  assert.ok(inv.total.includes("1.500,00"));
  const hero = pdf.find((b) => b.t === "hero") as { meta: { label: string; value: string }[] };
  assert.ok(hero.meta.some((m) => m.label === "Nº" && m.value === "PROP-1"));
  assert.ok(!proposalBlocks(d, brand, { web: true }).some((b) => b.t === "accept"));
});
