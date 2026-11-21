// Plano de plantel (Prompt 6, Bloco B): a IA do mercado compra, vende, empresta, renova e recompra por NECESSIDADE.
// Uma vez por mês por clube (guardado, não recalculado por tentativa), a partir da formação e do estilo do treinador:
//   - cada lugar da formação pede titulares e profundidade, por POSIÇÃO (as 12 de papeis.ts);
//   - os jogadores entram nas posições pela familiaridade (natural ou competente) e pelo nível no sistema;
//   - necessidades: qualidade (titular abaixo do alvo), profundidade (poucos utilizáveis) e sucessão (titular velho, a
//     sair ou com contrato a acabar sem renovação); excedentes: posições a mais, jogadores sem lugar, quem não encaixa;
//   - insubstituíveis: titulares sem alternativa (só saem com oferta muito acima do valor ou pela cláusula).
// Nada percorre o mundo inteiro: só o plantel do clube e uma média por liga.
import { PLANO_PLANTEL as P } from '../config/negociacao.ts';
import { POSICOES, IDX_POS, FAMILIARIDADE, factorFamiliaridade, type Posicao } from '../config/papeis.ts';
import { IDX } from '../config/atributos.ts';
import { FORMACAO_POR_ID } from '../config/tacticas.ts';
import type { World } from '../engine/world.ts';
import type { Mercado } from './mercado.ts';

const N_POS = POSICOES.length;
const ZONA: Record<Posicao, 'GR' | 'DEF' | 'LAT' | 'MED' | 'EXT' | 'PL'> = { GR: 'GR', DC: 'DEF', DD: 'LAT', DE: 'LAT', ALD: 'LAT', ALE: 'LAT', MDC: 'MED', MC: 'MED', MO: 'MED', ED: 'EXT', EE: 'EXT', PL: 'PL' };

export type MotivoNecessidade = 'qualidade' | 'profundidade' | 'sucessao';
export interface Necessidade {
  pos: Posicao;
  motivo: MotivoNecessidade;
  urgencia: number;
  /** Nível (no sistema) mínimo de um reforço e idades-alvo. */
  nivelMin: number;
  idade: [number, number];
  /** Pedido do treinador (acima da base: entra pelos pedidos dele). */
  pedido: boolean;
  texto: string;
  /** Estrela (Bloco C): o reforço grande da janela de um comprador rico; o orçamento concentra-se nele. */
  estrela?: boolean;
}

export interface PlanoClube {
  dia: number;
  formacao: string;
  estilo: string;
  nivel: number;
  /** Posição no plano de cada jogador (titular ou profundidade); quem não tem lugar fica de fora. */
  lugar: Map<number, { pos: Posicao; titular: boolean; nivel: number }>;
  necessidades: Necessidade[];
  /** Todas as necessidades calculadas (antes do corte pelo número aceite). */
  todas: Necessidade[];
  excedentes: { j: number; motivo: string }[];
  emprestar: number[];
  insubstituiveis: Set<number>;
}

export class PlanosPlantel {
  porClube = new Map<number, PlanoClube>();
  /** Nível médio dos titulares por liga (para o alvo "dos rivais"), recalculado com os planos. */
  private nivelLiga = new Map<number, { soma: number; n: number }>();

  constructor(private w: World, private m: Mercado) {}

  /** Plano do clube (calcula-o se não existir ou tiver mais de 35 dias). */
  /** Clubes cujo plantel mudou (venda, compra, empréstimo): o plano recalcula-se na próxima consulta. */
  private sujos = new Set<number>();
  invalidar(c: number) { this.sujos.add(c); }

  obter(c: number, dia: number): PlanoClube {
    const p = this.porClube.get(c);
    // Com a janela aberta recalcula-se mais vezes (lesões, lacunas e descontentes contam logo, sobretudo no Inverno).
    const validade = this.m.janelaAberta(c, dia) ? P.validade_janela_dias : 35;
    if (p && dia - p.dia <= validade && !this.sujos.has(c)) return p;
    return this.calcular(c, dia);
  }

  /** Nível de um jogador numa posição, no sistema do treinador. */
  nivelNoSistema(j: number, pos: Posicao, estilo: string): number {
    const st = this.w.jogadores!;
    const base = st.ovrPos(j, pos) * factorFamiliaridade(st.fam[j * N_POS + IDX_POS[pos]]);
    const attrs = P.estilo[estilo]?.[ZONA[pos]];
    if (!attrs?.length) return base;
    const m = attrs.reduce((a, k) => a + st.atr[j * 39 + IDX[k as keyof typeof IDX]], 0) / attrs.length;
    return (1 - P.peso_estilo) * base + P.peso_estilo * m * 5;
  }

