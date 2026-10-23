/**
 * Player do cliente. YouTube (IFrame API), Vimeo (player.js) e arquivos .mp4/.webm informam o tempo atual
 * e aceitam "ir para o minuto"; Google Drive só abre o vídeo (o minuto é digitado à mão).
 * O embed é montado com o identificador extraído do link, nunca com a URL crua do banco.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { parseVideoUrl, type VideoSource } from "@/lib/pj/video";

export type PlayerHandle = { getTime: () => Promise<number | null>; seek: (s: number) => void };

type YTPlayer = {
  getCurrentTime(): number;
  seekTo(s: number, allowSeekAhead: boolean): void;
  destroy(): void;
};
type VimeoPlayer = {
  getCurrentTime(): Promise<number>;
  setCurrentTime(s: number): Promise<number>;
  destroy(): Promise<void>;
};
type PlayerWindow = Window & {
  YT?: { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
  onYouTubeIframeAPIReady?: () => void;
  Vimeo?: { Player: new (el: HTMLElement) => VimeoPlayer };
};
const win = () => window as PlayerWindow;

const scripts: Record<string, Promise<void>> = {};
const loadScript = (src: string) =>
  (scripts[src] ??= new Promise<void>((ok, no) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      delete scripts[src];
      no(new Error(`Falha ao carregar ${src}`));
    };
    document.head.append(s);
  }));

function youtubeReady(): Promise<void> {
  if (win().YT?.Player) return Promise.resolve();
  return new Promise((ok, no) => {
    const prev = win().onYouTubeIframeAPIReady;
    win().onYouTubeIframeAPIReady = () => {
      prev?.();
      ok();
    };
    loadScript("https://www.youtube.com/iframe_api").catch(no);
  });
}

export const VideoPlayer = forwardRef<PlayerHandle, { url: string }>(function VideoPlayer(
  { url },
  ref,
) {
  const mount = useRef<HTMLDivElement>(null);
  const handle = useRef<PlayerHandle>({ getTime: async () => null, seek: () => undefined });
  useImperativeHandle(
    ref,
    () => ({ getTime: () => handle.current.getTime(), seek: (s) => handle.current.seek(s) }),
    [],
  );

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let cancelled = false;
    let cleanup: () => void = () => undefined;
    const src: VideoSource = parseVideoUrl(url);
    handle.current = { getTime: async () => null, seek: () => undefined };
    host.replaceChildren();

    const el = <K extends keyof HTMLElementTagNameMap>(
      tag: K,
      attrs: Record<string, string> = {},
    ) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      return e;
    };

    (async () => {
      if (src.kind === "youtube") {
        await youtubeReady();
        if (cancelled || !win().YT) return;
        const holder = el("div");
        host.append(holder);
        const p = new (win().YT!.Player)(holder, {
          videoId: src.id,
          width: "100%",
          height: "100%",
          playerVars: { rel: 0 },
        });
        handle.current = {
          getTime: async () => {
            try {
              return p.getCurrentTime();
            } catch {
              return null;
            }
          },
          seek: (s) => {
            try {
              p.seekTo(s, true);
            } catch {
              /* player ainda carregando */
            }
          },
        };
        cleanup = () => {
          try {
            p.destroy();
          } catch {
            /* já removido */
          }
        };
      } else if (src.kind === "vimeo") {
        const frame = el("iframe", {
          src: `https://player.vimeo.com/video/${src.id}${src.hash ? `?h=${src.hash}` : ""}`,
          allow: "autoplay; fullscreen; picture-in-picture",
          allowfullscreen: "",
          title: "Vídeo",
        });
        host.append(frame);
        await loadScript("https://player.vimeo.com/api/player.js");
        if (cancelled || !win().Vimeo) return;
        const p = new (win().Vimeo!.Player)(frame);
        handle.current = {
          getTime: () => p.getCurrentTime().catch(() => null),
          seek: (s) => void p.setCurrentTime(s).catch(() => undefined),
        };
        cleanup = () => void p.destroy().catch(() => undefined);
      } else if (src.kind === "drive") {
        host.append(
          el("iframe", {
            src: `https://drive.google.com/file/d/${src.id}/preview`,
            allow: "autoplay",
            allowfullscreen: "",
            title: "Vídeo",
          }),
        );
      } else if (src.kind === "file") {
        const v = el("video", { src: src.url, controls: "", playsinline: "" });
        host.append(v);
        handle.current = {
          getTime: async () => v.currentTime,
          seek: (s) => {
            v.currentTime = s;
            void v.play().catch(() => undefined);
          },
        };
      } else if (src.kind === "link") {
        const a = el("a", { href: src.url, target: "_blank", rel: "noopener noreferrer" });
        a.textContent = "Abrir vídeo em nova aba";
        a.className =
          "inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground";
        const box = el("div");
        box.className = "grid h-full place-items-center p-5 text-center";
        box.append(a);
        host.append(box);
      } else {
        const box = el("div");
        box.className = "grid h-full place-items-center p-5 text-center text-sm text-white";
        box.textContent = "Vídeo indisponível";
        host.append(box);
      }
    })().catch(() => {
      if (!cancelled) host.textContent = "Não foi possível carregar o player.";
    });

    return () => {
      cancelled = true;
      cleanup();
      host.replaceChildren();
    };
  }, [url]);

  return (
    <div
      ref={mount}
      className="aspect-video w-full overflow-hidden rounded-xl bg-black [&_iframe]:h-full [&_iframe]:w-full [&_video]:h-full [&_video]:w-full"
    />
  );
});
