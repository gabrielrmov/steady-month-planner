/** Passa dados de uma tela para outra (ex.: lead → proposta → contrato) sem poluir a URL. */
export type PrefillKey = "proposal" | "contract";

export function setPrefill(key: PrefillKey, data: Record<string, unknown>) {
  try {
    sessionStorage.setItem(`pj:prefill:${key}`, JSON.stringify(data));
  } catch {
    /* sem armazenamento: a tela abre em branco */
  }
}

/** Lê e apaga: o preenchimento vale uma vez só. */
export function takePrefill<T = Record<string, unknown>>(key: PrefillKey): T | null {
  try {
    const raw = sessionStorage.getItem(`pj:prefill:${key}`);
    sessionStorage.removeItem(`pj:prefill:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
