const PLUGGY_API = "https://api.pluggy.ai";

export type PluggyTx = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type?: string;
  category?: string | null;
};

function credentials() {
  const clientId = process.env["PLUGGY_CLIENT_ID"];
  const clientSecret = process.env["PLUGGY_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("Open Finance ainda não está configurado (credenciais do agregador ausentes).");
  }
  return { clientId, clientSecret };
}

export function pluggyConfigured() {
  return Boolean(process.env["PLUGGY_CLIENT_ID"] && process.env["PLUGGY_CLIENT_SECRET"]);
}

export async function pluggyApiKey(): Promise<string> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao autenticar no agregador [${res.status}]: ${text}`);
  const body = JSON.parse(text) as { apiKey?: string };
  if (!body.apiKey) throw new Error("Resposta do agregador sem apiKey");
  return body.apiKey;
}

export async function pluggyGet<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${PLUGGY_API}${path}`, { headers: { "X-API-KEY": apiKey } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Erro do agregador [${res.status}]: ${text}`);
  return JSON.parse(text) as T;
}

export async function pluggyConnectToken(itemId?: string): Promise<string> {
  const apiKey = await pluggyApiKey();
  const res = await fetch(`${PLUGGY_API}/connect_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify(itemId ? { itemId } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao criar token de conexão [${res.status}]: ${text}`);
  const body = JSON.parse(text) as { accessToken?: string };
  if (!body.accessToken) throw new Error("Resposta do agregador sem accessToken");
  return body.accessToken;
}

export async function fetchItemTransactions(apiKey: string, itemId: string, fromISO: string) {
  const item = await pluggyGet<{ id: string; status: string; connector?: { name?: string } }>(
    apiKey,
    `/items/${itemId}`,
  );
  const accounts = await pluggyGet<{ results: { id: string; name?: string; type?: string }[] }>(
    apiKey,
    `/accounts?itemId=${itemId}`,
  );

  const all: (PluggyTx & { accountId: string; accountType?: string })[] = [];
  for (const acc of accounts.results ?? []) {
    let page = 1;
    for (;;) {
      const res = await pluggyGet<{ results: PluggyTx[]; totalPages?: number }>(
        apiKey,
        `/transactions?accountId=${acc.id}&from=${fromISO}&pageSize=200&page=${page}`,
      );
      for (const t of res.results ?? []) all.push({ ...t, accountId: acc.id, accountType: acc.type });
      if (!res.totalPages || page >= res.totalPages) break;
      page++;
    }
  }
  return { item, transactions: all };
}
