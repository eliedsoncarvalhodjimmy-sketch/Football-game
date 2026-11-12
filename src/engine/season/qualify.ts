// Vagas continentais: cada vaga "liga" vai ao melhor classificado ainda sem
// vaga; a vaga "taça" vai ao vencedor da taça ou, se já tiver vaga (ou não
// existir), ao melhor classificado sem vaga. Uma equipa nunca ocupa duas vagas.
import type { World, Qualificado } from '../world.ts';

export interface EntradaPais {
  pais: string;
  /** Ordem do campeonato principal (o campeão primeiro). */
  ordem: number[];
  vencedorTaca: number | null;
}

const ORDINAL = (n: number) => `${n}.º`;

export function atribuirVagas(w: World, entradas: Map<string, EntradaPais>, rotuloSemTaca = 'taça'): Map<string, Qualificado[]> {
  const out = new Map<string, Qualificado[]>();
  const c = w.continental;
  if (!c) return out;
  for (const comp of c.competicoes) out.set(comp.id, []);
  for (const [pais, porComp] of Object.entries(c.vagas.vagas)) {
    const e = entradas.get(pais);
    if (!e) throw new Error(`vagas: sem classificação para ${pais}`);
    const conf = Object.entries(c.vagas.ordem_competicoes).find(([, comps]) => comps.some((x) => x in porComp))?.[1] ?? [];
    const usados = new Set<number>();
    const activo = (x: number) => w.liga[x] >= 0 && !usados.has(x);
    const proximo = (): [number, string] => {
      const i = e.ordem.findIndex(activo);
      if (i < 0) throw new Error(`vagas: ${pais} sem clubes suficientes`);
      return [e.ordem[i], i === 0 ? 'campeão' : ORDINAL(i + 1)];
    };
    for (const comp of conf) {
      const v = porComp[comp];
      if (!v) continue;
      for (let k = 0; k < (v.taca ?? 0); k++) {
        let clube: number, via: string;
        if (e.vencedorTaca !== null && activo(e.vencedorTaca)) [clube, via] = [e.vencedorTaca, rotuloSemTaca];
        else { [clube, via] = proximo(); via += ', vaga da taça'; }
        usados.add(clube);
        out.get(comp)!.push({ clube, pais, via });
      }
      for (let k = 0; k < (v.liga ?? 0); k++) {
        const [clube, via] = proximo();
        usados.add(clube);
        out.get(comp)!.push({ clube, pais, via });
      }
    }
  }
  return out;
}

/** 1.ª época: não há época anterior; usa a reputação como classificação. */
export function vagasIniciais(w: World): Map<string, Qualificado[]> {
  const entradas = new Map<string, EntradaPais>();
  for (const p of w.pacotes) {
    if (!p.manifest.pais) continue;
    const l1 = w.ligas[p.ligas[0]];
    const ordem = [...l1.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
    entradas.set(p.manifest.pais, { pais: p.manifest.pais, ordem, vencedorTaca: null });
  }
  const v = atribuirVagas(w, entradas);
  for (const q of v.values()) for (const x of q) x.via = `reputação: ${x.via.replace(', vaga da taça', '').replace('campeão', '1.º')}`;
  return v;
}
