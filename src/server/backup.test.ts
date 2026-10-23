import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { runQuery, type Queryable } from "./query.ts";
import {
  buildBackup,
  parseBackup,
  restoreInto,
  type BackupStore,
  type Row,
} from "../lib/pj/backup.ts";
import { followUpMessages, prospectMessages, briefingText } from "../lib/pj/texts.ts";

let db: Queryable;
let a: string;
let b: string;

const q = (uid: string, req: Parameters<typeof runQuery>[2]) => runQuery(db, uid, req);
const storeFor = (uid: string): BackupStore => ({
  async list(table) {
    const scoped = table === "categories" || table === "transactions";
    const r = await q(uid, {
      table,
      action: "select",
      filters: scoped ? [{ col: "scope", op: "eq", val: "business" }] : [],
    });
    if (r.error) throw new Error(r.error.message);
    return r.data as Row[];
  },
  async insert(table, row) {
    const r = await q(uid, {
      table,
      action: "insert",
      values: row,
      returning: true,
      single: "single",
      columns: "*",
    });
    if (r.error) throw new Error(r.error.message);
    return r.data as Row;
  },
  async update(table, id, row) {
    const r = await q(uid, {
      table,
      action: "update",
      values: row,
      filters: [{ col: "id", op: "eq", val: id }],
    });
    if (r.error) throw new Error(r.error.message);
  },
});
const rows = async (uid: string, table: string) => (await storeFor(uid).list(table)) as Row[];

before(async () => {
  const pg = new PGlite({
    parsers: { 1082: (v: string) => v, 1700: (v: string) => parseFloat(v) },
  });
  await pg.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  db = {
    query: async (t, p) => ({
      rows: (await pg.query(t, p as unknown[])).rows as Record<string, unknown>[],
    }),
  };
  a = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('a@bk.com') RETURNING id"))
    .rows[0].id;
  b = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('b@bk.com') RETURNING id"))
    .rows[0].id;

  const s = storeFor(a);
  await s.insert("pj_profile", { company: "Estúdio A", tax_rate: 6 });
  const client = await s.insert("pj_clients", { name: "Maria", company: "Padaria" });
  const proposal = await s.insert("pj_proposals", {
    title: "Proposta",
    client_id: client.id,
    price: 1000,
  });
  const project = await s.insert("pj_projects", {
    title: "Job",
    client_id: client.id,
    proposal_id: proposal.id,
    value: 1000,
    checklist: [{ t: "Briefing", done: true }],
    videos: [{ title: "Corte 1", url: "https://youtu.be/dQw4w9WgXcQ" }],
  });
  await s.insert("pj_leads", { name: "Lead", stage: "Novo lead" });
  await s.insert("pj_equipment", { name: "Câmera", cost: 5000 });
  const cat = await s.insert("categories", {
    name: "Projeto/Job",
    kind: "income",
    scope: "business",
  });
  await s.insert("transactions", {
    description: "Job — Padaria",
    amount: 1000,
    type: "income",
    due_date: "2026-10-20",
    scope: "business",
    project_id: project.id,
    category_id: cat.id,
  });
  await s.insert("transactions", {
    description: "Pessoal",
    amount: 10,
    type: "expense",
    due_date: "2026-10-20",
  });
});

test("backup só leva dados PJ (sem pessoais, sem user_id)", async () => {
  const bk = await buildBackup(storeFor(a));
  assert.equal(bk.tables.transactions?.length, 1);
  assert.equal(bk.tables.categories?.length, 1);
  assert.ok(!JSON.stringify(bk).includes(a), "user_id não vai no arquivo");
  assert.ok(!JSON.stringify(bk).includes("Pessoal"));
});

