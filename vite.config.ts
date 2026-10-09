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
 *  - pré-renderização: as páginas públicas (/, /pricing, /terms, /privacy, /auth) viram HTML pronto (pricing.html etc.),
 *    com título, metas e JSON-LD, para buscadores e assistentes de IA;
 *  - base: caminho público do site (ex.: /steady-month-planner/). O roteador o deriva sozinho.
 * Sem a variável, o build e o dev continuam como antes.
 */
const pages = process.env.GITHUB_PAGES === "true";
/** Hospedagem própria (Node + PostgreSQL): o build gera .output/server/index.mjs (npm start). */
const node = process.env.DEPLOY_TARGET === "node";
/** Padrão: Cloudflare Workers (site + API no mesmo Worker). O wrangler.json sai em .output/server. */
const cloudflare = {
  preset: "cloudflare-module",
  cloudflare: {
    nodeCompat: true,
    deployConfig: true,
    wrangler: { name: "finlist", compatibility_date: "2025-09-01", observability: { enabled: true } },
  },
} as const;

export default defineConfig({
  ...(pages ? { nitro: false } : { nitro: node ? { preset: "node-server" } : cloudflare }),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
    ...(pages
      ? {
          spa: { enabled: true, prerender: { outputPath: "/_shell", crawlLinks: false } },
          prerender: {
            enabled: true,
            crawlLinks: true,
            autoSubfolderIndex: false, // /pricing.html (servido em /pricing, sem 301 para /pricing/)
            failOnError: true,
          },
        }
      : {}),
  },
  ...(pages ? { vite: { base: process.env.PAGES_BASE || "/" } } : {}),
});
