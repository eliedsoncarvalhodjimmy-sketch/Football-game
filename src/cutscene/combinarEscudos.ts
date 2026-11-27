// Prompt 11, Bloco 2: a parte pura do script `scripts/cutscene/gerar-escudos.ts` — liga ficheiros a clubes por nome
// normalizado, sem tocar em disco nem no ffmpeg (por isso é testável em Node sem ficheiros a sério).
import { normalizarNome } from './normalizar.ts';

export interface ClubeParaEscudo { id: string; nome: string; nome_curto: string }
export interface ResultadoCombinacao {
  /** clubeId → nome do ficheiro de origem (sem pasta, com extensão). */
  mapa: Map<string, string>;
  /** Clubes sem nenhum ficheiro correspondente (ficam com o escudo genérico). */
  clubesSemImagem: ClubeParaEscudo[];
  /** Ficheiros de `assets/escudos-fonte/` que não correspondem a nenhum clube (nome por rever). */
  ficheirosNaoUsados: string[];
}

/** `ficheiros`: nomes de ficheiro (ex.: "fc_porto.png"); a correspondência é por `<clubeId>.ext` ou pelo nome do
 *  clube normalizado (acentos fora, tudo minúsculas, só letras/números) = o nome do ficheiro (sem extensão),
 *  normalizado da mesma forma. O primeiro ficheiro que combine com um clube ganha; os clubes repetem-se nunca
 *  (cada clube só pode ficar com um ficheiro). */
export function combinarEscudos(clubes: ClubeParaEscudo[], ficheiros: string[]): ResultadoCombinacao {
  const porId = new Map(clubes.map((c) => [normalizarNome(c.id), c]));
  const porNome = new Map<string, ClubeParaEscudo>();
  for (const c of clubes) for (const n of [c.nome, c.nome_curto]) if (n) porNome.set(normalizarNome(n), c);

  const mapa = new Map<string, string>();
  const usados = new Set<string>();
  const ficheirosNaoUsados: string[] = [];
  for (const f of ficheiros) {
    const base = f.replace(/\.[^.]+$/, '');
    const chave = normalizarNome(base);
    const clube = porId.get(chave) ?? porNome.get(chave);
    if (!clube || usados.has(clube.id)) { ficheirosNaoUsados.push(f); continue; }
    mapa.set(clube.id, f);
    usados.add(clube.id);
  }
  const clubesSemImagem = clubes.filter((c) => !mapa.has(c.id));
  return { mapa, clubesSemImagem, ficheirosNaoUsados };
}