test("restaurar em outra conta cria cópias com as relações refeitas e não toca na conta original", async () => {
  const bk = parseBackup(JSON.stringify(await buildBackup(storeFor(a))));
  const rep = await restoreInto(storeFor(b), bk);
  assert.equal(rep.skipped, 0);
  assert.ok(rep.created >= 8);

  const [client] = await rows(b, "pj_clients");
  const [project] = await rows(b, "pj_projects");
  const [tx] = await rows(b, "transactions");
  const [cat] = await rows(b, "categories");
  assert.equal(project.client_id, client.id);
  assert.equal(tx.project_id, project.id);
  assert.equal(tx.category_id, cat.id);
  assert.equal(tx.scope, "business");
  assert.deepEqual(project.checklist, [{ t: "Briefing", done: true }]);
  assert.notEqual(
    client.id,
    (await rows(a, "pj_clients"))[0].id,
    "id novo: o original é da conta A",
  );

  assert.equal((await rows(a, "pj_projects")).length, 1);
  assert.equal((await rows(a, "transactions")).length, 1);
});

test("restaurar na mesma conta atualiza em vez de duplicar", async () => {
  const bk = await buildBackup(storeFor(a));
  const rep = await restoreInto(storeFor(a), bk);
  assert.equal(rep.created, 0);
  assert.ok(rep.updated >= 8);
  assert.equal((await rows(a, "pj_clients")).length, 1);
  assert.equal((await rows(a, "pj_projects")).length, 1);
  assert.equal((await rows(a, "pj_leads")).length, 1);
});

test("backup malicioso: scope e dono forçados, tabelas desconhecidas e referências soltas ignoradas", async () => {
  const evil = parseBackup(
    JSON.stringify({
      app: "finlist-pj",
      version: 1,
      tables: {
        users: [{ id: "00000000-0000-4000-8000-000000000000", email: "x@x.com" }],
        subscriptions: [{ plan: "pfpj", status: "active" }],
        transactions: [
          {
            id: "11111111-2222-4333-8444-555555555555",
            user_id: a,
            scope: "personal",
            description: "Injetada",
            amount: 1,
            type: "income",
            due_date: "2026-10-01",
            project_id: "99999999-9999-4999-8999-999999999999",
          },
        ],
        pj_clients: [{ name: "x", user_id: a }, "lixo", null],
      },
    }),
  );
  const before = (await rows(a, "pj_clients")).length;
  const rep = await restoreInto(storeFor(b), evil);
  assert.ok(rep.skipped >= 2, "linhas inválidas contadas");
  const injected = (await rows(b, "transactions")).find((t) => t.description === "Injetada")!;
  assert.equal(injected.scope, "business");
  assert.equal(injected.project_id, null, "referência para id desconhecido é descartada");
  assert.equal((await rows(a, "pj_clients")).length, before, "nada vazou para a conta A");
  assert.equal(
    ((await q(b, { table: "subscriptions", action: "select" })).data as { plan: string }[])[0].plan,
    "trial",
  );
});

test("arquivos que não são backup são recusados", () => {
  assert.throws(() => parseBackup("não é json"), /JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ app: "outro" })), /não é um backup/);
  assert.throws(
    () => parseBackup(JSON.stringify({ app: "finlist-pj", version: 2, tables: {} })),
    /não é um backup/,
  );
});

test("mensagens usam nome e projeto; briefing tem perguntas por tipo", () => {
  assert.ok(
    followUpMessages("Achou o valor alto", "Ana", "vídeo institucional")[0].includes("Ana"),
  );
  assert.equal(followUpMessages("Cliente sumiu", "", "").length, 2);
  assert.ok(
    prospectMessages("WhatsApp", "Ana", "Padaria", "o forno a lenha", "Gabriel")[0].includes(
      "Sou Gabriel",
    ),
  );
  assert.ok(prospectMessages("E-mail", "Ana", "Padaria", "", "")[0].startsWith("Assunto:"));
  const t = briefingText({ type: "Evento", client: "Padaria", date: "2026-10-22" });
  assert.ok(
    t.includes("BRIEFING — Evento") &&
      t.includes("22/10/2026") &&
      t.includes("PERGUNTAS PARA ALINHAR"),
  );
});
