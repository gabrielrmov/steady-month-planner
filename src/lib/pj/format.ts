/** Funções puras de formatação e datas da área PJ (sem dependências do app, testáveis no Node). */

export const brl = (v: number | null | undefined) =>
  (Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/** "1.234,56", "1234.56" ou número → número (0 se inválido). */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = parseFloat(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : 0;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data local de hoje como AAAA-MM-DD (não usa UTC, para não virar o dia às 21h no Brasil). */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const monthKey = (iso: string) => iso.slice(0, 7);

/** Soma `delta` meses a "AAAA-MM". */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Último dia do mês "AAAA-MM" como AAAA-MM-DD. */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(new Date(y, m, 0).getDate())}`;
}

export const dateBR = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";

/** Dias de `iso` até hoje (negativo = já passou). null quando não há data. */
export function daysUntil(iso: string | null | undefined, now: string = today()): number | null {
  if (!iso) return null;
  const a = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${now}T00:00:00`).getTime();
  return Math.round((a - b) / 864e5);
}

/** wa.me com DDI 55 quando o número vier só com DDD. */
export function waLink(phone: string | null | undefined, text?: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const full = /^\d{10,11}$/.test(digits) ? `55${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const hasPhone = (s: string | null | undefined) => /\d{8}/.test(String(s ?? ""));

export const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function mmss(s: number | null | undefined): string {
  const n = Math.max(0, Math.floor(Number(s) || 0));
  return `${Math.floor(n / 60)}:${pad(n % 60)}`;
}

/** "1:30" → 90; "45" → 45; vazio ou inválido → null. Aceita também "1:02:03". */
export function parseTime(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => Number(p));
  if (parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Texto seguro para CSV: aspas duplicadas e proteção contra fórmulas de planilha. */
export function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
