// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Hospedagem no GitHub Pages (arquivos estáticos): o workflow define GITHUB_PAGES=true.
 *  - nitro desligado: não há servidor, só o site estático em dist/client;
 *  - modo SPA: gera _shell.html, usado como 404.html para abrir rotas do app (/dashboard...);
 *  - pré-renderização: as páginas públicas (/, /pricing, /terms, /privacy, /auth) viram HTML pronto,
 *    com título, metas e JSON-LD, para buscadores e assistentes de IA;
 *  - base: caminho público do site (ex.: /steady-month-planner/). O roteador o deriva sozinho.
 * Sem a variável, o build e o dev continuam como antes.
 */
const pages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  ...(pages ? { nitro: false } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
    ...(pages
      ? {
          spa: { enabled: true, prerender: { outputPath: "/_shell", crawlLinks: false } },
          prerender: {
            enabled: true,
            crawlLinks: true,
            autoSubfolderIndex: true,
            failOnError: true,
          },
        }
      : {}),
  },
  ...(pages ? { vite: { base: process.env.PAGES_BASE || "/" } } : {}),
});
