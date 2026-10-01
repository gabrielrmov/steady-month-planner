import { createMiddleware } from "@tanstack/react-start";
import { QueryBuilder } from "@/integrations/supabase/builder";
import type { QueryRequest } from "./query";

/**
 * Exige usuário logado (cookie de sessão) nas server functions e entrega
 * `context.supabase` (mesma API das telas, mas rodando direto no banco) e `context.userId`.
 * Os módulos de servidor (pg, jose) entram por import dinâmico para nunca irem ao bundle do navegador.
 */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { getSessionUser } = await import("./session");
  const { getDb } = await import("./db");
  const { runQuery } = await import("./query");

  const request = getRequest();
  const user = request ? await getSessionUser(request) : null;
  if (!user) throw new Error("Unauthorized: sessão ausente ou expirada");
  const supabase = {
    from: (table: string) =>
      new QueryBuilder(table, async (req) => {
        const r = await runQuery(getDb(), user.id, req as unknown as QueryRequest);
        return { data: r.data, count: r.count, error: r.error };
      }),
  };
  return next({ context: { supabase, userId: user.id } });
});
