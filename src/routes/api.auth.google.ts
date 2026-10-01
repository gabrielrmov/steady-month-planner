import { createFileRoute } from "@tanstack/react-router";

// Início do login: guarda state + PKCE num cookie assinado e manda para o Google.
export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { appOrigin, authUrl, newPkce } = await import("@/server/google");
        const { OAUTH_COOKIE, cookie, isSecure, signOAuthState } = await import("@/server/session");
        const pkce = newPkce();
        const redirectUri = `${appOrigin(request)}/api/auth/callback`;
        const headers = new Headers({ Location: authUrl(redirectUri, pkce.state, pkce.challenge) });
        headers.append(
          "Set-Cookie",
          cookie(OAUTH_COOKIE, await signOAuthState({
              state: pkce.state,
              verifier: pkce.verifier,
              plan: new URL(request.url).searchParams.get("plan") === "pro" ? "pro" : undefined,
            }), {
            maxAge: 600,
            secure: isSecure(request),
          }),
        );
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