  calcular(c: number, dia: number): PlanoClube {
    const w = this.w, st = w.jogadores!, m = this.m, e = w.economia!;
    const t = w.motor?.treinadores[c];
    const formacao = t?.formacoes?.[0] && FORMACAO_POR_ID[t.formacoes[0]] ? t.formacoes[0] : '4-3-3';
    const estilo = t?.perfil ?? 'neutro';
    const lugares = FORMACAO_POR_ID[formacao].lugares;
    // Titulares e profundidade por posição.
    const titulares = new Map<Posicao, number>();
    for (const l of lugares) titulares.set(l.pos as Posicao, (titulares.get(l.pos as Posicao) ?? 0) + 1);
    const pedidos = new Map<Posicao, number>();
    for (const [p, n] of titulares) pedidos.set(p, p === 'GR' ? P.profundidade_gr : Math.ceil(n * P.profundidade_campo));
    const pl = m.plantel(c).filter((j) => m.contratos.emprestimo.get(j)?.dono !== c || st.clube[j] === c);
    const lesionadoLongo = (j: number) => st.indisponivelAte[j] > dia + 60;
    // Distribuição gulosa: os pares (jogador, posição) por nível, primeiro os titulares, depois a profundidade.
    const pares: { j: number; pos: Posicao; nivel: number }[] = [];
    for (const j of pl) for (const p of titulares.keys()) {
      if (st.fam[j * N_POS + IDX_POS[p]] < FAMILIARIDADE.competente) continue;
      pares.push({ j, pos: p, nivel: this.nivelNoSistema(j, p, estilo) });
    }
    pares.sort((a, b) => b.nivel - a.nivel);
    const lugar = new Map<number, { pos: Posicao; titular: boolean; nivel: number }>();
    const ocupados = new Map<Posicao, number[]>();
    for (const fase of ['titular', 'profundidade'] as const) {
      for (const x of pares) {
        if (lugar.has(x.j) || (fase === 'titular' && lesionadoLongo(x.j))) continue;
        const occ = ocupados.get(x.pos) ?? [];
        const lim = fase === 'titular' ? titulares.get(x.pos)! : pedidos.get(x.pos)!;
        if (occ.length >= lim) continue;
        occ.push(x.j); ocupados.set(x.pos, occ);
        lugar.set(x.j, { pos: x.pos, titular: fase === 'titular', nivel: x.nivel });
      }
    }
    // Nível alvo: média dos titulares do clube, puxada pela liga (rivais) e pela ambição do clube.
    const tit = [...lugar.values()].filter((x) => x.titular);
    const media = tit.length ? tit.reduce((a, x) => a + x.nivel, 0) / tit.length : 50;
    const li = w.liga[c];
    const nl = li >= 0 ? this.nivelLiga.get(li) : undefined;
    const liga = nl && nl.n ? nl.soma / nl.n : media;
    const amb = e.ia?.ambicao[c] ?? 0.5;
    const alvo = (1 - P.peso_liga) * media + P.peso_liga * liga + P.ambicao_pontos * (amb - 0.5) * 2;
    if (li >= 0) { const x = this.nivelLiga.get(li) ?? { soma: 0, n: 0 }; const ant = this.porClube.get(c); if (ant) { x.soma -= ant.nivel; x.n--; } x.soma += media; x.n++; this.nivelLiga.set(li, x); }
    // Idades-alvo pelo arquétipo (a sucessão procura sempre mais novos).
    const arq = e.ia?.arquetipo[c];
    // Veteranos (Bloco C): ligas que os compram (Arábia, MLS, ...) e clubes a lutar pelo título alargam a idade máxima.
    const faixaIdade = P.idade_alvo[arq ?? ''] ?? P.idade_alvo.outro;
    const ligaId = li >= 0 ? w.ligas[li].regras.id : '';
    const candidatoTitulo = media >= liga + P.titulo_margem;
    // Uma liga com idade de veteranos própria manda (a bonificação dos candidatos ao título só vale nas outras).
    const idadeLiga = P.ligas_veteranos[ligaId];
    const idadeArq: [number, number] = [faixaIdade[0], idadeLiga !== undefined ? Math.max(faixaIdade[1], idadeLiga) : Math.max(faixaIdade[1], candidatoTitulo ? P.titulo_idade_max : 0)];
    const U = P.urgencia, todas: Necessidade[] = [];
    // Nível mínimo de um reforço: o do alvo do clube, mas nunca mais do que o titular actual + x (um reforço realista é
    // melhor do que quem lá está, não necessariamente o jogador ideal).
    const nec = (pos: Posicao, motivo: MotivoNecessidade, urgencia: number, texto: string, actual?: number) => todas.push({ pos, motivo, urgencia,
      nivelMin: Math.round(Math.min(alvo + (P.nivel_min[motivo] ?? 0), actual !== undefined ? actual + P.melhoria : Infinity)), idade: motivo === 'sucessao' ? [18, 26] : idadeArq, pedido: false, texto });
    for (const [pos, n] of titulares) {
      const occ = ocupados.get(pos) ?? [];
      const tits = occ.filter((j) => lugar.get(j)!.titular);
      // Profundidade: utilizáveis (sem lesões longas) abaixo do pedido; titular em falta pesa mais.
      const uteis = occ.filter((j) => !lesionadoLongo(j)).length;
      if (tits.length < n) nec(pos, 'profundidade', U.titular_em_falta * (n - tits.length), `${pos}: faltam ${n - tits.length} titular(es)`);
      else if (uteis < pedidos.get(pos)!) nec(pos, 'profundidade', U.profundidade * (pedidos.get(pos)! - uteis), `${pos}: ${uteis} de ${pedidos.get(pos)} jogadores`);
      for (const j of tits) {
        const l = lugar.get(j)!;
        if (l.nivel < alvo - P.margem_qualidade) nec(pos, 'qualidade', U.qualidade_por_ponto * (alvo - l.nivel), `${pos}: titular ${st.nomes[j]} (${l.nivel.toFixed(0)}) abaixo do nível do clube (${alvo.toFixed(0)})`, l.nivel);
        const idade = st.idade(j, dia), anos = (st.fimContrato[j] - dia) / 365;
        const sai = m.contratos.listado[j] === 2 || m.contratos.descontentamento[j] >= P.descontente || (m.contratos.preContrato[j] >= 0 && m.contratos.preContrato[j] !== c);
        if (sai) nec(pos, 'sucessao', U.sucessao_saida, `${pos}: ${st.nomes[j]} quer sair`);
        else if (idade >= P.idade_sucessao) nec(pos, 'sucessao', U.sucessao + (idade >= P.idade_sucessao + 2 ? U.sucessao_velho : 0), `${pos}: ${st.nomes[j]} tem ${Math.floor(idade)} anos`);
        else if (anos < 1 && idade >= P.idade_sucessao - 2) nec(pos, 'sucessao', U.sucessao, `${pos}: contrato de ${st.nomes[j]} acaba`);
      }
    }
    // Uma necessidade por posição (a mais urgente), ordenadas; o número aceite cresce com os pedidos do treinador.
    const porPos = new Map<Posicao, Necessidade>();
    for (const n of todas) { const x = porPos.get(n.pos); if (!x || n.urgencia > x.urgencia) porPos.set(n.pos, n); }
    const ordenadas = [...porPos.values()].sort((a, b) => b.urgencia - a.urgencia);
    const pd = t?.pedidos;
    const extra = pd ? Math.round(pd.reforcos * pd.autonomia * (1 + (e.ia?.pressao?.[c] ?? 0) * 0.5) / 2) : 0;
    // Um clube abaixo do nível da sua liga (luta pela permanência) aceita mais uma necessidade.
    const base = P.necessidades_base + (media < liga - P.abaixo_da_liga ? 1 : 0);
    // A profundidade (posição sem gente) entra sempre; o tecto só limita a qualidade e a sucessão.
    const prof = ordenadas.filter((n) => n.motivo === 'profundidade');
    const resto = ordenadas.filter((n) => n.motivo !== 'profundidade').slice(0, Math.max(0, Math.min(P.necessidades_max, base + extra) - prof.length));
    const necessidades = [...prof.map((n) => ({ ...n })), ...resto.map((n, i) => ({ ...n, pedido: prof.length + i >= base }))].sort((a, b) => b.urgencia - a.urgencia);
    // Estrela (Bloco C): o comprador rico concentra a janela num reforço grande (um por janela).
    const E = P.estrela, riqueza = li >= 0 ? w.ligas[li].regras.indice_riqueza : 0;
    // Só os ricos de verdade (ligas ricas: Inglaterra, topo europeu, Arábia, ...): os de ligas pequenas não concentram.
    const rico = riqueza >= E.riqueza_min && ((w.reputacao[c] >= E.reputacao_arquetipo && (arq === 'comprador_estrelas' || arq === 'magnata_impaciente')) || (w.reputacao[c] >= E.reputacao && riqueza >= E.riqueza));
    const q = rico && !m.estrelaJanela.has(c) ? necessidades.find((n) => n.motivo === 'qualidade') : undefined;
    if (q) {
      const actual = Math.min(...(ocupados.get(q.pos) ?? []).filter((j) => lugar.get(j)!.titular).map((j) => lugar.get(j)!.nivel));
      q.estrela = true;
      q.nivelMin = Math.round(Math.min(alvo + E.acima_alvo, actual + E.acima_titular));
      q.texto += ' (estrela da janela)';
    }
    // Excedentes: a mais na posição, sem lugar no plano, ou que não encaixa no sistema (descontente do treinador).
    const insubstituiveis = new Set<number>();
    for (const [pos, occ] of ocupados) {
      const tits = occ.filter((j) => lugar.get(j)!.titular);
      for (const j of tits) {
        const alt = pares.filter((x) => x.pos === pos && x.j !== j && x.nivel >= lugar.get(j)!.nivel - P.insubstituivel_margem);
        if (!alt.length) insubstituiveis.add(j);
      }
    }
    const excedentes: { j: number; motivo: string }[] = [], emprestar: number[] = [];
    // Emprestam os jovens sem lugar os clubes grandes e, em qualquer liga, os que usam pouco a academia (comprador de
    // estrelas, magnata): o júnior vai para um clube menor antes de se estrear.
    const arqC = e.ia?.arquetipo[c];
    const grande = w.reputacao[c] >= 70 || arqC === 'comprador_estrelas' || arqC === 'magnata_impaciente';
    for (const j of pl) {
      const l = lugar.get(j);
      if (l) {
        // Titular que não encaixa no sistema: o treinador prefere outro perfil.
        const ovr = st.ovrPos(j, l.pos);
        if (!insubstituiveis.has(j) && l.nivel < ovr - P.encaixe_margem) excedentes.push({ j, motivo: `não encaixa no ${estilo} (${l.pos})` });
        continue;
      }
      const idade = st.idade(j, dia);
      if (idade <= P.jovem_emprestar && st.pot[j] >= st.ovrNat(j) + 5) { if (grande) emprestar.push(j); continue; }
      excedentes.push({ j, motivo: st.fam[j * N_POS + st.posNat[j]] && !titulares.has(POSICOES[st.posNat[j]]) ? `sem posição na ${formacao}` : `a mais na posição ${POSICOES[st.posNat[j]]}` });
    }
    // Os excedentes não deixam o plantel abaixo do mínimo: os piores primeiro, até ao limite.
    const maxVender = Math.max(0, pl.length - 22);
    excedentes.sort((a, b) => st.ovrNat(a.j) - st.ovrNat(b.j));
    const plano: PlanoClube = { dia, formacao, estilo, nivel: media, lugar, necessidades, todas: ordenadas, excedentes: excedentes.slice(0, maxVender), emprestar, insubstituiveis };
    this.porClube.set(c, plano);
    this.sujos.delete(c);
    return plano;
  }

