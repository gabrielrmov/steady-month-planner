import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { runQuery, type Queryable } from "./query.ts";
import {
  MAX_EVENTS_PER_SHARE,
  addPublicEvent,
  getPublicShare,
  ipFingerprint,
  parseEventInput,
  rateLimit,
  sanitizeSnapshot,
} from "./share.ts";
import { parseVideoUrl } from "../lib/pj/video.ts";

let db: Queryable;
let pg: PGlite;
let a: string;
let b: string;
let tokenA: string;
let shareA: string;

const EVIL = `<script>alert(1)</script><img src=x onerror=alert(2)>`;

before(async () => {
  pg = new PGlite({ parsers: { 1082: (v: string) => v, 1700: (v: string) => parseFloat(v) } });
  await pg.exec(readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8"));
  db = {
    query: async (t, p) => ({
      rows: (await pg.query(t, p as unknown[])).rows as Record<string, unknown>[],
    }),
  };
  a = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('a@sh.com') RETURNING id"))
    .rows[0].id;
  b = (await pg.query<{ id: string }>("INSERT INTO users(email) VALUES ('b@sh.com') RETURNING id"))
    .rows[0].id;
  const r = await runQuery(db, a, {
    table: "shares",
    action: "insert",
    returning: true,
    single: "single",
    columns: "*",
    values: {
      kind: "proposal",
      title: EVIL,
      brand: { name: EVIL, logo: "javascript:alert(1)", phone: "11999998888", extra: "x" },
      snapshot: { title: EVIL, intro: EVIL, price: 1500, user_id: a, segredo: "não pode sair" },
    },
  });
  const row = r.data as { id: string; token: string };
  tokenA = row.token;
  shareA = row.id;
});

test("GET público devolve só o snapshot reduzido, sem user_id nem campos extras", async () => {
  const res = (await getPublicShare(db, tokenA))!;
  const json = JSON.stringify(res);
  assert.ok(!json.includes(a), "user_id do dono nunca sai");
  assert.ok(!json.includes("segredo") && !json.includes("extra"));
  assert.equal(res.share.brand.logo, "", "logo que não é data URL de imagem é descartada");
  assert.equal(res.share.data.price, 1500);
  assert.equal(res.share.kind, "proposal");
});

test("token inválido ou desconhecido não revela nada", async () => {
  assert.equal(await getPublicShare(db, "abc"), null);
  assert.equal(await getPublicShare(db, "0".repeat(64)), null);
  assert.equal(await getPublicShare(db, `${tokenA}' OR '1'='1`), null);
  assert.equal(await addPublicEvent(db, "0".repeat(64), { type: "view" }), "not_found");
});

test("cliente cria comentário, aprovação e visualização; visualização não aparece no GET", async () => {
  assert.equal(
    await addPublicEvent(db, tokenA, {
      type: "comment",
      name: "Maria",
      text: EVIL,
      video: 0,
      time: 83,
    }),
    "ok",
  );
  assert.equal(
    await addPublicEvent(db, tokenA, {
      type: "approval",
      name: "Maria",
      decision: "changes",
      text: "ajustar",
    }),
    "ok",
  );
  assert.equal(await addPublicEvent(db, tokenA, { type: "view" }), "ok");
  const res = (await getPublicShare(db, tokenA))!;
  assert.deepEqual(
    res.events.map((e) => e.type),
    ["comment", "approval"],
  );
  assert.equal(res.events[0].time, 83);
  assert.equal(res.events[0].text, EVIL, "o servidor guarda texto puro; quem exibe escapa (React)");
  assert.ok(!JSON.stringify(res).includes(a));

  const mine = (
    await runQuery(db, a, {
      table: "share_events",
      action: "select",
      filters: [{ col: "share_id", op: "eq", val: shareA }],
    })
  ).data as { type: string; seen: boolean; user_id: string }[];
  assert.equal(mine.length, 3, "o dono enxerga as 3 (incluindo a visualização)");
  assert.ok(
    mine.every((e) => e.user_id === a && e.seen === false),
    "eventos novos chegam como não vistos",
  );
  assert.equal(
    ((await runQuery(db, b, { table: "share_events", action: "select" })).data as unknown[]).length,
    0,
  );
});

test("validação do corpo vindo de fora", () => {
  const bad = (x: unknown) => assert.equal(parseEventInput(x).ok, false, JSON.stringify(x));
  bad(null);
  bad([]);
  bad("x");
  bad({ type: "reply", name: "x", text: "falso" });
  bad({ type: "comment", name: "", text: "oi" });
  bad({ type: "comment", name: "x".repeat(81), text: "oi" });
  bad({ type: "comment", name: "x", text: "" });
  bad({ type: "comment", name: "x", text: "y".repeat(2001) });
  bad({ type: "comment", name: "x", text: 5 });
  bad({ type: "comment", name: "x", text: "oi", time: -1 });
  bad({ type: "comment", name: "x", text: "oi", time: 1.5 });
  bad({ type: "comment", name: "x", text: "oi", time: "10" });
  bad({ type: "comment", name: "x", text: "oi", video: 100 });
  bad({ type: "approval", name: "x", decision: "talvez" });
  bad({ type: "approval", name: "x" });
  const ok = parseEventInput({
    type: "comment",
    name: " Ana ",
    text: " oi ",
    time: 10,
    video: 1,
    user_id: "x",
    share_id: "y",
    seen: true,
    done: true,
  });
  assert.ok(ok.ok);
  assert.deepEqual((ok as { value: unknown }).value, {
    type: "comment",
    name: "Ana",
    text: "oi",
    video: 1,
    time: 10,
  });
  assert.ok(parseEventInput({ type: "approval", name: "Ana", decision: "approved" }).ok);
  assert.ok(parseEventInput({ type: "view", name: "ignorado" }).ok);
});

test("limite de requisições por chave e janela", async () => {
  const key = "teste:ip1";
  const results = [];
  for (let i = 0; i < 5; i++) results.push(await rateLimit(db, key, 3, 600));
  assert.deepEqual(results, [true, true, true, false, false]);
  assert.equal(
    await rateLimit(db, "teste:ip2", 3, 600),
    true,
    "outra chave tem o próprio contador",
  );
});

test("impressão digital do IP é um hash estável e não guarda o IP", async () => {
  const h1 = await ipFingerprint(
    new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
    "sal",
  );
  const h2 = await ipFingerprint(new Headers({ "cf-connecting-ip": "203.0.113.9" }), "sal");
  const h3 = await ipFingerprint(new Headers({ "cf-connecting-ip": "203.0.113.10" }), "sal");
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
  assert.match(h1, /^[0-9a-f]{32}$/);
  assert.ok(!h1.includes("203"));
});

test("limite de eventos por link", async () => {
  const r = await runQuery(db, a, {
    table: "shares",
    action: "insert",
    returning: true,
    single: "single",
    columns: "*",
    values: { kind: "delivery", title: "Cheio" },
  });
  const { id, token } = r.data as { id: string; token: string };
  await pg.query(
    `INSERT INTO share_events (share_id, user_id, type, name, body) SELECT $1, $2, 'comment', 'x', 'y' FROM generate_series(1, $3)`,
    [id, a, MAX_EVENTS_PER_SHARE],
  );
  assert.equal(
    await addPublicEvent(db, token, {
      type: "comment",
      name: "x",
      text: "mais um",
      video: null,
      time: null,
    }),
    "full",
  );
});

test("snapshot de entrega: só vídeos com link http(s), no máximo 20", () => {
  const out = sanitizeSnapshot("delivery", {
    title: "Entrega",
    message: "oi",
    videos: [
      { title: "ok", url: "https://youtu.be/dQw4w9WgXcQ" },
      { title: "xss", url: "javascript:alert(1)" },
      { title: "data", url: "data:text/html,<script>alert(1)</script>" },
      ...Array.from({ length: 30 }, (_, i) => ({ title: `v${i}`, url: `https://x.com/${i}.mp4` })),
    ],
  }) as { videos: { url: string }[] };
  assert.equal(out.videos.length, 18, "só os 20 primeiros entram, e dois deles são inválidos");
  assert.ok(out.videos.every((v) => /^https?:\/\//.test(v.url)));
});

test("vídeo: só ids extraídos de YouTube/Vimeo/Drive, arquivo ou link; resto é recusado", () => {
  assert.deepEqual(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ"), {
    kind: "youtube",
    id: "dQw4w9WgXcQ",
  });
  assert.deepEqual(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), {
    kind: "youtube",
    id: "dQw4w9WgXcQ",
  });
  assert.deepEqual(parseVideoUrl("https://vimeo.com/123456789/abcdef1234"), {
    kind: "vimeo",
    id: "123456789",
    hash: "abcdef1234",
  });
  assert.deepEqual(parseVideoUrl("https://drive.google.com/file/d/1AbC_-x/view"), {
    kind: "drive",
    id: "1AbC_-x",
  });
  assert.deepEqual(parseVideoUrl("https://cdn.x.com/a.mp4?x=1"), {
    kind: "file",
    url: "https://cdn.x.com/a.mp4?x=1",
  });
  assert.equal(parseVideoUrl("javascript:alert(1)").kind, "none");
  assert.equal(parseVideoUrl("data:text/html,x").kind, "none");
  assert.equal(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ"><script>').kind, "youtube");
  assert.deepEqual(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ"><script>'), {
    kind: "youtube",
    id: "dQw4w9WgXcQ",
  });
  assert.equal(parseVideoUrl("https://site.com/pagina").kind, "link");
});

test("a página pública não usa nenhuma forma de injetar HTML", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (
        /(share|VideoPlayer|PublicShare|doc|video|safe)\.(ts|tsx)$/.test(f) ||
        /^c\.\$token\.tsx$/.test(f)
      )
        files.push(p);
    }
  };
  walk(new URL("../", import.meta.url).pathname);
  assert.ok(files.length >= 4, `arquivos checados: ${files.join(", ")}`);
  for (const f of files) {
    if (f.endsWith(".test.ts")) continue;
    const src = readFileSync(f, "utf8");
    assert.ok(
      !/dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|document\.write\(|\beval\(|new Function\(/.test(
        src,
      ),
      `${f} injeta HTML`,
    );
  }
});
