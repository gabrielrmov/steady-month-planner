/**
 * Motor de consultas do FINLIST: recebe uma descrição JSON de uma consulta (a mesma forma do
 * supabase-js: select/insert/update/delete + filtros + order + embeds) e executa em PostgreSQL puro.
 *
 * Segurança (substitui o RLS do Supabase): tabelas e colunas vêm de uma lista fixa, todo valor vai
 * como parâmetro ($n) e TODA consulta é restrita ao usuário da sessão (user_id = uid).
 */

export type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

export type Filter = { col: string; op: string; val?: unknown; not?: boolean };

export type QueryRequest = {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  /** select: lista de colunas/embeds. Após insert/update/delete: o que devolver (.select()). */
  columns?: string;
  returning?: boolean;
  values?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Filter[];
  order?: { col: string; ascending?: boolean }[];
  limit?: number;
  count?: "exact" | null;
  head?: boolean;
  single?: "single" | "maybe" | null;
};

export type QueryResult = {
  data: unknown;
  count: number | null;
  error: { message: string; code?: string; details?: string | null } | null;
};

type TableDef = {
  /** Coluna que prende a linha ao usuário. */
  scope: "user_id" | "id";
  actions: ReadonlyArray<QueryRequest["action"]>;
  /** Relações embutidas no select: nome → tabela e coluna local. */
  embeds?: Record<string, { table: string; fk: string }>;
};

const ALL = ["select", "insert", "update", "delete"] as const;

export const TABLES: Record<string, TableDef> = {
  profiles: { scope: "id", actions: ["select", "update"] },
  categories: { scope: "user_id", actions: ALL },
  cards: { scope: "user_id", actions: ALL },
  transactions: {
    scope: "user_id",
    actions: ALL,
    embeds: {
      categories: { table: "categories", fk: "category_id" },
      cards: { table: "cards", fk: "card_id" },
    },
  },
  category_rules: {
    scope: "user_id",
    actions: ALL,
    embeds: { categories: { table: "categories", fk: "category_id" } },
  },
  import_batches: { scope: "user_id", actions: ALL },
  bank_connections: { scope: "user_id", actions: ALL },
  savings_goals: { scope: "user_id", actions: ALL },
  income_split_categories: { scope: "user_id", actions: ALL },
  // Plano/assinatura só é lido pelo app; quem escreve é o servidor (gatilhos e, no futuro, o pagamento).
  subscriptions: { scope: "user_id", actions: ["select"] },
};

const NEVER_WRITABLE = new Set(["user_id", "created_at", "updated_at"]);
const FILTER_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "is", "in", "like", "ilike"]);
const MAX_ROWS = 5000;
const MAX_PARAMS = 60000;

class QueryError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

const columnCache = new WeakMap<object, Promise<Map<string, Set<string>>>>();

function loadColumns(db: Queryable): Promise<Map<string, Set<string>>> {
  let p = columnCache.get(db);
  if (!p) {
    p = db
      .query(
        `SELECT table_name, column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ANY($1)`,
        [Object.keys(TABLES)],
      )
      .then((r) => {
        const m = new Map<string, Set<string>>();
        for (const row of r.rows) {
          const t = row.table_name as string;
          if (!m.has(t)) m.set(t, new Set());
          m.get(t)!.add(row.column_name as string);
        }
        return m;
      });
    p.catch(() => columnCache.delete(db));
    columnCache.set(db, p);
  }
  return p;
}

/** Divide "a, b, cards(id, name)" na vírgula de nível zero. */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

type SelectItem = { kind: "col"; name: string } | { kind: "star" } | { kind: "embed"; name: string; inner: string };

function parseSelect(s: string): SelectItem[] {
  return splitTop(s).map((part) => {
    if (part === "*") return { kind: "star" as const };
    const m = /^([a-z_]+)\((.*)\)$/s.exec(part);
    if (m) return { kind: "embed" as const, name: m[1], inner: m[2] };
    if (/^[a-z_]+$/.test(part)) return { kind: "col" as const, name: part };
    throw new QueryError(`Seleção inválida: ${part}`, "PGRST100");
  });
}

