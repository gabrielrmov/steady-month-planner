/** Acesso a dados da área PJ: hooks do react-query e as automações (lead → cliente → projeto → recebimento). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { withBase } from "@/lib/base";
import type { BackupStore, Row } from "./backup";
import { norm, today, toNumber } from "./format";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_INCOME_CATEGORY,
  EMPTY_PROFILE,
  checklistFor,
  type PjClient,
  type PjProfile,
  type PjProject,
  type PjTransaction,
  type ProjectStage,
} from "./types";

const PROTECTED = new Set(["id", "user_id", "created_at", "updated_at"]);

export const pjKey = (table: string) => ["pj", table] as const;

export function useRows<T>(
  table: string,
  order: { col: string; ascending?: boolean } = { col: "created_at" },
) {
  return useQuery({
    queryKey: [...pjKey(table), order.col, order.ascending ?? true],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order(order.col, { ascending: order.ascending });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

/** Grava (insert ou update) e devolve a linha gravada. */
export async function saveRow<T extends { id?: string }>(
  table: string,
  row: Partial<T>,
): Promise<T> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!PROTECTED.has(k) && v !== undefined) patch[k] = v;
  const id = row.id;
  const q = id
    ? supabase.from(table).update(patch).eq("id", id).select().single()
    : supabase.from(table).insert(patch).select().single();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as T;
}

