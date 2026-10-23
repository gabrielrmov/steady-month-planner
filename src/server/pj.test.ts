import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { runQuery, type Queryable } from "./query.ts";

let pg: PGlite;
let db: Queryable;
let a: string;
let b: string;

const ins = (uid: string, table: string, values: Record<string, unknown>) =>
  runQuery(db, uid, {
    table,
    action: "insert",
    values,
    returning: true,
    single: "single",
    columns: "*",
  });
const sel = (
  uid: string,
  table: string,
  filters: { col: string; op: string; val?: unknown }[] = [],
) => runQuery(db, uid, { table, action: "select", filters });

before(async () => {
  pg = new PGlite({ parsers: { 1082: (v: string) => v, 1700: (v: string) => parseFloat(v) } });
  await pg.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  db = {
    query: async (t, p) => ({
      rows: (await pg.query(t, p as unknown[])).rows as Record<string, unknown>[],
    }),
  };
  a = (
    await pg.query<{ id: string }>(
      "INSERT INTO users(email, full_name) VALUES ('a@pj.com','Ana') RETURNING id",
    )
  ).rows[0].id;
  b = (
    await pg.query<{ id: string }>(
      "INSERT INTO users(email, full_name) VALUES ('b@pj.com','Beto') RETURNING id",
    )
  ).rows[0].id;
});

const SAMPLES: Record<string, Record<string, unknown>> = {
  pj_profile: { company: "Estúdio A", tax_rate: 6 },
  pj_clients: { name: "Cliente A", company: "Empresa A" },
  pj_leads: { name: "Lead A", value: 1000, stage: "Novo lead" },
  pj_proposals: { title: "Proposta A", price: 2500 },
  pj_contracts: { contract_type: "pontual", client_name: "Cliente A", value: 2500 },
  pj_projects: { title: "Projeto A", value: 2500 },
  pj_equipment: { name: "Câmera A", cost: 9000 },
};

for (const [table, row] of Object.entries(SAMPLES)) {
  test(`${table}: cada usuário só enxerga e altera as próprias linhas`, async () => {
    const mine = await ins(a, table, row);
    assert.equal(mine.error, null);
    const id = (mine.data as { id: string }).id;
    assert.equal((mine.data as { user_id: string }).user_id, a);

    assert.equal(((await sel(b, table)).data as unknown[]).length, 0, "B não lê dados de A");
    const forged = await ins(b, table, { ...row, user_id: a });
    assert.equal(forged.error?.code, "42501", "B não grava em nome de A");

    const upd = await runQuery(db, b, {
      table,
      action: "update",
      values: { created_at: "2020-01-01" },
      filters: [{ col: "id", op: "eq", val: id }],
    });
    assert.ok(upd.error, "campos protegidos são recusados");
    const del = await runQuery(db, b, {
      table,
      action: "delete",
      filters: [{ col: "id", op: "eq", val: id }],
    });
    assert.equal(del.error, null);
    assert.equal(((await sel(a, table)).data as unknown[]).length, 1, "B não apagou a linha de A");
  });
}

test("pj_profile: um perfil por usuário", async () => {
  const second = await ins(a, "pj_profile", { company: "Outra" });
  assert.equal(second.error?.code, "23505");
  const mineB = await ins(b, "pj_profile", { company: "Estúdio B" });
  assert.equal(mineB.error, null);
});

test("valores inválidos são barrados pelo banco", async () => {
  assert.ok((await ins(a, "pj_leads", { name: "X", stage: "Inventada" })).error);
  assert.ok((await ins(a, "pj_projects", { title: "X", stage: "Inventada" })).error);
  assert.ok((await ins(a, "pj_equipment", { name: "X", cost: -1 })).error);
  assert.ok((await ins(b, "pj_profile", { tax_rate: 120 })).error);
  assert.ok((await ins(a, "pj_proposals", { title: "X", status: "Inventada" })).error);
});

