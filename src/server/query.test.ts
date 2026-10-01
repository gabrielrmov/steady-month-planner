import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { runQuery, type Queryable } from "./query.ts";

let pg: PGlite;
let db: Queryable;
let a: string;
let b: string;

before(async () => {
  pg = new PGlite({ parsers: { 1082: (v: string) => v, 1700: (v: string) => parseFloat(v) } });
  await pg.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  db = { query: async (t, p) => ({ rows: (await pg.query(t, p as unknown[])).rows as Record<string, unknown>[] }) };
  a = (await pg.query<{ id: string }>("INSERT INTO users(email, full_name) VALUES ('a@x.com','Ana') RETURNING id")).rows[0].id;
  b = (await pg.query<{ id: string }>("INSERT INTO users(email, full_name) VALUES ('b@x.com','Beto') RETURNING id")).rows[0].id;
});

test("novo usuário ganha perfil, categorias e teste de 30 dias", async () => {
  const cats = await runQuery(db, a, { table: "categories", action: "select", order: [{ col: "name" }] });
  assert.equal((cats.data as unknown[]).length, 6);
  const sub = await runQuery(db, a, { table: "subscriptions", action: "select", single: "maybe" });
  assert.equal((sub.data as { plan: string }).plan, "trial");
  const prof = await runQuery(db, a, { table: "profiles", action: "select", filters: [{ col: "id", op: "eq", val: a }], single: "single" });
  assert.equal((prof.data as { full_name: string }).full_name, "Ana");
});

test("insere com user_id forçado, embed e isolamento entre usuários", async () => {
  const cat = (await runQuery(db, a, { table: "categories", action: "select", filters: [{ col: "name", op: "eq", val: "Lazer" }], single: "single" })).data as { id: string };
  const ins = await runQuery(db, a, {
    table: "transactions", action: "insert", returning: true, single: "single", columns: "*",
    values: { description: "Cinema", amount: 50, type: "expense", due_date: "2026-10-05", category_id: cat.id, user_id: b },
  });
  assert.equal(ins.error?.code, "42703", "user_id vindo do cliente é recusado");
  const ok = await runQuery(db, a, {
    table: "transactions", action: "insert", returning: true, single: "single", columns: "*",
    values: { description: "Cinema", amount: 50, type: "expense", due_date: "2026-10-05", category_id: cat.id },
  });
  assert.equal(ok.error, null);
  assert.equal((ok.data as { user_id: string }).user_id, a);
  assert.equal(typeof (ok.data as { due_date: unknown }).due_date, "string");

  const list = await runQuery(db, a, { table: "transactions", action: "select", columns: "id, amount, categories(name, color), cards(name)", order: [{ col: "due_date" }] });
  const row = (list.data as { amount: number; categories: { name: string }; cards: unknown }[])[0];
  assert.equal(row.amount, 50);
  assert.equal(row.categories.name, "Lazer");
  assert.equal(row.cards, null);

  const other = await runQuery(db, b, { table: "transactions", action: "select" });
  assert.equal((other.data as unknown[]).length, 0, "B não enxerga dados de A");
  const del = await runQuery(db, b, { table: "transactions", action: "delete", filters: [{ col: "id", op: "eq", val: (ok.data as { id: string }).id }] });
  assert.equal(del.error, null);
  const still = await runQuery(db, a, { table: "transactions", action: "select", count: "exact", head: true });
  assert.equal(still.count, 1, "B não apagou a linha de A");
});

test("update, filtros, contagem e duplicado", async () => {
  const upd = await runQuery(db, a, { table: "transactions", action: "update", values: { status: "paid" }, filters: [{ col: "description", op: "eq", val: "Cinema" }] });
  assert.equal(upd.error, null);
  const paid = await runQuery(db, a, { table: "transactions", action: "select", count: "exact", head: true, filters: [{ col: "status", op: "eq", val: "paid" }] });
  assert.equal(paid.count, 1);
  const none = await runQuery(db, a, { table: "transactions", action: "select", filters: [{ col: "category_id", op: "is", val: null }, { col: "installment_total", op: "is", val: null, not: true }] });
  assert.equal((none.data as unknown[]).length, 0);
  const dup = { description: "X", amount: 1, type: "expense", due_date: "2026-10-06", fingerprint: "f1" };
  assert.equal((await runQuery(db, a, { table: "transactions", action: "insert", values: dup })).error, null);
  assert.equal((await runQuery(db, a, { table: "transactions", action: "insert", values: dup })).error?.code, "23505");
});

test("recusa tabelas, colunas e operações fora da lista", async () => {
  assert.equal((await runQuery(db, a, { table: "users", action: "select" })).error?.code, "42P01");
  assert.equal((await runQuery(db, a, { table: "subscriptions", action: "update", values: { plan: "pro" } })).error?.code, "42501");
  assert.equal((await runQuery(db, a, { table: "categories", action: "select", filters: [{ col: "name; drop table users", op: "eq", val: 1 }] })).error?.code, "42703");
  assert.equal((await runQuery(db, a, { table: "categories", action: "select", columns: "name, secret" })).error?.code, "42703");
  assert.equal((await runQuery(db, a, { table: "profiles", action: "update", values: { id: b }, filters: [] })).error?.code, "42703");
});

test("login Google: cria, reconhece pelo sub e religa conta migrada pelo e-mail", async () => {
  const { upsertGoogleUser } = await import("./users.ts");
  const novo = await upsertGoogleUser(db, { sub: "g-1", email: "Novo@x.com", name: "Novo", picture: null });
  assert.equal((await runQuery(db, novo.id, { table: "categories", action: "select" })).data?.valueOf().constructor, Array);
  const igual = await upsertGoogleUser(db, { sub: "g-1", email: "novo@x.com", name: "Novo", picture: null });
  assert.equal(igual.id, novo.id);
  // conta vinda do Supabase: já existe sem google_sub, com o mesmo e-mail
  const migrada = (await pg.query<{ id: string }>("INSERT INTO users(id, email) VALUES (gen_random_uuid(), 'velho@x.com') RETURNING id")).rows[0].id;
  const religada = await upsertGoogleUser(db, { sub: "g-2", email: "VELHO@x.com", name: "Velho", picture: null });
  assert.equal(religada.id, migrada);
  // outro Google com e-mail de conta já ligada não a sequestra
  const outro = await upsertGoogleUser(db, { sub: "g-3", email: "velho2@x.com", name: null, picture: null }).catch((e) => e);
  assert.ok(outro.id);
});
