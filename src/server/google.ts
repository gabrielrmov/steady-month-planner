import { createRemoteJWKSet, jwtVerify } from "jose";
import { createHash, randomBytes } from "node:crypto";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const b64url = (b: Buffer) => b.toString("base64url");

export function appOrigin(request: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

function creds() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não definidos");
  return { id, secret };
}

export function newPkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { state: b64url(randomBytes(16)), verifier, challenge };
}

export function authUrl(redirectUri: string, state: string, challenge: string): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: creds().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u.toString();
}

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

export async function exchangeCode(code: string, redirectUri: string, verifier: string): Promise<GoogleProfile> {
  const { id, secret } = creds();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Google recusou o código (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Resposta do Google sem id_token");
  const { payload } = await jwtVerify(id_token, JWKS, {
    audience: id,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (!payload.sub || !payload.email) throw new Error("id_token sem sub/email");
  if (payload.email_verified !== true) throw new Error("E-mail do Google não verificado");
  return {
    sub: payload.sub,
    email: String(payload.email),
    name: payload.name ? String(payload.name) : null,
    picture: payload.picture ? String(payload.picture) : null,
  };
}
