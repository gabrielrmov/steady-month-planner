import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getSessionUser } = await import("@/server/session");
        const { getDb } = await import("@/server/db");
        const { getUserById } = await import("@/server/users");
        const s = await getSessionUser(request);
        if (!s) return json({ user: null });
        const user = await getUserById(getDb(), s.id);
        return json({ user });
      },
    },
  },
});