  /** O jogador é um excedente do plano do clube (à venda e emprestável), excepto os que só não encaixam no sistema? */
  excedente(c: number, j: number): boolean {
    return !!this.porClube.get(c)?.excedentes.some((x) => x.j === j && !x.motivo.startsWith('não encaixa'));
  }

  /** Há lugar no plano para um júnior? 'titular': entra no onze da sua posição; 'profundidade': entra nos pedidos da
   *  posição (há vaga ou é melhor do que o pior que lá está). */
  lugarParaJovem(c: number, j: number, dia: number, exigencia: 'titular' | 'profundidade'): boolean {
    const st = this.w.jogadores!, p = this.obter(c, dia);
    const lugares = FORMACAO_POR_ID[p.formacao].lugares;
    // Qualquer posição da formação em que seja competente (não só a natural).
    for (const pos of new Set(lugares.map((l) => l.pos as Posicao))) {
      if (st.fam[j * N_POS + IDX_POS[pos]] < FAMILIARIDADE.competente) continue;
      const n = lugares.filter((l) => l.pos === pos).length;
      const lim = exigencia === 'titular' ? n : pos === 'GR' ? P.profundidade_gr : Math.ceil(n * P.profundidade_campo);
      const occ = [...p.lugar.entries()].filter(([x, l]) => x !== j && l.pos === pos && (exigencia === 'profundidade' || l.titular)).map(([, l]) => l.nivel);
      if (occ.length < lim || this.nivelNoSistema(j, pos, p.estilo) > Math.min(...occ)) return true;
    }
    return false;
  }

  /** O clube está abaixo do nível da sua liga (luta pela permanência)? */
  abaixoDaLiga(c: number): boolean {
    const p = this.porClube.get(c), li = this.w.liga[c];
    const nl = li >= 0 ? this.nivelLiga.get(li) : undefined;
    return !!p && !!nl && nl.n > 0 && p.nivel < nl.soma / nl.n - P.abaixo_da_liga;
  }

  /** O jogador cobre uma necessidade do plano (posição natural ou competente, nível e idade)? */
  cobre(c: number, j: number, dia: number, nivelEstimado?: number): Necessidade | null {
    const st = this.w.jogadores!, p = this.obter(c, dia);
    for (const n of p.necessidades) {
      if (st.fam[j * N_POS + IDX_POS[n.pos]] < FAMILIARIDADE.competente) continue;
      const nv = nivelEstimado ?? this.nivelNoSistema(j, n.pos, p.estilo);
      if (nv >= n.nivelMin) return n;
    }
    return null;
  }
}
