/**
 * Links públicos para o cliente (proposta e entrega), sem login.
 * Regras: o token longo é o segredo; só `comment`, `approval` e `view` são aceitos de fora; tudo é validado
 * e limitado aqui no servidor; o user_id do dono nunca sai; o snapshot é reduzido a campos conhecidos.
 */
import type { Queryable } from "./query";
import { safeHttpUrl, safeLogo } from "../lib/pj/safe.ts";

export const TOKEN_RE = /^[0-9a-f]{64}$/;
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_TEXT = 2000;
export const MAX_NAME = 80;
export const MAX_EVENTS_PER_SHARE = 2000;

export type PublicShare = {
  kind: "proposal" | "delivery";
  title: string;
  brand: { name: string; logo: string; doc: string; phone: string; email: string };
  data: Record<string, unknown>;
};

export type PublicEvent = {
  id: string;
  type: "comment" | "approval" | "reply";
  name: string;
  text: string;
  video: number | null;
  time: number | null;
  decision: "approved" | "changes" | null;
  done: boolean;
  created_at: string;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function sanitizeBrand(raw: unknown): PublicShare["brand"] {
  const b = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: str(b.name, 200),
    logo: safeLogo(b.logo),
    doc: str(b.doc, 40),
    phone: str(b.phone, 40),
    email: str(b.email, 200),
  };
}

export function sanitizeSnapshot(kind: string, raw: unknown): Record<string, unknown> {
  const d = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (kind === "delivery") {
    const videos = (Array.isArray(d.videos) ? d.videos : []).slice(0, 20).map((v) => {
      const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
      return { title: str(o.title, 200), url: safeHttpUrl(o.url), note: str(o.note, 1000) };
    });
    return {
      title: str(d.title, 200),
      message: str(d.message, MAX_TEXT),
      videos: videos.filter((v) => v.url),
    };
  }
  return {
    title: str(d.title, 200),
    client_name: str(d.client_name, 200),
    company: str(d.company, 200),
    proposal_date: /^\d{4}-\d{2}-\d{2}$/.test(str(d.proposal_date, 10))
      ? str(d.proposal_date, 10)
      : "",
    validity: str(d.validity, 100),
    intro: str(d.intro, 5000),
    scope_of_work: str(d.scope_of_work, 5000),
    deliverables: str(d.deliverables, 5000),
    timeline: str(d.timeline, 2000),
    price: num(d.price),
    payment_terms: str(d.payment_terms, 500),
    notes: str(d.notes, 5000),
  };
}

export async function getPublicShare(
  db: Queryable,
  token: string,
): Promise<{ share: PublicShare; events: PublicEvent[] } | null> {
  if (!TOKEN_RE.test(token)) return null;
  const s = await db.query(
    "SELECT id, kind, title, brand, snapshot FROM public.shares WHERE token = $1",
    [token],
  );
  const row = s.rows[0];
  if (!row) return null;
  const kind = row.kind === "delivery" ? "delivery" : "proposal";
  const ev = await db.query(
    `SELECT id, type, name, body, video, time_seconds, decision, done, created_at
       FROM public.share_events
      WHERE share_id = $1 AND type IN ('comment', 'approval', 'reply')
      ORDER BY created_at, id
      LIMIT 500`,
    [row.id],
  );
  return {
    share: {
      kind,
      title: str(row.title, 200),
      brand: sanitizeBrand(row.brand),
      data: sanitizeSnapshot(kind, row.snapshot),
    },
    events: ev.rows.map((e) => ({
      id: String(e.id),
      type: e.type as PublicEvent["type"],
      name: str(e.name, MAX_NAME),
      text: str(e.body, MAX_TEXT),
      video: typeof e.video === "number" ? e.video : null,
      time: typeof e.time_seconds === "number" ? e.time_seconds : null,
      decision: e.decision === "approved" || e.decision === "changes" ? e.decision : null,
      done: e.done === true,
      created_at: new Date(e.created_at as string).toISOString(),
    })),
  };
}

