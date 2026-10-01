import { createFileRoute } from "@tanstack/react-router";

// Volta do Google: confere state, troca o código, acha/cria o usuário e abre a sessão.
export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { appOrigin, exchangeCode } = await import("@/server/google");
        const { OAUTH_COOKIE, clearCookie, isSecure, readOAuthState, sessionCookie, signSession } =
          await import("@/server/session");
        const { getDb } = await import("@/server/db");
        const { upsertGoogleUser } = await import("@/server/users");

        const origin = appOrigin(request);
        const secure = isSecure(request);
        const fail = (reason: string) => {
          const headers = new Headers({ Location: `${origin}/auth?error=${reason}` });
          headers.append("Set-Cookie", clearCookie(OAUTH_COOKIE, secure));
          return new Response(null, { status: 302, headers });
        };

        const url = new URL(request.url);
        if (url.searchParams.get("error")) return fail("denied");
        const code = url.searchParams.get("code");
        const saved = await readOAuthState(request);
        if (!code || !saved || saved.state !== url.searchParams.get("state")) return fail("state");

        try {
          const profile = await exchangeCode(code, `${origin}/api/auth/callback`, saved.verifier);
          const user = await upsertGoogleUser(getDb(), profile);
          const headers = new Headers({ Location: `${origin}/auth${saved.plan ? `?plan=${saved.plan}` : ""}` });
          headers.append("Set-Cookie", sessionCookie(await signSession({ id: user.id, email: user.email }), secure));
          headers.append("Set-Cookie", clearCookie(OAUTH_COOKIE, secure));
          return new Response(null, { status: 302, headers });
        } catch (e) {
          console.error("[auth] falha no callback do Google", e);
          return fail("failed");
        }
      },
    },
  },
});
