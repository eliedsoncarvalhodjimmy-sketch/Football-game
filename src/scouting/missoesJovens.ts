// Missões do olheiro de jovens (plano juvenil, bloco 3): o clube escolhe país (do mapa de elegíveis), posição e duração;
// paga por semana conforme a zona; no regresso chega um relatório simples com 2 a 10 nomes (posição, nascimento, altura,
// peso, OVR e PT em intervalo, clube). Uma missão de cada vez por olheiro de jovens (0–3 por clube).
// Os nomes vêm das academias do jogo (Sub-18 e Sub-21 dos clubes desse país) e de clubes locais fora do jogo (gerados no
// relatório, fora do mundo até serem contratados).
import { Rng } from '../core/rng.ts';
import { POSICOES } from '../config/papeis.ts';
import { CONFEDERACAO_PAIS } from '../config/paises.ts';
import { PAISES_SCOUT, MISSOES as M, CUSTO_SEMANA as CS } from '../config/scoutingJovem.ts';
import { COMPENSACAO as CO } from '../config/academia.ts';
import { gerarJogador, qualidadesPerfil } from '../players/gerador.ts';
import { corpoJogador, type Academia } from '../academia/academia.ts';
import type { MembroStaff } from '../staff/staff.ts';
import type { World } from '../engine/world.ts';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export type PosicaoMissao = (typeof M.posicoes)[number];
const GRUPO_POS: Record<PosicaoMissao, string[] | null> = {
  Todas: null, 'Guarda-redes': ['GR'], Defesas: ['DC', 'DD', 'DE', 'ALD', 'ALE'], 'Médios': ['MDC', 'MC', 'MO'], 'Avançados': ['ED', 'EE', 'PL'],
};
const POS_GERAR: Record<PosicaoMissao, string[]> = {
  Todas: ['GR', 'DC', 'DC', 'DD', 'DE', 'MDC', 'MC', 'MC', 'MO', 'ED', 'EE', 'PL', 'PL'], 'Guarda-redes': ['GR'], Defesas: ['DC', 'DC', 'DD', 'DE'],
  'Médios': ['MDC', 'MC', 'MC', 'MO'], 'Avançados': ['ED', 'EE', 'PL', 'PL'],
};

export interface Missao {
  id: number;
  clube: number;
  olheiro: string;
  pais: string;
  posicao: PosicaoMissao;
  semanas: number;
  inicio: number;
  fim: number;
  custo: number;
  estado: 'em curso' | 'concluida';
  /** Jogadores do relatório (índices no PlayerStore) e os intervalos vistos pelo olheiro. */
  nomes: { jogador: number; ovr: [number, number]; pt: [number, number] }[];
}

export interface LinhaMissao {
  jogador: number;
  nome: string;
  posicao: string;
  nascimento: number;
  idade: number;
  altura: number;
  peso: number;
  ovr: [number, number];
  pt: [number, number];
  clube: string;
  /** Qualidade típica do país em que se destaca (se seguir o perfil). */
  destaque: string | null;
  estado: 'disponivel' | 'contratado' | 'indisponivel';
}

export class MissoesJovens {
  missoes: Missao[] = [];
  /** Jogadores gerados por missões (fora do mundo): clube local e dia limite para contratar. */
  externos = new Map<number, { clubeLocal: string; ate: number }>();
  private seq = 0;

  constructor(public w: World, public ac: Academia) {}

  olheiros(c: number): MembroStaff[] { return this.w.economia?.staff.membros(c, 'olheiro_jovens') ?? []; }
  activas(c: number): Missao[] { return this.missoes.filter((m) => m.clube === c && m.estado === 'em curso'); }
  /** Olheiros de jovens sem missão. */
  livres(c: number): MembroStaff[] { const ocup = new Set(this.activas(c).map((m) => m.olheiro)); return this.olheiros(c).filter((o) => !ocup.has(o.id)); }

  /** Custo por semana para o clube `c` (zona do país de destino; relativo ao continente do clube). */
  custoSemana(c: number, pais: string): number {
    const casa = this.w.clubes[c].pais;
    if (pais === casa) return CS.proprio_pais;
    const z = PAISES_SCOUT[pais]?.zona ?? 'europa';
    const europeu = CONFEDERACAO_PAIS[casa] === 'UEFA';
    if (europeu) return CS[z];
    const zonaCasa = PAISES_SCOUT[casa]?.zona;
    if (z === zonaCasa) return CS.proprio_continente;
    return z === 'europa' ? CS.america : CS[z];
  }

  custo(c: number, pais: string, semanas: number): number { return this.custoSemana(c, pais) * semanas; }

