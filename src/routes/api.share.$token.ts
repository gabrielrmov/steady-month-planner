import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });

// API pública (sem login) do link do cliente. O token no endereço é o segredo; o resto é validado em
// src/server/share.ts: tipos permitidos, tamanhos, limite por IP e nenhum dado do dono na resposta.
export const Route = createFileRoute("/api/share/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getDb } = await import("@/server/db");
        const { getPublicShare, ipFingerprint, rateLimit } = await import("@/server/share");
        const db = getDb();
        const ip = await ipFingerprint(request.headers, process.env.SESSION_SECRET ?? "");
        if (!(await rateLimit(db, `get:${ip}`, 240, 600)))
          return json({ error: "Muitas requisições" }, 429);
        const found = await getPublicShare(db, params.token);
        if (!found) return json({ error: "Link inválido ou expirado" }, 404);
        return json(found);
      },
      POST: async ({ request, params }) => {
        const { getDb } = await import("@/server/db");
        const {
          MAX_BODY_BYTES,
          TOKEN_RE,
          addPublicEvent,
          ipFingerprint,
          parseEventInput,
          rateLimit,
        } = await import("@/server/share");
        if (!TOKEN_RE.test(params.token)) return json({ error: "Link inválido ou expirado" }, 404);
        if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
          return json({ error: "Formato inválido" }, 415);
        }
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) return json({ error: "Mensagem grande demais" }, 413);
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }
        const parsed = parseEventInput(body);
        if (!parsed.ok) return json({ error: parsed.error }, 400);

        const db = getDb();
        const ip = await ipFingerprint(request.headers, process.env.SESSION_SECRET ?? "");
        if (parsed.value.type === "view") {
          // uma visualização por visitante e link a cada hora; o excedente é ignorado em silêncio
          if (!(await rateLimit(db, `view:${ip}:${params.token.slice(0, 16)}`, 1, 3600)))
            return json({ ok: true });
        } else if (!(await rateLimit(db, `post:${ip}`, 20, 600))) {
          return json({ error: "Muitas mensagens. Tente de novo em alguns minutos." }, 429);
        }
        const result = await addPublicEvent(db, params.token, parsed.value);
        if (result === "not_found") return json({ error: "Link inválido ou expirado" }, 404);
        if (result === "full")
          return json({ error: "Este link atingiu o limite de mensagens" }, 429);
        return json({ ok: true }, 201);
      },
    },
  },
});
