import { neon, types } from "@neondatabase/serverless";
import type { Queryable } from "./query";

// Driver HTTP da Neon: sem conexão aberta, então funciona igual no Cloudflare Workers e no Node.
// O PostgREST devolvia números como número e datas como "AAAA-MM-DD"; o app depende disso.
const getTypeParser = ((oid: number, format?: unknown) => {
  if (oid === 1082) return (v: string) => v; // date
  if (oid === 1700) return (v: string) => parseFloat(v); // numeric
  if (oid === 20) return (v: string) => Number(v); // int8
  return types.getTypeParser(oid, format as never);
}) as typeof types.getTypeParser;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Garante o formato que o PostgREST entregava, mesmo que o driver devolva texto ou Date:
 * numeric/int8 como número e date como "AAAA-MM-DD".
 */
function normalize(rows: Record<string, unknown>[], fields: { name: string; dataTypeID: number }[]) {
  const num = fields.filter((f) => f.dataTypeID === 1700 || f.dataTypeID === 20 || f.dataTypeID === 700 || f.dataTypeID === 701);
  const date = fields.filter((f) => f.dataTypeID === 1082);
  if (num.length === 0 && date.length === 0) return rows;
  for (const row of rows) {
    for (const f of num) {
      const v = row[f.name];
      if (typeof v === "string") row[f.name] = Number(v);
    }
    for (const f of date) {
      const v = row[f.name];
      if (v instanceof Date) row[f.name] = ymd(v);
      else if (typeof v === "string" && v.length > 10) row[f.name] = v.slice(0, 10);
    }
  }
  return rows;
}

export function getDb(): Queryable {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida");
  return {
    query: async (text, params) => {
      const sql = neon(url, { fullResults: true, types: { getTypeParser } });
      const r = await sql.query(text, params as unknown[]);
      return { rows: normalize(r.rows as Record<string, unknown>[], r.fields), rowCount: r.rowCount };
    },
  };
}
