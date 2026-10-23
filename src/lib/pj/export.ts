/** Exportações do financeiro PJ (CSV) e download de arquivos. */
import { csvCell, dateBR } from "./format.ts";

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type CsvTx = {
  due_date: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  status: "pending" | "paid";
  categories?: { name: string } | null;
  project_title?: string | null;
};

/** CSV com ponto e vírgula e vírgula decimal (abre direto no Excel em português). */
export function financeCsv(rows: CsvTx[]): string {
  const head = ["data", "tipo", "descricao", "categoria", "valor", "status", "projeto"].join(";");
  const body = rows.map((t) =>
    [
      dateBR(t.due_date),
      t.type === "income" ? "entrada" : "despesa",
      csvCell(t.description),
      csvCell(t.categories?.name ?? ""),
      String(t.amount).replace(".", ","),
      t.status === "paid" ? "pago" : "pendente",
      csvCell(t.project_title ?? ""),
    ].join(";"),
  );
  return [head, ...body].join("\n");
}
