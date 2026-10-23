/** Filtros usados antes de mostrar qualquer dado que veio do banco numa página pública. */

/** Só aceita logo em data URL de imagem; qualquer outra coisa vira "sem logo". */
export const safeLogo = (s: unknown): string =>
  typeof s === "string" &&
  s.length <= 450_000 &&
  /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)
    ? s
    : "";

/** Só links http(s). */
export const safeHttpUrl = (s: unknown): string =>
  typeof s === "string" && s.length <= 2000 && /^https?:\/\//i.test(s) ? s : "";
