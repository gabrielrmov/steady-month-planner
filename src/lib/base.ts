/**
 * Prefixo público do site. "/" na raiz de um domínio; "/nome-do-repo/" no GitHub Pages de projeto.
 * Use em <a href> e em URLs fixas. Os <Link> do roteador já aplicam o prefixo sozinhos.
 */
export const BASE_URL: string = import.meta.env.BASE_URL || "/";

/** "/auth" -> "/steady-month-planner/auth" (ou "/auth" quando o site está na raiz). */
export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_URL.replace(/\/$/, "")}${path}`;
}
