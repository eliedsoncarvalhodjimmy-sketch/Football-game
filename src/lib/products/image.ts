/** Redimensiona fotos no aparelho antes de enviar (poupa dados móveis e espaço). */

export const MAX_PHOTO_SIDE = 1200;
export const PHOTO_QUALITY = 0.8;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // igual ao limite do bucket

export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Comprime uma imagem para WebP (ou JPEG se o browser não suportar). */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("O ficheiro não é uma imagem.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível ler esta imagem. Experimente outra foto (JPG, PNG ou WebP).");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.fillStyle = "#ffffff"; // PNG transparente fica com fundo branco
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, PHOTO_QUALITY));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("Não foi possível comprimir a imagem.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("A foto continua demasiado grande depois de comprimida.");
  return blob;
}
