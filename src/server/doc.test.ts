import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contractBlocks,
  proposalBlocks,
  renderBlocks,
  safeHttpUrl,
  safeLogo,
} from "../lib/pj/doc.ts";

const EVIL = `<script>alert(1)</script><img src=x onerror=alert(2)>`;

test("proposta: HTML nos campos vira texto escapado", () => {
  const html = renderToStaticMarkup(
    renderBlocks(
      proposalBlocks(
        {
          title: EVIL,
          client_name: EVIL,
          company: EVIL,
          intro: EVIL,
          scope_of_work: EVIL,
          deliverables: `${EVIL}\n${EVIL}`,
          timeline: EVIL,
          payment_terms: EVIL,
          notes: EVIL,
          price: 100,
        },
        { name: EVIL, doc: EVIL, phone: EVIL, email: EVIL, logo: `javascript:alert(1)` },
      ),
    ),
  );
  assert.ok(!html.includes("<script"), "sem tag script");
  assert.ok(!html.includes("<img src=x"), "sem img injetada");
  assert.ok(
    !/onerror=/.test(html.replace(/&lt;img src=x onerror=alert\(2\)&gt;/g, "")),
    "sem atributo onerror solto",
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<img"), "logo inválida não gera <img>");
});

test("contrato: HTML nos campos vira texto escapado", () => {
  const html = renderToStaticMarkup(
    renderBlocks(
      contractBlocks(
        {
          contract_type: "pontual",
          client_name: EVIL,
          client_doc: EVIL,
          object: EVIL,
          deliverables: EVIL,
          payment_terms: EVIL,
          cancel_fee: EVIL,
        },
        { company: EVIL, doc: EVIL, address: EVIL, city: EVIL, pix: EVIL },
      ),
    ),
  );
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("logo só aceita data URL de imagem; links só http(s)", () => {
  assert.equal(
    safeLogo("data:image/png;base64,iVBORw0KGgo="),
    "data:image/png;base64,iVBORw0KGgo=",
  );
  assert.equal(safeLogo(`data:image/svg+xml;base64,PHN2Zz4=`), "");
  assert.equal(safeLogo(`data:image/png;base64,AAA" onerror="x`), "");
  assert.equal(safeLogo("https://x.com/a.png"), "");
  assert.equal(safeHttpUrl("javascript:alert(1)"), "");
  assert.equal(safeHttpUrl("https://youtu.be/abc"), "https://youtu.be/abc");
});

test("contrato usa os dados e mantém o aviso de modelo-base", () => {
  const blocks = contractBlocks(
    {
      contract_type: "mensal",
      client_name: "Padaria",
      value: 1500,
      term: "6 meses",
      contract_date: "2026-10-22",
    },
    { company: "Estúdio", doc: "123", city: "Salvador/BA", pix: "a@b.c" },
  );
  const text = JSON.stringify(blocks);
  assert.ok(text.includes("Modelo-base. Não substitui revisão jurídica"));
  assert.ok(text.includes("RECORRENTES"));
  assert.ok(text.includes("mensais"));
  assert.ok(text.includes("Chave Pix: a@b.c"));
  assert.ok(text.includes("22/10/2026"));
});
