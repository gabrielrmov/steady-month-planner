import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("reparo de acentos corrige constraints e função criadas com texto quebrado", async () => {
  const pg = new PGlite();
  await pg.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  // simula o estrago: valores com acento virando texto quebrado
  await pg.exec(`ALTER TABLE pj_leads DROP CONSTRAINT pj_leads_stage_check;
    ALTER TABLE pj_leads ADD CONSTRAINT pj_leads_stage_check CHECK (stage IN ('Novo lead','Reuni√£o marcada','Fechado','Perdido'));
    ALTER TABLE pj_projects DROP CONSTRAINT pj_projects_stage_check;
    ALTER TABLE pj_projects ADD CONSTRAINT pj_projects_stage_check CHECK (stage IN ('Pr√©-produ√ß√£o','Entregue','Pago'));
    ALTER TABLE pj_projects ALTER COLUMN stage SET DEFAULT 'Pr√©-produ√ß√£o'`);
  const u = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('a@x.com') RETURNING id")).rows[0].id;
  await assert.rejects(() => pg.query("INSERT INTO pj_leads(user_id, name, stage) VALUES ($1,'x','Reunião marcada')", [u]));

  const repair = readFileSync(new URL("../../db/repair-accents.sql", import.meta.url), "utf8");
  assert.ok(!/[^\x00-\x7F]/.test(repair), "o reparo é só ASCII");
  await pg.exec(repair);
  await pg.exec(repair); // idempotente

  for (const stage of ["Reunião marcada", "Em negociação", "Novo lead"]) {
    await pg.query("INSERT INTO pj_leads(user_id, name, stage) VALUES ($1,'x',$2)", [u, stage]);
  }
  for (const stage of ["Pré-produção", "Captação", "Edição", "Revisão"]) {
    await pg.query("INSERT INTO pj_projects(user_id, title, stage) VALUES ($1,'p',$2)", [u, stage]);
  }
  const d = await pg.query<{ stage: string }>("INSERT INTO pj_projects(user_id, title) VALUES ($1,'sem etapa') RETURNING stage", [u]);
  assert.equal(d.rows[0].stage, "Pré-produção");
  const u2 = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('b@x.com') RETURNING id")).rows[0].id;
  const names = (await pg.query<{ name: string }>("SELECT name FROM categories WHERE user_id = $1", [u2])).rows.map((r) => r.name);
  assert.ok(names.includes("Alimentação") && names.includes("Salário"));
});

test("cadastro de clientes a partir das entradas: cria, liga e não duplica", async () => {
  const pg = new PGlite();
  await pg.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  const u = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('eu@x.com') RETURNING id")).rows[0].id;
  for (const [d, v] of [["KERO+ - ALMA", 1050], ["ANA - ALMA", 450], ["AGÊNCIA NOS", 1650], ["Som Pst", 175]] as const) {
    await pg.query("INSERT INTO transactions(user_id, description, amount, type, due_date, scope) VALUES ($1,$2,$3,'income','2026-10-01','business')", [u, d, v]);
  }
  const sql = readFileSync(new URL("../../db/seed-clients.sql", import.meta.url), "utf8");
  assert.ok(!/[^\x00-\x7F]/.test(sql));
  await pg.exec(sql);
  await pg.exec(sql);
  const clients = (await pg.query<{ name: string }>("SELECT name FROM pj_clients ORDER BY name")).rows.map((r) => r.name);
  assert.deepEqual(clients, ["AGÊNCIA NOS", "ALMA"]);
  const proj = (await pg.query<{ title: string; value: number; stage: string }>("SELECT title, value::float, stage FROM pj_projects ORDER BY title")).rows;
  assert.equal(proj.length, 2);
  assert.deepEqual(proj.map((p) => [p.title, p.value, p.stage]), [["Histórico - AGÊNCIA NOS", 1650, "Pago"], ["Histórico - ALMA", 1500, "Pago"]]);
  const linked = (await pg.query<{ n: number }>("SELECT count(*)::int n FROM transactions WHERE project_id IS NOT NULL")).rows[0].n;
  assert.equal(linked, 3, "Som Pst não casou com nenhum cliente e fica sem ligação");
});
