/**
 * Backup e restauração dos dados PJ. A lógica é independente de onde os dados vivem (um "store"),
 * então roda igual no app (supabase.from) e no teste (PGlite).
 */
export type Row = Record<string, unknown>;

export interface BackupStore {
  list(table: string): Promise<Row[]>;
  insert(table: string, row: Row): Promise<Row>;
  update(table: string, id: string, row: Row): Promise<void>;
}

/** Ordem de restauração respeita as chaves estrangeiras. */
export const BACKUP_TABLES = [
  "pj_profile",
  "pj_clients",
  "pj_proposals",
  "pj_projects",
  "pj_leads",
  "pj_contracts",
  "pj_equipment",
  "categories",
  "transactions",
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type Backup = {
  app: "finlist-pj";
  version: 1;
  exported_at: string;
  tables: Partial<Record<BackupTable, Row[]>>;
};

/** Colunas que apontam para outra tabela do backup: precisam seguir o novo id se ele mudar. */
const REFS: Partial<Record<BackupTable, Record<string, BackupTable>>> = {
  pj_proposals: { client_id: "pj_clients" },
  pj_contracts: { client_id: "pj_clients", proposal_id: "pj_proposals" },
  pj_projects: { client_id: "pj_clients", proposal_id: "pj_proposals" },
  transactions: { project_id: "pj_projects", category_id: "categories" },
};

const DROP = new Set(["user_id", "created_at", "updated_at", "categories"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function buildBackup(store: BackupStore): Promise<Backup> {
  const tables: Backup["tables"] = {};
  for (const t of BACKUP_TABLES) {
    tables[t] = (await store.list(t)).map((r) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => !DROP.has(k))),
    );
  }
  return { app: "finlist-pj", version: 1, exported_at: new Date().toISOString(), tables };
}

export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido");
  }
  const b = raw as Partial<Backup> | null;
  if (
    !b ||
    b.app !== "finlist-pj" ||
    b.version !== 1 ||
    typeof b.tables !== "object" ||
    b.tables === null
  ) {
    throw new Error("Este arquivo não é um backup do Meu trabalho (PJ)");
  }
  return b as Backup;
}

export type RestoreReport = { updated: number; created: number; skipped: number };

/**
 * Restaura sem sobrescrever o que não é do backup: linhas com id já existente no usuário são atualizadas,
 * as demais são criadas (com novo id se o original já pertence a outra conta) e as referências seguem o novo id.
 * Só entram tabelas conhecidas; scope vira sempre "business" e user_id do arquivo é ignorado.
 */
export async function restoreInto(store: BackupStore, backup: Backup): Promise<RestoreReport> {
  const report: RestoreReport = { updated: 0, created: 0, skipped: 0 };
  const idMap = new Map<string, string>(); // `${table}:${idDoArquivo}` → id no banco
  const existing = new Map<BackupTable, Set<string>>();
  for (const t of BACKUP_TABLES) {
    existing.set(t, new Set((await store.list(t)).map((r) => String(r.id))));
  }

  for (const table of BACKUP_TABLES) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows)) continue;
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") {
        report.skipped++;
        continue;
      }
      const row: Row = Object.fromEntries(Object.entries(raw).filter(([k]) => !DROP.has(k)));
      const fileId = typeof row.id === "string" && UUID.test(row.id) ? row.id : null;
      if (table === "categories" || table === "transactions") row.scope = "business";

      for (const [col, target] of Object.entries(REFS[table] ?? {})) {
        const ref = row[col];
        if (typeof ref !== "string") continue;
        const mapped = idMap.get(`${target}:${ref}`);
        row[col] = mapped ?? (existing.get(target)?.has(ref) ? ref : null);
      }

      try {
        if (table === "pj_profile") {
          const mine = [...(existing.get(table) ?? [])][0];
          const { id: _id, ...rest } = row;
          if (mine) {
            await store.update(table, mine, rest);
            report.updated++;
          } else {
            await store.insert(table, rest);
            report.created++;
          }
          continue;
        }
        if (fileId && existing.get(table)?.has(fileId)) {
          const { id: _id, ...rest } = row;
          await store.update(table, fileId, rest);
          idMap.set(`${table}:${fileId}`, fileId);
          report.updated++;
          continue;
        }
        let saved: Row;
        try {
          saved = await store.insert(table, fileId ? row : (({ id: _id, ...rest }) => rest)(row));
        } catch {
          // o id original já é de outra conta: cria com id novo
          saved = await store.insert(table, (({ id: _id, ...rest }) => rest)(row));
        }
        if (fileId) idMap.set(`${table}:${fileId}`, String(saved.id));
        existing.get(table)?.add(String(saved.id));
        report.created++;
      } catch {
        report.skipped++;
      }
    }
  }
  return report;
}