function selectList(
  items: SelectItem[],
  alias: string,
  table: string,
  cols: Map<string, Set<string>>,
  uid: string,
  params: unknown[],
  allowEmbeds: boolean,
): string {
  const own = cols.get(table)!;
  const parts: string[] = [];
  for (const it of items) {
    if (it.kind === "star") {
      for (const c of own) parts.push(`${alias}.${q(c)}`);
    } else if (it.kind === "col") {
      if (!own.has(it.name)) throw new QueryError(`Coluna desconhecida: ${table}.${it.name}`, "42703");
      parts.push(`${alias}.${q(it.name)}`);
    } else {
      const def = TABLES[table].embeds?.[it.name];
      if (!allowEmbeds || !def) throw new QueryError(`Relação desconhecida: ${table}.${it.name}`, "PGRST200");
      const innerItems = parseSelect(it.inner);
      if (innerItems.some((x) => x.kind === "embed")) throw new QueryError("Embeds aninhados não suportados");
      params.push(uid);
      const uidParam = `$${params.length}`;
      const inner = selectList(innerItems, "e", def.table, cols, uid, params, false);
      const scope = TABLES[def.table].scope;
      parts.push(
        `(SELECT to_jsonb(x) FROM (SELECT ${inner} FROM public.${q(def.table)} e ` +
          `WHERE e.id = ${alias}.${q(def.fk)} AND e.${q(scope)} = ${uidParam}) x) AS ${q(it.name)}`,
      );
    }
  }
  if (parts.length === 0) throw new QueryError("Seleção vazia", "PGRST100");
  return parts.join(", ");
}

function buildWhere(
  filters: Filter[] | undefined,
  alias: string,
  table: string,
  cols: Map<string, Set<string>>,
  uid: string,
  params: unknown[],
): string {
  const own = cols.get(table)!;
  params.push(uid);
  const conds = [`${alias}.${q(TABLES[table].scope)} = $${params.length}`];
  for (const f of filters ?? []) {
    if (!own.has(f.col)) throw new QueryError(`Coluna desconhecida: ${table}.${f.col}`, "42703");
    if (!FILTER_OPS.has(f.op)) throw new QueryError(`Operador inválido: ${f.op}`, "PGRST100");
    const col = `${alias}.${q(f.col)}`;
    let cond: string;
    if (f.op === "is") {
      if (f.val === null || f.val === undefined) cond = `${col} IS NULL`;
      else if (f.val === true || f.val === false) cond = `${col} IS ${f.val ? "TRUE" : "FALSE"}`;
      else throw new QueryError("Valor inválido para IS");
    } else if (f.op === "in") {
      if (!Array.isArray(f.val)) throw new QueryError("IN exige lista");
      params.push(f.val);
      cond = `${col} = ANY($${params.length})`;
    } else {
      const sql = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "LIKE", ilike: "ILIKE" }[f.op]!;
      params.push(f.val);
      cond = `${col} ${sql} $${params.length}`;
    }
    conds.push(f.not ? `NOT (${cond})` : cond);
  }
  return conds.join(" AND ");
}

function writableColumns(table: string, cols: Map<string, Set<string>>): Set<string> {
  const def = TABLES[table];
  const out = new Set<string>();
  for (const c of cols.get(table)!) {
    if (NEVER_WRITABLE.has(c)) continue;
    if (c === "id" && def.scope === "id") continue;
    out.add(c);
  }
  return out;
}

/**
 * As telas mandam `user_id` em inserções. O servidor sempre grava o usuário da sessão; por isso o
 * próprio id é aceito e descartado, e o de outra pessoa é recusado.
 */
function dropOwnScope(row: Record<string, unknown>, scope: string, uid: string): Record<string, unknown> {
  if (!(scope in row) || scope === "id") return row;
  if (row[scope] !== uid) throw new QueryError("Operação não permitida para outro usuário", "42501");
  const { [scope]: _drop, ...rest } = row;
  return rest;
}

function shape(rows: Record<string, unknown>[], req: QueryRequest): unknown {
  if (req.single) {
    if (rows.length === 1) return rows[0];
    if (rows.length === 0 && req.single === "maybe") return null;
    throw new QueryError(
      "JSON object requested, multiple (or no) rows returned",
      "PGRST116",
    );
  }
  return rows;
}