  /** Envia um olheiro de jovens. Devolve a missão ou o motivo da recusa. */
  enviar(c: number, o: { pais: string; posicao: PosicaoMissao; semanas: number }, dia: number): Missao | string {
    if (!PAISES_SCOUT[o.pais]) return 'país sem rede de scouting';
    if (!(M.duracoes as readonly number[]).includes(o.semanas)) return 'duração inválida';
    if (!M.posicoes.includes(o.posicao)) return 'posição inválida';
    const livre = this.livres(c)[0];
    if (!livre) return this.olheiros(c).length ? 'todos os olheiros de jovens estão em missão' : 'o clube não tem olheiros de jovens';
    const custo = this.custo(c, o.pais, o.semanas);
    const e = this.w.economia;
    if (e) e.clubes.lancar(c, 'staff', custo);
    const m: Missao = { id: ++this.seq, clube: c, olheiro: livre.id, pais: o.pais, posicao: o.posicao, semanas: o.semanas, inicio: dia, fim: dia + o.semanas * 7, custo, estado: 'em curso', nomes: [] };
    this.missoes.push(m);
    return m;
  }

  /** Conclui as missões que acabam nesta semana. */
  semana(segunda: number) {
    for (const m of this.missoes) if (m.estado === 'em curso' && m.fim < segunda + 7) this.concluir(m, Math.max(m.fim, segunda));
    // Externos não contratados a tempo: o rasto perde-se (ficam fora do mundo).
    for (const [j, x] of this.externos) if (x.ate < segunda) this.externos.delete(j);
  }

  private concluir(m: Missao, dia: number) {
    const w = this.w, st = w.jogadores!;
    const rng = Rng.de(w.semente, 'missao-jovens', m.clube, m.id);
    const o = this.olheiros(m.clube).find((x) => x.id === m.olheiro);
    const aval = o?.atributos.avaliacao ?? o?.nivel ?? 8, quant = o?.atributos.scout_quantidade ?? o?.nivel ?? 8, adapt = o?.atributos.adaptabilidade ?? o?.nivel ?? 8;
    const n = clamp(Math.round(M.nomes_base + M.nomes_por_quantidade * (quant - 6) + M.nomes_por_semana * m.semanas + rng.normal(0, M.nomes_ruido)), M.nomes_min, M.nomes_max);
    // Fora da região do olheiro (confederação do clube), a avaliação perde precisão (menos com adaptabilidade).
    const fora = CONFEDERACAO_PAIS[m.pais] !== CONFEDERACAO_PAIS[w.clubes[m.clube].pais];
    const larg = Math.max(M.largura_min, (M.largura_base - aval / M.largura_divisor) * (fora ? 1 + Math.max(0, 10 - adapt) * M.fora_regiao_por_ponto : 1));
    const grupo = GRUPO_POS[m.posicao];
    const okPos = (j: number) => !grupo || grupo.includes(POSICOES[st.posNat[j]]);
    // Candidatos das academias do jogo (Sub-18 e Sub-21 dos clubes do país), 15–18 anos, fora do próprio clube.
    const cand: number[] = [];
    for (let c = 0; c < w.clubes.length; c++) {
      if (c === m.clube || w.liga[c] < 0 || w.clubes[c].pais !== m.pais) continue;
      for (const j of this.ac.jovens(c)) { const a = st.idade(j, dia); if (a >= M.idade[0] && a < M.idade[1] + 1 && okPos(j)) cand.push(j); }
    }
    const escolhidos: number[] = [];
    const nAcad = cand.length ? Math.round(n * M.fraccao_academias) : 0;
    // O olheiro procura talento: o melhor (potencial) de n sorteios.
    for (let k = 0; k < nAcad && cand.length; k++) {
      let best = -1;
      for (let s = 0; s < M.sorteios; s++) { const j = cand[rng.int(0, cand.length - 1)]; if (best < 0 || st.pot[j] > st.pot[best]) best = j; }
      escolhidos.push(best);
      cand.splice(cand.indexOf(best), 1);
    }
    for (let k = escolhidos.length; k < n; k++) escolhidos.push(this.gerarExterno(m, dia, rng));
    m.nomes = escolhidos.map((j) => {
      const dO = rng.normal(0, larg / 3), dP = rng.normal(0, larg / 3), h = Math.max(1, Math.round(larg));
      const ovr = st.ovrNat(j) + dO, pot = st.pot[j] + dP;
      return { jogador: j, ovr: [clamp(Math.round(ovr - h), 1, 99), clamp(Math.round(ovr + h), 1, 99)], pt: [clamp(Math.round(pot - h), 1, 99), clamp(Math.round(pot + h), 1, 99)] };
    });
    m.estado = 'concluida';
  }

