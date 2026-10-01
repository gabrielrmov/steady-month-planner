import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/signout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { SESSION_COOKIE, clearCookie, isSecure, sameOriginXhr } = await import("@/server/session");
        if (!sameOriginXhr(request)) return new Response("Forbidden", { status: 403 });
        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            "content-type": "application/json",
            "set-cookie": clearCookie(SESSION_COOKIE, isSecure(request)),
          },
        });
      },
    },
  },
});
