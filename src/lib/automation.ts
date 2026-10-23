import { addMonths, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- fingerprint / dedupe ---------------- */

export const normalizeDesc = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function fingerprint(date: string, amount: number, description: string, externalId?: string | null) {
  if (externalId) return `ext:${externalId}`;
  return `f:${date}:${amount.toFixed(2)}:${normalizeDesc(description).slice(0, 40)}`;
}

/* ---------------- categorization rules ---------------- */

export type CategoryRule = {
  id: string;
  pattern: string;
  match_type: string;
  category_id: string | null;
  applies_to: string;
  priority: number;
  is_active: boolean;
};

export function matchRule(rule: CategoryRule, description: string, type: "income" | "expense") {
  if (!rule.is_active) return false;
  if (rule.applies_to !== "both" && rule.applies_to !== type) return false;
  const d = normalizeDesc(description);
  const p = normalizeDesc(rule.pattern);
  if (!p) return false;
  if (rule.match_type === "starts_with") return d.startsWith(p);
  if (rule.match_type === "equals") return d === p;
  return d.includes(p);
}

export function categoryForDescription(
  rules: CategoryRule[],
  description: string,
  type: "income" | "expense",
): string | null {
  const hit = [...rules]
    .sort((a, b) => b.priority - a.priority)
    .find((r) => matchRule(r, description, type));
  return hit?.category_id ?? null;
}

/* ---------------- card invoice month ---------------- */

/** Mês da fatura em que uma compra cai, dado o dia de fechamento do cartão. */
export function invoiceMonthFor(purchaseDate: Date, closingDay?: number | null) {
  if (!closingDay) return startOfMonth(purchaseDate);
  return purchaseDate.getDate() > closingDay
    ? startOfMonth(addMonths(purchaseDate, 1))
    : startOfMonth(purchaseDate);
}

/* ---------------- recurring auto-generation ---------------- */

/** Cria no mês alvo as contas recorrentes que existiam no mês anterior e ainda não foram geradas. */
export async function ensureRecurringForMonth(month: Date) {
  const prev = subMonths(startOfMonth(month), 1);
  const [{ data: prevTxs, error: e1 }, { data: curTxs, error: e2 }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("is_recurring", true)
      .gte("due_date", format(prev, "yyyy-MM-dd"))
      .lte("due_date", format(endOfMonth(prev), "yyyy-MM-dd")),
    supabase
      .from("transactions")
      .select("purchase_group_id")
      .eq("is_recurring", true)
      .gte("due_date", format(startOfMonth(month), "yyyy-MM-dd"))
      .lte("due_date", format(endOfMonth(month), "yyyy-MM-dd")),
  ]);
  if (e1 || e2) return 0;

  const existing = new Set((curTxs ?? []).map((t: any) => t.purchase_group_id).filter(Boolean));
  const toCreate = (prevTxs ?? []).filter(
    (t: any) => t.purchase_group_id && !existing.has(t.purchase_group_id) && !t.installment_total,
  );
  if (!toCreate.length) return 0;

  const rows = toCreate.map((t: any) => {
    const day = t.recurrence_day ?? new Date(`${t.due_date}T12:00:00`).getDate();
    const target = startOfMonth(month);
    const lastDay = endOfMonth(target).getDate();
    const due = new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay), 12);
    return {
      user_id: t.user_id,
      description: t.description,
      amount: t.amount,
      type: t.type,
      status: "pending",
      due_date: format(due, "yyyy-MM-dd"),
      is_recurring: true,
      payment_method: t.payment_method,
      card_id: t.card_id,
      category_id: t.category_id,
      purchase_group_id: t.purchase_group_id,
      recurrence_day: day,
      notes: t.notes,
      source: "auto",
    };
  });

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return 0;
  return rows.length;
}

/* ---------------- statement parsing (OFX / CSV) ---------------- */

export type ParsedTx = {
  date: string; // yyyy-MM-dd
  description: string;
  amount: number; // positivo
  type: "income" | "expense";
  externalId?: string | null;
};

function ofxDate(raw: string) {
  const s = raw.trim().slice(0, 8);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export function parseOFX(text: string): ParsedTx[] {
  const out: ParsedTx[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  for (const b of blocks) {
    const get = (tag: string) => {
      const m = b.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };
    const dt = get("DTPOSTED");
    const amt = Number(get("TRNAMT").replace(",", "."));
    const desc = get("MEMO") || get("NAME") || "Lançamento";
    if (!dt || !Number.isFinite(amt) || amt === 0) continue;
    out.push({
      date: ofxDate(dt),
      description: desc,
      amount: Math.abs(amt),
      type: amt > 0 ? "income" : "expense",
      externalId: get("FITID") || null,
    });
  }
  return out;
}

function splitCsvLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"|"$/g, ""));
}

function parseDateCell(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function parseAmountCell(v: string): number | null {
  let s = v.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseCSV(text: string): ParsedTx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = lines.map((l) => splitCsvLine(l, sep));
  const first = rows[0].map((c) => normalizeDesc(c));
  const hasHeader = !parseDateCell(rows[0][0] ?? "");
  const body = hasHeader ? rows.slice(1) : rows;

  const idxOf = (names: string[]) => first.findIndex((h) => names.some((n) => h.includes(n)));
  let dateIdx = hasHeader ? idxOf(["data", "date"]) : 0;
  let descIdx = hasHeader ? idxOf(["descri", "hist", "memo", "estabelec", "lancamento", "title"]) : 1;
  let amtIdx = hasHeader ? idxOf(["valor", "amount", "montante"]) : 2;

  const out: ParsedTx[] = [];
  for (const r of body) {
    const d = parseDateCell(r[dateIdx >= 0 ? dateIdx : 0] ?? "");
    const a = parseAmountCell(r[amtIdx >= 0 ? amtIdx : r.length - 1] ?? "");
    const desc = (r[descIdx >= 0 ? descIdx : 1] ?? "Lançamento").trim() || "Lançamento";
    if (!d || a === null || a === 0) continue;
    out.push({ date: d, description: desc, amount: Math.abs(a), type: a > 0 ? "income" : "expense" });
  }
  return out;
}

export function parseStatement(fileName: string, text: string): ParsedTx[] {
  return /\.ofx$/i.test(fileName) || /<OFX>/i.test(text) ? parseOFX(text) : parseCSV(text);
}
