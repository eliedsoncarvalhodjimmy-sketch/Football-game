// Vagas continentais (fonte: folha Vagas do utilizador, em packs/_continental/vagas.json).
// Ordem: 1) campeões em título; 2) bónus do ranking UEFA (+1 vaga para as
// melhores associações); 3) por liga, nesta ordem: UCL, UCL_PO, UEL, UEL_PO,
// UECL (e CLI/ACLE). Cada vaga "liga" vai ao melhor classificado ainda sem vaga;
// a vaga "taça" vai ao vencedor da taça ou, se já tiver vaga, ao melhor
// classificado sem vaga (cascata). Uma equipa nunca ocupa duas vagas.
import type { World, Qualificado } from '../world.ts';

export interface EntradaLiga {
  liga: string;
  /** Ordem do campeonato principal (o campeão primeiro). */
  ordem: number[];
  /** Posição final na tabela (para os rótulos). */
  pos: Map<number, number>;
  campeao: number | null;
  /** Vencedor da taça que dá vaga em cada competição (ex.: "UEL" → clube). */
  vencedoresTaca: Map<string, number>;
}

export interface ContextoVagas {
  /** Campeões em título por competição (ex.: "UCL" → clube). */
  detentores: Map<string, number>;
  /** Ligas com o bónus do ranking UEFA. */
  bonus: string[];
  /** Prefixo dos rótulos (ex.: "reputação" na 1.ª época). */
  prefixo?: string;
}

/** Liga principal (nível 1) do pacote de um clube. */
export function ligaPrincipalDe(w: World, clube: number): string | null {
  const l = w.liga[clube];
  if (l < 0) return null;
  const pac = w.pacotes.find((p) => p.ligas.includes(l));
  return pac ? w.ligas[pac.ligas[0]].regras.id : null;
}

export function atribuirVagas(w: World, entradas: Map<string, EntradaLiga>, ctx: ContextoVagas): Map<string, Qualificado[]> {
  const out = new Map<string, Qualificado[]>();
  const c = w.continental;
  if (!c) return out;
  for (const comps of Object.values(c.vagas.ordem_competicoes)) for (const id of comps) out.set(id, []);
  const usados = new Set<number>();
  const activo = (x: number) => w.liga[x] >= 0 && !usados.has(x);
  const extra = new Map<string, number>(); // "liga|comp" -> vagas extra pela liga
  const somarExtra = (liga: string, comp: string) => extra.set(`${liga}|${comp}`, (extra.get(`${liga}|${comp}`) ?? 0) + 1);
  const pref = ctx.prefixo ? `${ctx.prefixo}: ` : '';

  // 1. Campeões em título.
  for (const d of c.vagas.especiais?.detentores ?? []) {
    const x = ctx.detentores.get(d.de);
    if (x === undefined) continue;
    const liga = ligaPrincipalDe(w, x);
    if (liga && activo(x)) {
      usados.add(x);
      out.get(d.para)!.push({ clube: x, pais: w.clubes[x].pais, liga, via: `${pref}campeão em título da ${d.de}` });
    } else if (liga) somarExtra(liga, d.para); // já sem condições: a vaga desce na liga dele
  }
  // 2. Bónus do ranking UEFA.
  const b = c.vagas.especiais?.bonus_ranking;
  if (b) for (const liga of ctx.bonus.slice(0, b.paises)) somarExtra(liga, b.para);

  // 3. Por liga.
  for (const [liga, porComp] of Object.entries(c.vagas.vagas)) {
    const e = entradas.get(liga);
    if (!e) throw new Error(`vagas: sem classificação para ${liga}`);
    const conf = Object.values(c.vagas.ordem_competicoes).find((comps) => comps.some((x) => x in porComp)) ?? [];
    const rotulo = (x: number) => (x === e.campeao ? 'campeão' : `${e.pos.get(x) ?? '?'}.º`);
    const proximo = (): number => {
      const x = e.ordem.find(activo);
      if (x === undefined) throw new Error(`vagas: ${liga} sem clubes suficientes`);
      return x;
    };
    for (const comp of conf) {
      const v = porComp[comp] ?? {};
      for (let k = 0; k < (v.taca ?? 0); k++) {
        const vt = e.vencedoresTaca.get(comp.replace(/_PO$/, ''));
        let x: number, via: string;
        if (vt !== undefined && activo(vt)) [x, via] = [vt, 'vencedor da taça'];
        else { x = proximo(); via = `${rotulo(x)}, vaga da taça`; }
        usados.add(x);
        out.get(comp)!.push({ clube: x, pais: w.clubes[x].pais, liga, via: pref + via });
      }
      const nLiga = (v.liga ?? 0) + (extra.get(`${liga}|${comp}`) ?? 0);
      for (let k = 0; k < nLiga; k++) {
        const x = proximo();
        usados.add(x);
        const bonus = k >= (v.liga ?? 0) ? ' (vaga extra: bónus do ranking ou campeão em título)' : '';
        out.get(comp)!.push({ clube: x, pais: w.clubes[x].pais, liga, via: pref + rotulo(x) + bonus });
      }
    }
  }
  return out;
}

/** 1.ª época: não há época anterior. Usa a reputação como classificação; detentores e bónus gerados. */
export function vagasIniciais(w: World): Map<string, Qualificado[]> {
  const c = w.continental;
  if (!c) return new Map();
  const entradas = new Map<string, EntradaLiga>();
  for (const p of w.pacotes) {
    const l1 = w.ligas[p.ligas[0]];
    const ordem = [...l1.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
    entradas.set(l1.regras.id, { liga: l1.regras.id, ordem, pos: new Map(ordem.map((x, i) => [x, i + 1])), campeao: null, vencedoresTaca: new Map() });
  }
  // Detentores (gerado): os 3 clubes de maior reputação das ligas UEFA.
  const uefa = w.pacotes.filter((p) => p.manifest.confederacao === 'UEFA').flatMap((p) => w.ligas[p.ligas[0]].clubes).sort((a, b) => w.reputacao[b] - w.reputacao[a]);
  const detentores = new Map<string, number>();
  (c.vagas.especiais?.detentores ?? []).forEach((d, i) => detentores.set(d.de, uefa[i]));
  const bonus = c.vagas.primeira_epoca?.bonus_ranking.valor ?? [];
  return atribuirVagas(w, entradas, { detentores, bonus, prefixo: 'gerado (1.ª época, por reputação)' });
}
