// A4 com margem de 14mm (ver @page em styles.css): área útil de 182 × 269 mm, em px de CSS (96 dpi).
const PAGE_W = "182mm";
const PAGE_H = (269 / 25.4) * 96;

/**
 * "Gerar PDF": abre o documento já renderizado (React, escapado) numa janela e chama a impressão.
 * Com `onePage`, reduz o documento (zoom) só o quanto for preciso para caber numa única folha A4.
 */
export function printElement(
  el: HTMLElement | null,
  title: string,
  opts: { onePage?: boolean } = {},
): boolean {
  if (!el) return false;
  const w = window.open("", "_blank");
  if (!w) return false;
  const css = [...document.styleSheets]
    .map((s) => {
      try {
        return [...s.cssRules].map((r) => r.cssText).join("");
      } catch {
        return "";
      }
    })
    .join("");
  const doc = w.document;
  doc.open();
  doc.write(
    "<!doctype html><html><head><meta charset='utf-8'><title></title></head><body></body></html>",
  );
  doc.close();
  doc.title = title;
  const style = doc.createElement("style");
  style.textContent = opts.onePage
    ? `${css} body{background:#fff;margin:0} @media screen{body{padding:14mm}}
       .doc{border:0;border-radius:0;padding:0;font-size:12.5px;width:${PAGE_W};max-width:none;margin:0 auto}`
    : `${css} body{background:#fff;margin:0;padding:24px} .doc{border:0;max-width:820px;margin:0 auto}`;
  doc.head.append(style);
  const copy = doc.importNode(el, true) as HTMLElement;
  copy.classList.remove("hidden"); // no celular o documento pode estar escondido pela aba "Editar"
  doc.body.append(copy);
  const print = () => {
    if (opts.onePage) {
      // Reduz até caber: 1 = sem redução; piso de 0.45 para não ficar ilegível.
      const h = copy.getBoundingClientRect().height;
      if (h > PAGE_H) copy.style.setProperty("zoom", String(Math.max(0.45, (PAGE_H - 4) / h)));
    }
    w.print();
  };
  // Espera o logo carregar: ele muda a altura do documento.
  const imgs = [...copy.querySelectorAll("img")].filter((i) => !i.complete);
  Promise.all(imgs.map((i) => new Promise((r) => ((i.onload = i.onerror = r), undefined)))).then(
    () => setTimeout(print, 300),
  );
  return true;
}
