/* eslint-disable @next/next/no-img-element -- fotos vêm do Supabase Storage; imagens simples, já comprimidas */
import { photoUrl } from "@/lib/products/api";

export function ProductPhoto({ path, alt, size = 64 }: { path: string | null | undefined; alt: string; size?: number }) {
  const url = photoUrl(path);
  return (
    <div className="shrink-0 overflow-hidden rounded-xl border border-linha bg-white" style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt={alt} width={size} height={size} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-texto-suave" aria-hidden>
          <svg width={size / 2.5} height={size / 2.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3h6v3H9z" /><rect x="6" y="8.5" width="12" height="12.5" rx="3" /></svg>
        </div>
      )}
    </div>
  );
}
