/** Acesso a dados da área PJ: hooks do react-query e as automações (lead → cliente → projeto → recebimento). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  p: Pick<PjProfile, "company" | "full_name" | "logo" | "doc" | "phone" | "email">,
) => ({
  name: p.company || p.full_name || "",
  logo: p.logo || "",
  doc: p.doc || "",
  phone: p.phone || "",
  email: p.email || "",
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
