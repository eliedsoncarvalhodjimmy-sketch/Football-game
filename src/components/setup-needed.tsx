/** Ecrã mostrado quando a app ainda não foi ligada ao Supabase (variáveis em falta). */
export function SetupNeeded() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">A app ainda não está ligada à base de dados</h1>
      <p className="mt-3 text-sm text-texto-suave">
        Faltam as variáveis <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        Siga a secção 1 do README (Supabase e Vercel).
      </p>
    </div>
  );
}
