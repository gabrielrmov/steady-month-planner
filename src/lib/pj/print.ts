/** "Gerar PDF": abre o documento já renderizado (React, escapado) numa janela e chama a impressão. */
export function printElement(el: HTMLElement | null, title: string): boolean {
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
  style.textContent = `${css} body{background:#fff;margin:0;padding:24px} .doc{border:0;max-width:820px;margin:0 auto}`;
  doc.head.append(style);
  doc.body.append(doc.importNode(el, true));
  setTimeout(() => w.print(), 400);
  return true;
}