async function execute(db: Queryable, uid: string, req: QueryRequest): Promise<QueryResult> {
  const def = TABLES[req.table];
  if (!def) throw new QueryError(`Tabela não permitida: ${req.table}`, "42P01");
  if (!def.actions.includes(req.action)) throw new QueryError(`Operação não permitida em ${req.table}`, "42501");
  const cols = await loadColumns(db);
  if (!cols.get(req.table)) throw new QueryError(`Tabela inexistente no banco: ${req.table}`, "42P01");

  const params: unknown[] = [];
  const table = `public.${q(req.table)}`;

  if (req.action === "select") {
    const where = buildWhere(req.filters, "t", req.table, cols, uid, params);
    if (req.count && req.head) {
      const r = await db.query(`SELECT count(*)::int AS n FROM ${table} t WHERE ${where}`, params);
      return { data: null, count: r.rows[0].n as number, error: null };
    }
    const list = selectList(parseSelect(req.columns || "*"), "t", req.table, cols, uid, params, true);
    let sql = `SELECT ${list} FROM ${table} t WHERE ${where}`;
    if (req.order?.length) {
      const own = cols.get(req.table)!;
      sql +=
        " ORDER BY " +
        req.order
          .map((o) => {
            if (!own.has(o.col)) throw new QueryError(`Coluna desconhecida: ${req.table}.${o.col}`, "42703");
            return `t.${q(o.col)} ${o.ascending === false ? "DESC NULLS LAST" : "ASC NULLS LAST"}`;
          })
          .join(", ");
    }
    const limit = Math.min(Math.max(Number(req.limit) || MAX_ROWS, 1), MAX_ROWS);
    sql += ` LIMIT ${limit}`;
    const r = await db.query(sql, params);
    let count: number | null = null;
    if (req.count) {
      const cp: unknown[] = [];
      const cw = buildWhere(req.filters, "t", req.table, cols, uid, cp);
      count = (await db.query(`SELECT count(*)::int AS n FROM ${table} t WHERE ${cw}`, cp)).rows[0].n as number;
    }
    return { data: shape(r.rows, req), count, error: null };
  }

  const returningSql = () =>
    req.returning
      ? ` RETURNING ${selectList(parseSelect(req.columns || "*"), req.table, req.table, cols, uid, params, false)}`
      : "";

  if (req.action === "insert") {
    const rows = (Array.isArray(req.values) ? req.values : req.values ? [req.values] : []).map((r) =>
      dropOwnScope(r, def.scope, uid),
    );
    if (rows.length === 0) return { data: req.returning ? [] : null, count: null, error: null };
    if (rows.length > MAX_ROWS) throw new QueryError("Linhas demais em uma inserção", "54000");
    const writable = writableColumns(req.table, cols);
    const used = new Set<string>();
    for (const row of rows) {
      for (const k of Object.keys(row)) {
        if (!writable.has(k)) throw new QueryError(`Coluna não permitida: ${req.table}.${k}`, "42703");
        used.add(k);
      }
    }
    const colList = [def.scope, ...used];
    if (rows.length * colList.length > MAX_PARAMS) throw new QueryError("Inserção grande demais", "54000");
    params.length = 0;
    const tuples = rows.map((row) => {
      const cells = colList.map((c) => {
        if (c === def.scope) {
          params.push(uid);
          return `$${params.length}`;
        }
        if (!(c in row) || row[c] === undefined) return "DEFAULT";
        params.push(row[c]);
        return `$${params.length}`;
      });
      return `(${cells.join(", ")})`;
    });
    const ret = returningSql();
    const r = await db.query(
      `INSERT INTO ${table} (${colList.map(q).join(", ")}) VALUES ${tuples.join(", ")}${ret}`,
      params,
    );
    return { data: req.returning ? shape(r.rows, req) : null, count: null, error: null };
  }

  if (req.action === "update") {
    const patch = dropOwnScope((Array.isArray(req.values) ? req.values[0] : req.values) ?? {}, def.scope, uid);
    const writable = writableColumns(req.table, cols);
    const keys = Object.keys(patch);
    if (keys.length === 0) throw new QueryError("Nada para atualizar", "22023");
    const sets = keys.map((k) => {
      if (!writable.has(k)) throw new QueryError(`Coluna não permitida: ${req.table}.${k}`, "42703");
      params.push(patch[k]);
      return `${q(k)} = $${params.length}`;
    });
    // O RETURNING usa o nome da tabela como alias; o WHERE também.
    const where = buildWhere(req.filters, q(req.table), req.table, cols, uid, params);
    const ret = returningSql();
    const r = await db.query(`UPDATE ${table} SET ${sets.join(", ")} WHERE ${where}${ret}`, params);
    return { data: req.returning ? shape(r.rows, req) : null, count: null, error: null };
  }

  // delete
  const where = buildWhere(req.filters, q(req.table), req.table, cols, uid, params);
  const r = await db.query(`DELETE FROM ${table} WHERE ${where}${returningSql()}`, params);
  return { data: req.returning ? shape(r.rows, req) : null, count: null, error: null };
}

export async function runQuery(db: Queryable, uid: string, req: QueryRequest): Promise<QueryResult> {
  try {
    return await execute(db, uid, req);
  } catch (e) {
    const err = e as { message?: string; code?: string; detail?: string };
    // Erros de validação nossos e erros do Postgres (ex.: 23505 duplicado) chegam ao cliente iguais ao PostgREST.
    return {
      data: null,
      count: null,
      error: { message: err.message ?? "Erro", code: err.code, details: err.detail ?? null },
    };
  }
}
