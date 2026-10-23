import { useRef, useState } from "react";
import { Download, FileDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildBackup, parseBackup, restoreInto } from "@/lib/pj/backup";
import { backupStore, useBusinessTransactions, useInvalidatePj, useRows } from "@/lib/pj/data";
import { downloadText, financeCsv } from "@/lib/pj/export";
import { today } from "@/lib/pj/format";
import type { PjProject } from "@/lib/pj/types";

/** Backup JSON de todos os dados PJ, restauração e CSV do financeiro. */
export function BackupCard() {
  const tx = useBusinessTransactions();
  const projects = useRows<PjProject>("pj_projects");
  const invalidate = useInvalidatePj();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const backup = await buildBackup(backupStore);
      downloadText(
        `finlist-pj-backup-${today()}.json`,
        JSON.stringify(backup, null, 1),
        "application/json",
      );
      toast.success("Backup gerado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function csv() {
    const title = new Map((projects.data ?? []).map((p) => [p.id, p.title]));
    const rows = (tx.data ?? [])
      .slice()
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((t) => ({ ...t, project_title: t.project_id ? (title.get(t.project_id) ?? "") : "" }));
    downloadText("financeiro-pj.csv", financeCsv(rows), "text/csv;charset=utf-8");
  }

  async function restore(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const backup = parseBackup(await f.text());
      if (
        !confirm(
          "Restaurar os dados do arquivo? Itens que já existem serão atualizados e os novos, criados.",
        )
      )
        return;
      const r = await restoreInto(backupStore, backup);
      await invalidate();
      toast.success(
        `Backup restaurado: ${r.created} criado(s), ${r.updated} atualizado(s)${r.skipped ? `, ${r.skipped} ignorado(s)` : ""}`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <Card className="animate-rise space-y-3 p-6">
      <h2 className="text-sm font-bold tracking-tight">Backup e exportação</h2>
      <p className="text-xs text-muted-foreground">
        O backup leva perfil, clientes, leads, propostas, contratos, projetos, equipamentos e o
        financeiro PJ. Os links públicos do cliente não entram: gere de novo depois de restaurar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={download} disabled={busy}>
          <Download className="mr-1 h-4 w-4" /> Baixar backup (JSON)
        </Button>
        <Button variant="outline" onClick={csv}>
          <FileDown className="mr-1 h-4 w-4" /> Exportar financeiro (CSV)
        </Button>
        <Button variant="outline" onClick={() => file.current?.click()} disabled={busy}>
          <Upload className="mr-1 h-4 w-4" /> Restaurar backup
        </Button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => restore(e.target.files?.[0])}
        />
      </div>
    </Card>
  );
}