export type EventInput =
  | { type: "view" }
  | { type: "comment"; name: string; text: string; video: number | null; time: number | null }
  | { type: "approval"; name: string; decision: "approved" | "changes"; text: string };

const intIn = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

/** Valida o corpo vindo de fora. Só devolve campos conhecidos; qualquer outra coisa é erro. */
export function parseEventInput(
  body: unknown,
): { ok: true; value: EventInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "Corpo inválido" };
  const b = body as Record<string, unknown>;
  const type = b.type;
  if (type === "view") return { ok: true, value: { type: "view" } };
  if (type !== "comment" && type !== "approval") return { ok: false, error: "Tipo não permitido" };

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { ok: false, error: "Informe seu nome" };
  if (name.length > MAX_NAME) return { ok: false, error: "Nome muito longo" };
  const text =
    b.text === undefined || b.text === null
      ? ""
      : typeof b.text === "string"
        ? b.text.trim()
        : null;
  if (text === null) return { ok: false, error: "Texto inválido" };
  if (text.length > MAX_TEXT) return { ok: false, error: "Texto muito longo" };

  if (type === "comment") {
    if (!text) return { ok: false, error: "Escreva o comentário" };
    if (b.video != null && intIn(b.video, 0, 99) === null)
      return { ok: false, error: "Vídeo inválido" };
    if (b.time != null && intIn(b.time, 0, 86400) === null)
      return { ok: false, error: "Minuto inválido" };
    return {
      ok: true,
      value: { type, name, text, video: intIn(b.video, 0, 99), time: intIn(b.time, 0, 86400) },
    };
  }
  if (b.decision !== "approved" && b.decision !== "changes")
    return { ok: false, error: "Decisão inválida" };
  return { ok: true, value: { type, name, decision: b.decision, text } };
}

/** true = dentro do limite. Janela fixa por chave (impressão digital do IP + ação). */
export async function rateLimit(
  db: Queryable,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const r = await db.query(
    `INSERT INTO public.rate_limits (key, window_start, hits)
     VALUES ($1, to_timestamp(floor(extract(epoch from now()) / $2::double precision) * $2::double precision), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET hits = public.rate_limits.hits + 1
     RETURNING hits`,
    [key, windowSec],
  );
  if (Math.random() < 0.02) {
    await db
      .query("DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day'")
      .catch(() => undefined);
  }
  return Number(r.rows[0].hits) <= limit;
}

/** IP do visitante (Cloudflare ou proxy), guardado só como hash com sal. */
export async function ipFingerprint(headers: Headers, salt: string): Promise<string> {
  const ip =
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(buf)]
    .slice(0, 16)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export type AddResult = "ok" | "not_found" | "full";

export async function addPublicEvent(
  db: Queryable,
  token: string,
  input: EventInput,
): Promise<AddResult> {
  if (!TOKEN_RE.test(token)) return "not_found";
  const s = await db.query("SELECT id FROM public.shares WHERE token = $1", [token]);
  const share = s.rows[0];
  if (!share) return "not_found";
  const c = await db.query(
    "SELECT count(*)::int AS n FROM public.share_events WHERE share_id = $1",
    [share.id],
  );
  if (Number(c.rows[0].n) >= MAX_EVENTS_PER_SHARE) return "full";
  const v = input;
  // user_id sai do próprio link; o visitante nunca informa nem vê.
  await db.query(
    `INSERT INTO public.share_events (share_id, user_id, type, name, body, video, time_seconds, decision)
     SELECT id, user_id, $2::text, $3::text, $4::text, $5::int, $6::int, $7::text FROM public.shares WHERE id = $1`,
    [
      share.id,
      v.type,
      v.type === "view" ? null : v.name,
      v.type === "view" ? null : v.text || null,
      v.type === "comment" ? v.video : null,
      v.type === "comment" ? v.time : null,
      v.type === "approval" ? v.decision : null,
    ],
  );
  return "ok";
}
