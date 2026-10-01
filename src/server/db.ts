import pg from "pg";
import type { Queryable } from "./query";

// O PostgREST devolvia números como número e datas como "AAAA-MM-DD"; o app depende disso.
pg.types.setTypeParser(1082, (v) => v); // date
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // numeric
pg.types.setTypeParser(20, (v) => Number(v)); // int8

let pool: pg.Pool | undefined;

export function getDb(): pg.Pool & Queryable {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida");
    pool = new pg.Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true },
    });
    pool.on("error", (e) => console.error("[pg] erro no pool", e));
  }
  return pool as pg.Pool & Queryable;
}
