/**
 * Cliente de dados do FINLIST. Mantém a forma do antigo `supabase-js` (`supabase.from(...)`,
 * `supabase.auth.*`) para que as telas não mudem, mas fala com o servidor próprio (/api/*),
 * que usa PostgreSQL. Autenticação por cookie de sessão (HttpOnly) — o navegador não guarda token.
 */
import { withBase } from "@/lib/base";
import { QueryBuilder, type DbError, type QueryRequestJson, type Result } from "./builder";

/* eslint-disable @typescript-eslint/no-explicit-any */

const API = (path: string) => withBase(path);

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(API(path), {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-finlist": "1" },
    body: JSON.stringify(body),
  });
}

async function exec(req: QueryRequestJson): Promise<Result> {
  try {
    const res = await post("/api/db", req);
    if (res.status === 401) invalidateSession();
    const body = await res.json().catch(() => null);
    if (!body) return { data: null, count: null, error: { message: `Erro ${res.status}` } };
    return { data: body.data ?? null, count: body.count ?? null, error: body.error ?? null };
  } catch (e) {
    return { data: null, count: null, error: { message: e instanceof Error ? e.message : "Falha de rede" } };
  }
}

/* ------------------------------ autenticação ------------------------------ */

type SessionUser = {
  id: string;
  email: string;
  created_at: string;
  user_metadata: { full_name: string | null; avatar_url: string | null };
};
type Session = { user: SessionUser; access_token: string };
type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "USER_UPDATED";

let cached: { at: number; session: Session | null } | null = null;
let inflight: Promise<Session | null> | null = null;
const listeners = new Set<(event: AuthEvent, session: Session | null) => void>();
const TTL_MS = 30_000;

function invalidateSession() {
  const had = cached?.session != null;
  cached = null;
  if (had) listeners.forEach((l) => l("SIGNED_OUT", null));
}

async function loadSession(): Promise<Session | null> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.session;
  if (!inflight) {
    inflight = fetch(API("/api/auth/session"), { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then(({ user }) => {
        const session: Session | null = user
          ? {
              access_token: "cookie",
              user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                user_metadata: { full_name: user.full_name, avatar_url: user.avatar_url },
              },
            }
          : null;
        cached = { at: Date.now(), session };
        return session;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const auth = {
  async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
    return { data: { session: await loadSession() }, error: null };
  },
  async getUser() {
    const s = await loadSession();
    return { data: { user: s?.user ?? null }, error: null };
  },
  async signInWithOAuth(opts: { provider: "google"; options?: { plan?: string } }): Promise<{ error: DbError | null }> {
    const plan = opts.options?.plan ? `?plan=${encodeURIComponent(opts.options.plan)}` : "";
    window.location.assign(API(`/api/auth/google${plan}`));
    return { error: null };
  },
  async signOut(): Promise<{ error: DbError | null }> {
    await post("/api/auth/signout", {}).catch(() => null);
    cached = { at: Date.now(), session: null };
    listeners.forEach((l) => l("SIGNED_OUT", null));
    return { error: null };
  },
  onAuthStateChange(cb: (event: AuthEvent, session: Session | null) => void) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
};

export const supabase = {
  from: (table: string) => new QueryBuilder(table, exec),
  auth,
};
