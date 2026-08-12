const SCRIPT_SRC = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";

type PluggyConnectCtor = new (opts: {
  connectToken: string;
  includeSandbox?: boolean;
  updateItem?: string;
  onSuccess?: (data: { item: { id: string } }) => void;
  onError?: (err: unknown) => void;
  onClose?: () => void;
}) => { init: () => void };

let loading: Promise<PluggyConnectCtor> | null = null;

export function loadPluggyConnect(): Promise<PluggyConnectCtor> {
  const w = window as unknown as { PluggyConnect?: PluggyConnectCtor };
  if (w.PluggyConnect) return Promise.resolve(w.PluggyConnect);
  if (loading) return loading;
  loading = new Promise<PluggyConnectCtor>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => {
      const ctor = (window as unknown as { PluggyConnect?: PluggyConnectCtor }).PluggyConnect;
      if (ctor) resolve(ctor);
      else reject(new Error("Widget do agregador não carregou"));
    };
    el.onerror = () => reject(new Error("Não foi possível carregar o widget do agregador"));
    document.head.appendChild(el);
  });
  return loading;
}

export async function openPluggyWidget(opts: {
  connectToken: string;
  updateItem?: string;
  onSuccess: (itemId: string) => void;
  onError?: (err: unknown) => void;
}) {
  const PluggyConnect = await loadPluggyConnect();
  const widget = new PluggyConnect({
    connectToken: opts.connectToken,
    includeSandbox: true,
    updateItem: opts.updateItem,
    onSuccess: (data) => opts.onSuccess(data.item.id),
    onError: (err) => opts.onError?.(err),
  });
  widget.init();
}
