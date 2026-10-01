import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Ponte de dados do app: o navegador manda a descrição da consulta; o servidor valida e
// executa sempre restrito ao usuário da sessão (substitui PostgREST + RLS do Supabase).
export const Route = createFileRoute("/api/db")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getSessionUser, sameOriginXhr } = await import("@/server/session");
        if (!sameOriginXhr(request)) return json({ error: { message: "Forbidden" } }, 403);
        const user = await getSessionUser(request);
        if (!user) return json({ error: { message: "JWT expired", code: "PGRST301" } }, 401);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: { message: "JSON inválido" } }, 400);
        }
        const { getDb } = await import("@/server/db");
        const { runQuery } = await import("@/server/query");
        const result = await runQuery(getDb(), user.id, body as import("@/server/query").QueryRequest);
        return json(result);
      },
    },
  },
});
