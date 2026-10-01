#!/usr/bin/env node
/**
 * Migra o FINLIST do Supabase para o PostgreSQL (Neon).
 *
 *   node db/migrate-data.mjs --check     só lê o Supabase e mostra o que existe (não escreve nada)
 *   node db/migrate-data.mjs --schema    aplica db/schema.sql no Neon
 *   node db/migrate-data.mjs             schema + cópia dos dados (pode rodar de novo: não duplica)
 *
 * Lê SUPABASE_DB_URL e NEON_DATABASE_URL de .env.migracao (ou do ambiente). O Supabase é só LIDO.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL("..", import.meta.url));
if (existsSync(root + ".env.migracao")) {
  for (const line of readFileSync(root + ".env.migracao", "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
  }
}
const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--schema") ? "schema" : "all";

pg.types.setTypeParser(1082, (v) => v); // date como texto, sem deslocar fuso
const connect = async (name) => {
  const url = process.env[name];
  if (!url) throw new Error(`${name} vazio em .env.migracao`);
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  return c;
};

// Ordem respeita as chaves estrangeiras.
const TABLES = [
  "profiles", "subscriptions", "categories", "cards", "import_batches", "transactions",
  "category_rules", "bank_connections", "savings_goals", "income_split_categories",
];

const columnsOf = async (c, table) =>
  (await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table],
  )).rows.map((r) => r.column_name);

const src = await connect("SUPABASE_DB_URL");

console.log("\n== Supabase (somente leitura) ==");
const srcTables = (await src.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1`,
)).rows.map((r) => r.table_name);
const counts = {};
for (const t of srcTables) {
  counts[t] = (await src.query(`SELECT count(*)::int n FROM public."${t}"`)).rows[0].n;
  console.log(`  ${t.padEnd(26)} ${counts[t]}`);
}
const authUsers = (await src.query(`SELECT count(*)::int n FROM auth.users`)).rows[0].n;
console.log(`  ${"auth.users".padEnd(26)} ${authUsers}`);
const unknown = srcTables.filter((t) => !TABLES.includes(t));
if (unknown.length) console.log(`  ATENÇÃO: tabelas sem plano de migração: ${unknown.join(", ")}`);

if (mode === "check") {
  const isc = await columnsOf(src, "income_split_categories");
  console.log("\n  colunas de income_split_categories:", isc.join(", ") || "(tabela não existe)");
  await src.end();
  process.exit(0);
}

const dst = await connect("NEON_DATABASE_URL");
console.log("\n== Neon: aplicando schema ==");
await dst.query(readFileSync(root + "db/schema.sql", "utf8"));
console.log("  ok");
if (mode === "schema") {
  await src.end();
  await dst.end();
  process.exit(0);
}

console.log("\n== Copiando dados ==");
// Gatilhos de "novo usuário" criariam perfil/categorias/assinatura duplicados: desligados só durante a cópia.
await dst.query("ALTER TABLE public.users DISABLE TRIGGER on_user_created");
await dst.query("ALTER TABLE public.profiles DISABLE TRIGGER on_profile_created_subscription");
try {
  const users = (await src.query(`
    SELECT u.id, u.email,
           (SELECT i.identity_data->>'sub' FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'google' LIMIT 1) AS google_sub,
           COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') AS full_name,
           COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') AS avatar_url,
           u.created_at, u.last_sign_in_at AS last_login_at
    FROM auth.users u WHERE u.email IS NOT NULL`)).rows;
  for (const u of users) {
    await dst.query(
      `INSERT INTO public.users (id, email, google_sub, full_name, avatar_url, created_at, last_login_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.google_sub, u.full_name, u.avatar_url, u.created_at, u.last_login_at],
    );
  }
  console.log(`  users                      ${users.length}`);

  for (const t of TABLES) {
    if (!srcTables.includes(t)) {
      console.log(`  ${t.padEnd(26)} (não existe no Supabase, pulada)`);
      continue;
    }
    const sc = await columnsOf(src, t);
    const dc = await columnsOf(dst, t);
    const cols = sc.filter((c) => dc.includes(c));
    const lost = sc.filter((c) => !dc.includes(c));
    if (lost.length) console.log(`  ATENÇÃO ${t}: colunas do Supabase sem destino (não copiadas): ${lost.join(", ")}`);
    const rows = (await src.query(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM public."${t}"`)).rows;
    const list = cols.map((c) => `"${c}"`).join(", ");
    for (let i = 0; i < rows.length; i += 500) {
      await dst.query(
        `INSERT INTO public."${t}" (${list}) SELECT ${list} FROM jsonb_populate_recordset(null::public."${t}", $1::jsonb)
         ON CONFLICT DO NOTHING`,
        [JSON.stringify(rows.slice(i, i + 500))],
      );
    }
    console.log(`  ${t.padEnd(26)} ${rows.length}`);
  }
} finally {
  await dst.query("ALTER TABLE public.users ENABLE TRIGGER on_user_created");
  await dst.query("ALTER TABLE public.profiles ENABLE TRIGGER on_profile_created_subscription");
}

console.log("\n== Conferência (origem × destino) ==");
let bad = 0;
for (const t of ["users", ...TABLES]) {
  const a = t === "users" ? authUsers : counts[t] ?? 0;
  const b = (await dst.query(`SELECT count(*)::int n FROM public."${t}"`)).rows[0].n;
  if (a !== b) bad++;
  console.log(`  ${t.padEnd(26)} ${String(a).padStart(6)} × ${String(b).padStart(6)} ${a === b ? "ok" : "DIFERENTE"}`);
}
await src.end();
await dst.end();
console.log(bad ? `\n${bad} tabela(s) com contagem diferente: revise antes de virar a chave.` : "\nTudo conferido.");
process.exit(bad ? 1 : 0);
