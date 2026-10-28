import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Análise de prospecção por IA. Exige login, limita por usuário e nunca registra os prints.
export const Route = createFileRoute("/api/prospect/advice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getSessionUser, sameOriginXhr } = await import("@/server/session");
        if (!sameOriginXhr(request)) return json({ error: "Forbidden" }, 403);
        const user = await getSessionUser(request);
        if (!user) return json({ error: "Sessão expirada. Entre de novo." }, 401);

        const key = process.env.ANTHROPIC_API_KEY;
        if (!key)
          return json({ error: "A análise por IA ainda não foi ativada neste servidor." }, 503);

        const raw = await request.text();
        if (raw.length > 8_000_000) return json({ error: "Prints grandes demais" }, 413);
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }
        const { AdviceError, getAdvice, parseAdviceInput } = await import("@/server/advice");
        const parsed = parseAdviceInput(body);
        if (!parsed.ok) return json({ error: parsed.error }, 400);

        const { getDb } = await import("@/server/db");
        const { rateLimit } = await import("@/server/share");
        const db = getDb();
        if (!(await rateLimit(db, `ai:${user.id}`, 20, 3600))) {
          return json({ error: "Limite de 20 análises por hora. Tente de novo mais tarde." }, 429);
        }
        const me = await db.query("SELECT full_name FROM public.pj_profile WHERE user_id = $1", [
          user.id,
        ]);

        try {
          const advice = await getAdvice(key, parsed.value, {
            name: (me.rows[0]?.full_name as string | null) ?? null,
          });
          return json(advice);
        } catch (e) {
          if (e instanceof AdviceError) return json({ error: e.message }, e.status);
          console.error(
            "[advice] falha na análise",
            e instanceof Error ? e.constructor.name : "erro",
          );
          return json({ error: "A análise falhou. Tente de novo em instantes." }, 502);
        }
      },
    },
  },
});