  /** Jovem de um clube local fora do jogo: gerado pela tabela de talento (país e clube que procura), fora do mundo. */
  private gerarExterno(m: Missao, dia: number, rng: Rng): number {
    const st = this.w.jogadores!;
    const best = [0, 1].map(() => this.ac.sortearJovem(m.clube, rng, m.pais, dia)).sort((a, b) => b.pot - a.pot)[0];
    const idade = M.idade[0] + rng.next() * (M.idade[1] - M.idade[0] + 0.9);
    const pot = best.pot, ovr = clamp(pot - (pot - best.ovr18) * Math.exp(0.2 * (18 - idade)), 8, Math.min(pot, this.ac.teto));
    const pos = rng.pick(POS_GERAR[m.posicao]) as (typeof POSICOES)[number];
    const j = gerarJogador(st, rng, { id: `m${m.clube}_${m.id}_${++this.seq}`, pais: m.pais, pos, idade, dia, ovr, potencial: clamp(pot, ovr, 99), clube: -2, perfilPais: true });
    this.ac.garantir();
    this.externos.set(j, { clubeLocal: localClube(m.pais, j), ate: dia + M.validade_dias });
    return j;
  }

  /** Relatório de uma missão para a interface. */
  relatorio(m: Missao, dia: number): LinhaMissao[] {
    const w = this.w, st = w.jogadores!;
    return m.nomes.map((x) => {
      const j = x.jogador, c = st.clube[j], pos = POSICOES[st.posNat[j]], idade = st.idade(j, dia), corpo = corpoJogador(st.ids[j], pos, idade);
      const ext = this.externos.get(j);
      const estado: LinhaMissao['estado'] = c === m.clube ? 'contratado' : (c >= 0 && this.ac.escalao[j]) || ext ? 'disponivel' : 'indisponivel';
      const q = qualidadesPerfil(st.ids[j], st.paises[st.pais[j]] ?? '');
      return { jogador: j, nome: st.nomes[j], posicao: pos, nascimento: st.nasc[j], idade: Math.floor(idade), altura: corpo.altura, peso: corpo.peso, ovr: x.ovr, pt: x.pt,
        clube: c >= 0 ? w.clubes[c].nome : ext?.clubeLocal ?? '—', destaque: q[0] ?? null, estado };
    });
  }

  /** Compensação de formação para contratar um nome do relatório (externos: categoria do comprador × anos de formação). */
  compensacao(c: number, j: number, dia: number): number {
    const st = this.w.jogadores!;
    if (st.clube[j] >= 0) return this.ac.compensacao(j, c, dia);
    const anos = Math.max(1, Math.round(Math.min(CO.idade_fim, st.idade(j, dia)) - CO.idade_inicio));
    const cat = CO.categorias.find((k) => this.w.reputacao[c] >= k.reputacao) ?? CO.categorias[CO.categorias.length - 1];
    return anos * cat.por_ano;
  }

  /** Contrata um nome do relatório para a academia do clube (compensação de formação). Devolve o valor pago ou o motivo. */
  contratar(c: number, j: number, dia: number): number | string {
    const w = this.w, st = w.jogadores!;
    if (!this.missoes.some((m) => m.clube === c && m.nomes.some((x) => x.jogador === j))) return 'não está num relatório do clube';
    if (st.clube[j] >= 0) {
      if (!this.ac.escalao[j]) return 'já não está num escalão de formação';
      return this.ac.transferirJovem(j, c, dia);
    }
    if (!this.externos.has(j)) return 'o rasto do jogador perdeu-se';
    const valor = this.compensacao(c, j, dia);
    w.economia?.clubes.lancar(c, 'aquisicoes', valor);
    this.externos.delete(j);
    this.ac.receberExterno(j, c, dia);
    return valor;
  }

  bytes(): number { return this.missoes.reduce((a, m) => a + 80 + m.nomes.length * 24, 0) + this.externos.size * 40; }
}

/** Nome de um clube local (fora do jogo) para os jogadores gerados pelas missões. */
function localClube(pais: string, j: number): string {
  const r = Rng.de(0, 'clube-local', pais, j);
  const a = ['Academia', 'Escola de Futebol', 'Clube Desportivo', 'Juventude', 'Estrela', 'União'];
  const b = ['Central', 'do Norte', 'do Sul', 'da Cidade', 'Nova Geração', 'Atlético'];
  return `${r.pick(a)} ${r.pick(b)} (${PAISES_SCOUT[pais]?.nome ?? pais})`;
}

