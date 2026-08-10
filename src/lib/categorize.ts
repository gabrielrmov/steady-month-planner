/** Helpers puros (sem dependência de browser) compartilhados pelo sync do Open Finance. */

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

export type PureRule = {
  pattern: string;
  match_type: string;
  category_id: string | null;
  applies_to: string;
  priority: number;
  is_active: boolean;
};

export function categoryForDescription(
  rules: PureRule[],
  description: string,
  type: "income" | "expense",
): string | null {
  const d = normalizeDesc(description);
  const hit = [...rules]
    .sort((a, b) => b.priority - a.priority)
    .find((r) => {
      if (!r.is_active) return false;
      if (r.applies_to !== "both" && r.applies_to !== type) return false;
      const p = normalizeDesc(r.pattern);
      if (!p) return false;
      if (r.match_type === "starts_with") return d.startsWith(p);
      if (r.match_type === "equals") return d === p;
      return d.includes(p);
    });
  return hit?.category_id ?? null;
}
