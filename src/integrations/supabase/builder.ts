/**
 * Construtor de consultas com a forma do antigo supabase-js (`.from(t).select().eq()...`).
 * Só monta a descrição JSON da consulta; quem executa é o `exec` recebido
 * (o navegador manda para /api/db; o servidor roda direto no PostgreSQL).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DbError = { message: string; code?: string; details?: string | null };
export type Result = { data: any; error: DbError | null; count: number | null };
export type Filter = { col: string; op: string; val?: unknown; not?: boolean };
export type QueryRequestJson = Record<string, unknown>;

export class QueryBuilder implements PromiseLike<Result> {
  private action: "select" | "insert" | "update" | "delete" = "select";
  private columns: string | undefined;
  private returning = false;
  private values: unknown;
  private filters: Filter[] = [];
  private orders: { col: string; ascending?: boolean }[] = [];
  private limitN: number | undefined;
  private countMode: "exact" | null = null;
  private head = false;
  private singleMode: "single" | "maybe" | null = null;

  constructor(
    private table: string,
    private exec: (req: QueryRequestJson) => Promise<Result>,
  ) {}

  select(columns = "*", opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.action === "select") this.columns = columns;
    else {
      this.returning = true;
      this.columns = columns;
    }
    if (opts?.count) this.countMode = "exact";
    if (opts?.head) this.head = true;
    return this;
  }
  insert(values: unknown) {
    this.action = "insert";
    this.values = values;
    return this;
  }
  update(values: unknown) {
    this.action = "update";
    this.values = values;
    return this;
  }
  delete() {
    this.action = "delete";
    return this;
  }

  private f(col: string, op: string, val?: unknown, not = false) {
    this.filters.push({ col, op, val, not });
    return this;
  }
  eq(col: string, val: unknown) { return this.f(col, "eq", val); }
  neq(col: string, val: unknown) { return this.f(col, "neq", val); }
  gt(col: string, val: unknown) { return this.f(col, "gt", val); }
  gte(col: string, val: unknown) { return this.f(col, "gte", val); }
  lt(col: string, val: unknown) { return this.f(col, "lt", val); }
  lte(col: string, val: unknown) { return this.f(col, "lte", val); }
  is(col: string, val: unknown) { return this.f(col, "is", val); }
  in(col: string, val: unknown[]) { return this.f(col, "in", val); }
  like(col: string, val: string) { return this.f(col, "like", val); }
  ilike(col: string, val: string) { return this.f(col, "ilike", val); }
  not(col: string, op: string, val: unknown) { return this.f(col, op, val, true); }
  filter(col: string, op: string, val: unknown) { return this.f(col, op, val); }
  match(obj: Record<string, unknown>) {
    for (const [k, v] of Object.entries(obj)) this.f(k, "eq", v);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  private run(): Promise<Result> {
    return this.exec({
      table: this.table,
      action: this.action,
      columns: this.columns,
      returning: this.returning,
      values: this.values,
      filters: this.filters,
      order: this.orders,
      limit: this.limitN,
      count: this.countMode,
      head: this.head,
      single: this.singleMode,
    });
  }

  then<R1 = Result, R2 = never>(
    onfulfilled?: ((value: Result) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