export async function deleteRow(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function useInvalidatePj() {
  const qc = useQueryClient();
  return (...tables: string[]) =>
    Promise.all(
      (tables.length ? tables : [""]).map((t) =>
        qc.invalidateQueries({ queryKey: t ? pjKey(t) : ["pj"] }),
      ),
    );
}

/** Mutação de gravação com aviso de erro e atualização da lista. */
export function useSaveRow<T extends { id?: string }>(table: string, okMessage?: string) {
  const invalidate = useInvalidatePj();
  return useMutation({
    mutationFn: (row: Partial<T>) => saveRow<T>(table, row),
    onSuccess: () => {
      invalidate(table);
      if (okMessage) toast.success(okMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRow(table: string, okMessage = "Removido") {
  const invalidate = useInvalidatePj();
  return useMutation({
    mutationFn: (id: string) => deleteRow(table, id),
    onSuccess: () => {
      invalidate(table);
      toast.success(okMessage);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* --------------------------------- perfil --------------------------------- */

export function usePjProfile() {
  return useQuery({
    queryKey: pjKey("pj_profile"),
    queryFn: async (): Promise<PjProfile> => {
      const { data, error } = await supabase.from("pj_profile").select("*").maybeSingle();
      if (error) throw error;
      return { ...EMPTY_PROFILE, ...(data ?? {}) } as PjProfile;
    },
  });
}

export async function saveProfile(p: PjProfile): Promise<PjProfile> {
  return saveRow<PjProfile>("pj_profile", p);
}

export function useSaveProfile() {
  const invalidate = useInvalidatePj();
  return useMutation({
    mutationFn: saveProfile,
    onSuccess: () => {
      invalidate("pj_profile");
      toast.success("Perfil salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Marca (nome, logo, contato) que vai no topo das propostas e na página do cliente. */
export const brandOf = (
  p: Pick<
    PjProfile,
    "company" | "full_name" | "logo" | "doc" | "phone" | "email" | "address" | "city" | "pix"
  >,
) => ({
  name: p.company || p.full_name || "",
  logo: p.logo || "",
  doc: p.doc || "",
  phone: p.phone || "",
  email: p.email || "",
  address: p.address || "",
  city: p.city || "",
  pix: p.pix || "",
});

/* ------------------------------- automações ------------------------------- */

type ClientInput = {
  name?: string | null;
  company?: string | null;
  doc?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

/** Cliente com o mesmo nome/empresa (sem diferenciar maiúsculas) ou um novo. Nunca duplica. */
export async function ensureClient(c: ClientInput): Promise<PjClient | null> {
  const key = norm(c.company || c.name);
  if (!key) return null;
  const { data, error } = await supabase.from("pj_clients").select("*");
  if (error) throw new Error(error.message);
  const found = ((data ?? []) as PjClient[]).find((x) => norm(x.company || x.name) === key);
  if (found) return found;
  return saveRow<PjClient>("pj_clients", {
    name: c.name || c.company || "",
    company: c.company || "",
    doc: c.doc || "",
    phone: c.phone || "",
    email: c.email || "",
    address: c.address || "",
  });
}

/** Categoria do financeiro PJ pelo nome; cria (scope business) se ainda não existir. */
export async function ensureBusinessCategory(
  name: string = BUSINESS_INCOME_CATEGORY,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("scope", "business");
  if (error) throw new Error(error.message);
  const hit = ((data ?? []) as { id: string; name: string }[]).find(
    (c) => norm(c.name) === norm(name),
  );
  if (hit) return hit.id;
  const def = BUSINESS_CATEGORIES.find((c) => norm(c.name) === norm(name));
  const created = await supabase
    .from("categories")
    .insert({
      name,
      color: def?.color ?? "#6B7280",
      kind: def?.kind ?? "expense",
      scope: "business",
    })
    .select()
    .single();
  if (created.error) throw new Error(created.error.message);
  return (created.data as { id: string }).id;
}

export type NewDeal = {
  title: string;
  clientName?: string | null;
  company?: string | null;
  clientExtra?: ClientInput;
  value: number;
  type?: string;
  shootDate?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  proposalId?: string | null;
};

/** Cria cliente (sem duplicar) + projeto com checklist + valor "a receber" ligado ao projeto. */
export async function createProjectFromDeal(d: NewDeal): Promise<PjProject> {
  const client = await ensureClient({ name: d.clientName, company: d.company, ...d.clientExtra });
  const type = d.type || "Outro";
  const project = await saveRow<PjProject>("pj_projects", {
    title: d.title,
    client_id: client?.id ?? null,
    client_name: client ? client.company || client.name : d.company || d.clientName || "",
    project_type: type,
    stage: "Pré-produção",
    value: toNumber(d.value),
    shoot_date: d.shootDate || null,
    due_date: d.dueDate || null,
    notes: d.notes || "",
    checklist: checklistFor(type),
    videos: [],
    proposal_id: d.proposalId ?? null,
  });
  if (toNumber(d.value) > 0) await createReceivable(project);
  return project;
}

export async function createReceivable(
  project: Pick<PjProject, "id" | "title" | "client_name" | "value" | "due_date">,
) {
  const category_id = await ensureBusinessCategory(BUSINESS_INCOME_CATEGORY);
  const { error } = await supabase.from("transactions").insert({
    description: `${project.title} — ${project.client_name || ""}`.trim(),
    amount: toNumber(project.value),
    type: "income",
    status: "pending",
    due_date: project.due_date || today(),
    scope: "business",
    project_id: project.id,
    category_id,
    payment_method: "pix",
  });
  if (error) throw new Error(error.message);
}

/** Move o projeto de etapa. Em "Pago", dá baixa nos recebimentos pendentes ligados a ele. */
export async function moveProject(p: PjProject, stage: ProjectStage): Promise<{ settled: number }> {
  const { error } = await supabase.from("pj_projects").update({ stage }).eq("id", p.id);
  if (error) throw new Error(error.message);
  if (stage !== "Pago") return { settled: 0 };
  const { data, error: e2 } = await supabase
    .from("transactions")
    .update({ status: "paid", paid_at: new Date().toISOString(), due_date: today() })
    .eq("project_id", p.id)
    .eq("type", "income")
    .eq("status", "pending")
    .select("id");
  if (e2) throw new Error(e2.message);
  return { settled: (data ?? []).length };
}

/* ------------------------------ financeiro PJ ------------------------------ */

export function useBusinessTransactions() {
  return useQuery({
    queryKey: [...pjKey("transactions"), "business"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name, color)")
        .eq("scope", "business")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PjTransaction[];
    },
  });
}

/** Cria as categorias padrão do PJ que ainda não existem (por nome). */
export async function seedBusinessCategories(existingNames: string[]): Promise<number> {
  const have = new Set(existingNames.map(norm));
  const rows = BUSINESS_CATEGORIES.filter((c) => !have.has(norm(c.name))).map((c) => ({
    name: c.name,
    color: c.color,
    kind: c.kind,
    scope: "business",
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("categories").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export function useBusinessCategories() {
  return useQuery({
    queryKey: [...pjKey("categories"), "business"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, color, kind")
        .eq("scope", "business")
        .order("name");
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        name: string;
        color: string;
        kind: "income" | "expense";
      }[];
    },
  });
}

/** Lançamentos pessoais de um mês (para a visão consolidada do financeiro PJ). */
export function usePersonalMonth(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: [...pjKey("transactions"), "personal", from, to],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, categories(name, color)")
        .eq("scope", "personal")
        .gte("due_date", from)
        .lte("due_date", to)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PjTransaction[];
    },
  });
}

/** Pró-labore pago pela empresa vira entrada no financeiro pessoal (uma vez só por lançamento). */
export async function prolaboreToPersonal(
  t: Pick<PjTransaction, "id" | "amount" | "due_date" | "status">,
  company: string,
) {
  const marker = `prolabore:${t.id}`;
  const dup = await supabase
    .from("transactions")
    .select("id")
    .eq("scope", "personal")
    .eq("notes", marker)
    .limit(1);
  if (dup.error) throw new Error(dup.error.message);
  if ((dup.data ?? []).length) return false;
  const cat = await supabase
    .from("categories")
    .select("id")
    .eq("scope", "personal")
    .eq("name", "Salário")
    .limit(1);
  const { error } = await supabase.from("transactions").insert({
    description: `Pró-labore${company ? ` — ${company}` : ""}`,
    amount: t.amount,
    type: "income",
    status: t.status,
    paid_at: t.status === "paid" ? new Date().toISOString() : null,
    due_date: t.due_date,
    scope: "personal",
    category_id: (cat.data ?? [])[0]?.id ?? null,
    notes: marker,
    payment_method: "pix",
  });
  if (error) throw new Error(error.message);
  return true;
}

/* --------------------------------- backup --------------------------------- */

/** Acesso do backup ao banco do usuário (categorias e transações: só as do PJ). */
export const backupStore: BackupStore = {
  async list(table) {
    let q = supabase.from(table).select("*");
    if (table === "categories" || table === "transactions") q = q.eq("scope", "business");
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  },
  async insert(table, row) {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as Row;
  },
  async update(table, id, row) {
    const { error } = await supabase.from(table).update(row).eq("id", id);
    if (error) throw new Error(error.message);
  },
};

/* ------------------------------ links do cliente ------------------------------ */

export type ShareRow = {
  id: string;
  token: string;
  kind: "proposal" | "delivery";
  ref_id: string | null;
  title: string;
};

export type ShareEvent = {
  id: string;
  share_id: string;
  type: "comment" | "approval" | "reply" | "view";
  name: string | null;
  body: string | null;
  video: number | null;
  time_seconds: number | null;
  decision: "approved" | "changes" | null;
  done: boolean;
  seen: boolean;
  created_at: string;
};

export const shareUrl = (token: string) => `${window.location.origin}${withBase(`/c/${token}`)}`;

/** Cria o link (ou atualiza o conteúdo do que o cliente vê, mantendo o mesmo endereço). */
export async function publishShare(input: {
  kind: "proposal" | "delivery";
  refId: string;
  title: string;
  brand: Record<string, unknown>;
  snapshot: Record<string, unknown>;
}): Promise<ShareRow> {
  const found = await supabase
    .from("shares")
    .select("id")
    .eq("kind", input.kind)
    .eq("ref_id", input.refId)
    .maybeSingle();
  if (found.error) throw new Error(found.error.message);
  const values = { title: input.title, brand: input.brand, snapshot: input.snapshot };
  const q = found.data
    ? supabase
        .from("shares")
        .update(values)
        .eq("id", (found.data as { id: string }).id)
        .select("id, token, kind, ref_id, title")
        .single()
    : supabase
        .from("shares")
        .insert({ ...values, kind: input.kind, ref_id: input.refId })
        .select("id, token, kind, ref_id, title")
        .single();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as ShareRow;
}

export function useShareEvents(shareId: string | null) {
  return useQuery({
    queryKey: [...pjKey("share_events"), shareId],
    enabled: !!shareId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("share_events")
        .select("*")
        .eq("share_id", shareId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ShareEvent[];
    },
  });
}

/** Comentários e aprovações novos dos clientes, agrupados por link (para o Início PJ). */
export function useUnseenInteractions() {
  return useQuery({
    queryKey: [...pjKey("share_events"), "unseen"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const ev = await supabase
        .from("share_events")
        .select("share_id")
        .eq("seen", false)
        .in("type", ["comment", "approval"]);
      if (ev.error) throw ev.error;
      const counts = new Map<string, number>();
      for (const e of (ev.data ?? []) as { share_id: string }[])
        counts.set(e.share_id, (counts.get(e.share_id) ?? 0) + 1);
      if (counts.size === 0)
        return [] as { title: string; kind: "proposal" | "delivery"; n: number }[];
      const sh = await supabase
        .from("shares")
        .select("id, title, kind")
        .in("id", [...counts.keys()]);
      if (sh.error) throw sh.error;
      return (
        (sh.data ?? []) as { id: string; title: string; kind: "proposal" | "delivery" }[]
      ).map((s) => ({
        title: s.title || "Link",
        kind: s.kind,
        n: counts.get(s.id) ?? 0,
      }));
    },
  });
}
