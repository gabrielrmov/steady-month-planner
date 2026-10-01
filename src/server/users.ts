import type { Queryable } from "./query";
import type { GoogleProfile } from "./google";

export type AppUser = { id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string };

/**
 * Entra com o Google: acha o usuário pelo `sub`; senão pelo e-mail (é assim que as contas
 * migradas do Supabase se reconectam, mantendo o mesmo id); senão cria uma nova
 * (os gatilhos do banco criam perfil, categorias padrão e o teste de 30 dias).
 */
export async function upsertGoogleUser(db: Queryable, g: GoogleProfile): Promise<AppUser> {
  const cols = "id, email, full_name, avatar_url, created_at";
  const touch = `last_login_at = now(), avatar_url = COALESCE($2, avatar_url), full_name = COALESCE(full_name, $3)`;

  let r = await db.query(`UPDATE public.users SET ${touch} WHERE google_sub = $1 RETURNING ${cols}`, [g.sub, g.picture, g.name]);
  if (r.rows[0]) return r.rows[0] as AppUser;

  r = await db.query(
    `UPDATE public.users SET google_sub = $1, last_login_at = now(), avatar_url = COALESCE($3, avatar_url),
       full_name = COALESCE(full_name, $4)
     WHERE lower(email) = lower($2) AND google_sub IS NULL RETURNING ${cols}`,
    [g.sub, g.email, g.picture, g.name],
  );
  if (r.rows[0]) return r.rows[0] as AppUser;

  r = await db.query(
    `INSERT INTO public.users (email, google_sub, full_name, avatar_url, last_login_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING ${cols}`,
    [g.email, g.sub, g.name, g.picture],
  );
  return r.rows[0] as AppUser;
}

export async function getUserById(db: Queryable, id: string): Promise<AppUser | null> {
  const r = await db.query("SELECT id, email, full_name, avatar_url, created_at FROM public.users WHERE id = $1", [id]);
  return (r.rows[0] as AppUser) ?? null;
}
