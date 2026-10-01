import { createServerFn } from "@tanstack/react-start";
import { requireAuth as requireSupabaseAuth } from "@/server/auth-middleware";
import { pluggyApiKey, pluggyConfigured, pluggyConnectToken, fetchItemTransactions } from "@/lib/pluggy.server";
import { categoryForDescription, fingerprint, type PureRule } from "@/lib/categorize";

export const openFinanceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: pluggyConfigured() }));

export const createConnectToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId?: string | null }) => input ?? {})
  .handler(async ({ data }) => ({ accessToken: await pluggyConnectToken(data.itemId ?? undefined) }));

export const saveBankItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => {
    if (!input?.itemId) throw new Error("itemId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const apiKey = await pluggyApiKey();
    const { item } = await fetchItemTransactions(apiKey, data.itemId, new Date().toISOString().slice(0, 10));
    const institution = item.connector?.name ?? "Banco";

    const { data: existing } = await context.supabase
      .from("bank_connections")
      .select("id")
      .eq("user_id", context.userId)
      .eq("external_item_id", data.itemId)
      .maybeSingle();

    if (existing) {
      await context.supabase
        .from("bank_connections")
        .update({ status: "connected", institution_name: institution, last_error: null })
        .eq("id", existing.id);
      return { id: existing.id };
    }

    const { data: created, error } = await context.supabase
      .from("bank_connections")
      .insert({
        user_id: context.userId,
        provider: "pluggy",
        external_item_id: data.itemId,
        institution_name: institution,
        status: "connected",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const syncBankConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { connectionId: string; days?: number }) => {
    if (!input?.connectionId) throw new Error("connectionId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conn, error: ce } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("id", data.connectionId)
      .eq("user_id", userId)
      .single();
    if (ce || !conn) throw new Error("Conexão não encontrada");
    if (!conn.external_item_id) throw new Error("Conexão ainda não autorizada no banco");

    try {
      const days = Math.min(Math.max(data.days ?? 90, 1), 365);
      const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      const apiKey = await pluggyApiKey();
      const { transactions } = await fetchItemTransactions(apiKey, conn.external_item_id, from);

      const { data: rulesData } = await supabase
        .from("category_rules")
        .select("pattern, match_type, category_id, applies_to, priority, is_active")
        .eq("user_id", userId);
      const rules = (rulesData ?? []) as PureRule[];

      const { data: batch } = await supabase
        .from("import_batches")
        .insert({ user_id: userId, source: "openfinance", file_name: conn.institution_name })
        .select("id")
        .single();

      let imported = 0;
      let skipped = 0;
      for (const t of transactions) {
        const isIncome = (t.type ?? "").toUpperCase() === "CREDIT" || (!t.type && t.amount > 0);
        const type = isIncome ? "income" : "expense";
        const amount = Math.abs(Number(t.amount) || 0);
        if (!amount) continue;
        const date = String(t.date).slice(0, 10);
        const description = t.description || "Lançamento bancário";

        const { error } = await supabase.from("transactions").insert({
          user_id: userId,
          description,
          amount,
          type,
          status: "paid",
          paid_at: new Date(`${date}T12:00:00`).toISOString(),
          due_date: date,
          is_recurring: false,
          payment_method: t.accountType === "CREDIT" ? "card" : "pix",
          category_id: categoryForDescription(rules, description, type),
          fingerprint: fingerprint(date, amount, description, t.id),
          external_id: t.id,
          source: "openfinance",
          import_batch_id: batch?.id ?? null,
        });
        if (error) skipped++;
        else imported++;
      }

      if (batch?.id) {
        await supabase
          .from("import_batches")
          .update({ imported_count: imported, skipped_count: skipped })
          .eq("id", batch.id);
      }

      await supabase
        .from("bank_connections")
        .update({ status: "connected", last_synced_at: new Date().toISOString(), last_error: null })
        .eq("id", conn.id);

      return { imported, skipped };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await supabase.from("bank_connections").update({ status: "error", last_error: message }).eq("id", conn.id);
      throw new Error(message);
    }
  });
