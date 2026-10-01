import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "finlist_session";
export const OAUTH_COOKIE = "finlist_oauth";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; email: string };

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET ausente ou curta (mínimo 32 caracteres)");
  return new TextEncoder().encode(secret);
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name: string, value: string, opts: { maxAge: number; secure: boolean }): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts.maxAge}`,
    opts.secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export const isSecure = (request: Request) =>
  new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export const sessionCookie = (token: string, secure: boolean) =>
  cookie(SESSION_COOKIE, token, { maxAge: SESSION_DAYS * 86400, secure });

export const clearCookie = (name: string, secure: boolean) => cookie(name, "", { maxAge: 0, secure });

/** Usuário da requisição (cookie assinado) ou null. */
export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { id: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

/** Estado curto do login Google (state + PKCE verifier), guardado em cookie assinado. */
export async function signOAuthState(data: { state: string; verifier: string; plan?: string }): Promise<string> {
  return new SignJWT(data).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(key());
}

export async function readOAuthState(request: Request): Promise<{ state: string; verifier: string; plan?: string } | null> {
  const token = parseCookies(request.headers.get("cookie"))[OAUTH_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return {
      state: String(payload.state),
      verifier: String(payload.verifier),
      plan: payload.plan ? String(payload.plan) : undefined,
    };
  } catch {
    return null;
  }
}

/** Defesa contra CSRF nas rotas que alteram dados: exige cabeçalho próprio e mesma origem. */
export function sameOriginXhr(request: Request): boolean {
  if (request.headers.get("x-finlist") !== "1") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
