/** Reduz a logo para no máximo `max` px (maior lado) e devolve um data URL pequeno. */
export async function resizeLogo(file: File, max = 400): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(new Error("Não foi possível ler a imagem"));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * k));
    canvas.height = Math.max(1, Math.round(img.height * k));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL("image/png");
    if (out.length > 350_000) out = canvas.toDataURL("image/webp", 0.9);
    if (out.length > 350_000) out = canvas.toDataURL("image/jpeg", 0.85);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
