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

export function getDb(): Queryable {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida");
  return {
    query: async (text, params) => {
      const sql = neon(url, { fullResults: true, types: { getTypeParser } });
      const r = await sql.query(text, params as unknown[]);
      return { rows: r.rows as Record<string, unknown>[], rowCount: r.rowCount };
    },
  };
}
