/** Reconhece o link do vídeo e extrai só o identificador: o embed é montado por nós, nunca com a URL crua. */
export type VideoSource =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string; hash?: string }
  | { kind: "drive"; id: string }
  | { kind: "file"; url: string }
  | { kind: "link"; url: string }
  | { kind: "none" };

const YT =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})(?![\w-])/i;
const VM = /vimeo\.com\/(?:video\/)?(\d+)(?:\/([\w]+))?/i;
const DR = /drive\.google\.com\/file\/d\/([\w-]+)/i;
const FILE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export function parseVideoUrl(raw: unknown): VideoSource {
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!/^https?:\/\//i.test(url) || url.length > 2000) return { kind: "none" };
  let m: RegExpMatchArray | null;
  if ((m = url.match(YT))) return { kind: "youtube", id: m[1] };
  if ((m = url.match(VM))) return { kind: "vimeo", id: m[1], hash: m[2] };
  if ((m = url.match(DR))) return { kind: "drive", id: m[1] };
  if (FILE.test(url)) return { kind: "file", url };
  return { kind: "link", url };
}

/** O tempo atual só é lido em YouTube, Vimeo e arquivo; no Drive o minuto é digitado à mão. */
export const hasAutoTime = (s: VideoSource) =>
  s.kind === "youtube" || s.kind === "vimeo" || s.kind === "file";