test("checklist e vídeos (JSONB) vão e voltam como estruturas", async () => {
  const checklist = [
    { t: "Briefing aprovado", done: true },
    { t: "Captação feita", done: false },
  ];
  const videos = [{ title: "Corte 1", url: "https://youtu.be/dQw4w9WgXcQ" }];
  const p = await ins(a, "pj_projects", { title: "JSON", checklist, videos });
  assert.equal(p.error, null);
  const row = p.data as { id: string; checklist: unknown; videos: unknown };
  assert.deepEqual(row.checklist, checklist);
  assert.deepEqual(row.videos, videos);
  const up = await runQuery(db, a, {
    table: "pj_projects",
    action: "update",
    values: { checklist: [{ t: "Novo", done: false }] },
    filters: [{ col: "id", op: "eq", val: row.id }],
  });
  assert.equal(up.error, null);
  const again = (await sel(a, "pj_projects", [{ col: "id", op: "eq", val: row.id }])).data as {
    checklist: unknown;
  }[];
  assert.deepEqual(again[0].checklist, [{ t: "Novo", done: false }]);
});

test("transactions: scope padrão é pessoal e project_id liga o recebimento ao projeto", async () => {
  const personal = await ins(a, "transactions", {
    description: "Mercado",
    amount: 50,
    type: "expense",
    due_date: "2026-10-05",
  });
  assert.equal((personal.data as { scope: string }).scope, "personal");
  const proj = (await ins(a, "pj_projects", { title: "Job" })).data as { id: string };
  const biz = await ins(a, "transactions", {
    description: "Job — Cliente",
    amount: 3000,
    type: "income",
    due_date: "2026-10-20",
    scope: "business",
    project_id: proj.id,
  });
  assert.equal(biz.error, null);
  assert.equal((biz.data as { project_id: string }).project_id, proj.id);
  assert.ok(
    (
      await ins(a, "transactions", {
        description: "x",
        amount: 1,
        type: "income",
        due_date: "2026-10-20",
        scope: "outro",
      })
    ).error,
  );

  const onlyBiz = (await sel(a, "transactions", [{ col: "scope", op: "eq", val: "business" }]))
    .data as unknown[];
  assert.equal(onlyBiz.length, 1);
  assert.equal(
    (
      (await sel(b, "transactions", [{ col: "scope", op: "eq", val: "business" }]))
        .data as unknown[]
    ).length,
    0,
  );
});

test("shares: token é gerado pelo banco, não é gravável e eventos só entram no link do próprio dono", async () => {
  const forged = await ins(a, "shares", { kind: "proposal", title: "P", token: "fraco" });
  assert.equal(forged.error?.code, "42703", "token não pode ser escolhido pelo cliente");

  const mine = await ins(a, "shares", {
    kind: "proposal",
    title: "Proposta",
    snapshot: { title: "Proposta" },
  });
  assert.equal(mine.error, null);
  const share = mine.data as { id: string; token: string };
  assert.match(share.token, /^[0-9a-f]{64}$/);
  const other = (await ins(a, "shares", { kind: "delivery", title: "Entrega" })).data as {
    token: string;
  };
  assert.notEqual(other.token, share.token);

  assert.equal(((await sel(b, "shares")).data as unknown[]).length, 0, "B não lista links de A");
  const evil = await ins(b, "share_events", { share_id: share.id, type: "reply", body: "oi" });
  assert.ok(evil.error, "B não injeta eventos no link de A");
  const ok = await ins(a, "share_events", { share_id: share.id, type: "reply", body: "Obrigado!" });
  assert.equal(ok.error, null);
  assert.equal(((await sel(b, "share_events")).data as unknown[]).length, 0);

  const rotate = await runQuery(db, a, {
    table: "shares",
    action: "update",
    values: { token: "novo" },
    filters: [{ col: "id", op: "eq", val: share.id }],
  });
  assert.equal(rotate.error?.code, "42703");
});

test("rate_limits não é acessível pelo /api/db", async () => {
  assert.equal(
    (await runQuery(db, a, { table: "rate_limits", action: "select" })).error?.code,
    "42P01",
  );
});
