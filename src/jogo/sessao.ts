// Sessão de jogo (corre no Web Worker): o mundo, o simulador e o clube do utilizador. A interface só lê vistas e envia
// comandos. A sessão guarda um registo (semente, clube, perfil, semanas avançadas e comandos) que chega para a reconstruir:
// o motor é determinístico, por isso carregar uma gravação = gerar o mesmo mundo e repetir as mesmas semanas.
import { carregarDados, type Dados } from '../data/load.ts';
import type { DataSource } from '../data/DataSource.ts';
import { construirMundo, type World } from '../engine/world.ts';
import { Simulador } from '../engine/simulador.ts';
import { rotuloEpoca } from '../historico/historico.ts';
import { ControladorUtilizador } from '../club/controladorUtilizador.ts';
import type { JogoR } from '../engine/competitions/base.ts';
import type { Temporada } from '../engine/season/temporada.ts';
import { VERSAO_MOTOR } from '../config/interface.ts';
import { POSICOES } from '../config/papeis.ts';
import { FORMACAO_POR_ID, type Instrucoes } from '../config/tacticas.ts';
import { vistaPlantel, vistaJogador, vistaTactica, zonasLiga, escalaoDe, type VistaPlantel, type VistaJogador, type VistaTactica } from './vistas.ts';

export type Etapa = 'dados' | 'mundo' | 'motor' | 'reconstrucao' | 'pronto';
export type Progresso = (etapa: Etapa, fraccao: number, texto: string) => void;

/** Comandos do utilizador (A2). Os jogadores vão pelo id (estável entre reconstruções). */
export type Comando =
  | { tipo: 'sugerir'; formacao?: string; instrucoes?: Partial<Instrucoes>; onze?: string[] }
  | { tipo: 'cancelarSugestao' }
  | { tipo: 'promover'; jogador: string };
/** Comando guardado no registo: aplica-se antes de simular a semana `semana` (0 = antes da primeira). */
export interface ComandoRegistado { semana: number; tipo: Comando['tipo']; dados: Comando }
export type PedidoVista = { ecra: 'plantel' } | { ecra: 'jogador'; jogador: string } | { ecra: 'tactica'; formacao?: string };
export type Vista = { ecra: 'plantel'; dados: VistaPlantel } | { ecra: 'jogador'; dados: VistaJogador } | { ecra: 'tactica'; dados: VistaTactica };

/** Tudo o que é preciso para reconstruir um jogo. */
export interface RegistoJogo {
  versaoMotor: string;
  semente: number;
  clube: string; // id do clube (estável entre gerações do mesmo mundo)
  perfil: { nome: string; perfilDono: string };
  semanas: number;
  comandos: ComandoRegistado[];
}

export interface ClubeEscolha { idx: number; id: string; nome: string; cidade: string; cores: [string, string]; reputacao: number; estadio: string; capacidade: number; caixa: number | null }
export interface LigaEscolha { id: string; nome: string; nivel: number; clubes: ClubeEscolha[] }
export interface PaisEscolha { id: string; nome: string; ligas: LigaEscolha[] }

export interface JogoResumo { dia: number; data: string; comp: string; casa: string; fora: string; emCasa: boolean; gc: number | null; gf: number | null; resultado: 'V' | 'E' | 'D' | null;
  coresCasa: [string, string]; coresFora: [string, string]; adversario: string; coresAdv: [string, string] }
export type Zona = ReturnType<typeof zonasLiga>[number];
export interface Destaque { jogador: string; nome: string; pos: string; v: number }
export interface Resumo {
  data: string;
  dia: number;
  epoca: string;
  clube: { id: string; nome: string; cores: [string, string]; liga: string; ligaNome: string; caixa: number | null; reputacao: number };
  posicao: number | null;
  tabela: { pos: number; clube: string; cores: [string, string]; meu: boolean; j: number; v: number; e: number; d: number; dg: number; pts: number; zona: Zona }[];
  proximo: (JogoResumo & { dias: number; formaMeu: string[]; formaAdv: string[] }) | null;
  objectivo: string;
  financas: { estado: 'Saudável' | 'Apertada' | 'Crise'; caixa: number; transferencias: number; massa: number; orcSalarios: number; divida: number; receita: number; fairPlay: number | null } | null;
  destaques: { jogos: Destaque[]; golos: Destaque[]; assist: Destaque[] };
  tarefas: { tipo: 'contrato' | 'lesao' | 'treinador' | 'sugestao'; texto: string; detalhe: string; jogador?: string }[];
  ultimos: JogoResumo[];
  semanas: number;
}

const DIA_MS = 864e5;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataPt = (dia: number) => { const d = new Date(dia * DIA_MS); return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export class Sessao {
  w: World | null = null;
  sim: Simulador | null = null;
  clube = -1;
  registo: RegistoJogo | null = null;
  private dados: Dados | null = null;

  constructor(private fonte: DataSource) {}

  /** Lê os pacotes de dados (no arranque, enquanto o ecrã de carregamento está aberto). */
  async preparar(prog: Progresso = () => {}) {
    prog('dados', 0.3, 'A ler os pacotes de dados');
    this.dados ??= await carregarDados(this.fonte);
    prog('pronto', 1, 'Pronto');
  }

  /** Gera o mundo de uma semente (sem clube escolhido ainda). */
  async novoMundo(semente: number, prog: Progresso = () => {}): Promise<PaisEscolha[]> {
    prog('dados', 0.05, 'A ler os pacotes de dados');
    this.dados ??= await carregarDados(this.fonte);
    prog('mundo', 0.25, 'A gerar o mundo, os plantéis e a economia');
    this.w = construirMundo(this.dados, { semente, modo: 'teste' });
    prog('motor', 0.85, 'A preparar o calendário e o motor');
    this.sim = new Simulador(this.w);
    this.clube = -1;
    this.registo = { versaoMotor: VERSAO_MOTOR, semente, clube: '', perfil: { nome: '', perfilDono: '' }, semanas: 0, comandos: [] };
    prog('pronto', 1, 'Mundo pronto');
    return this.paises();
  }

  /** Países, ligas e clubes para o ecrã de escolha do clube. */
  paises(): PaisEscolha[] {
    const w = this.w!;
    const caixa = (c: number) => (w.economia ? Math.round(w.economia.clubes.caixa[c]) : null);
    return w.pacotes.map((p) => ({
      id: p.manifest.id, nome: p.manifest.nome,
      ligas: p.ligas.map((li) => {
        const l = w.ligas[li];
        return { id: l.regras.id, nome: l.regras.nome, nivel: l.regras.nivel,
          clubes: [...l.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]).map((c) => {
            const k = w.clubes[c];
            return { idx: c, id: k.id, nome: k.nome, cidade: k.cidade, cores: k.cores, reputacao: Math.round(w.reputacao[c]), estadio: k.estadio, capacidade: k.capacidade, caixa: caixa(c) };
          }) };
      }),
    })).filter((p) => p.ligas.length);
  }

  /** Começa o jogo com o clube escolhido: o utilizador passa a controlar o clube (Presidente). */
  comecar(clubeId: string, perfil: RegistoJogo['perfil']) {
    const w = this.w!;
    const c = w.idx(clubeId);
    this.clube = c;
    w.motor?.definirClubeUtilizador(c);
    if (w.economia) w.economia.controladores[c] = new ControladorUtilizador();
    this.registo = { ...this.registo!, clube: clubeId, perfil };
  }

  /** Aplica um comando do utilizador e guarda-o no registo. Lança erro se não for válido (nada muda). */
  comando(cmd: Comando) {
    this.aplicar(cmd);
    this.registo!.comandos.push({ semana: this.registo!.semanas, tipo: cmd.tipo, dados: cmd });
  }

  private aplicar(cmd: Comando) {
    const w = this.w!, st = w.jogadores!, c = this.clube, m = w.motor!;
    const dia = this.sim!.segunda;
    const idx = (id: string) => { const j = st.idx(id); if (j === undefined || st.clube[j] !== c) throw new Error('Jogador fora do clube.'); return j; };
    switch (cmd.tipo) {
      case 'sugerir': {
        if (cmd.formacao && !FORMACAO_POR_ID[cmd.formacao]) throw new Error('Formação desconhecida.');
        const onze = cmd.onze?.map(idx);
        if (onze && (onze.length !== 11 || new Set(onze).size !== 11 || onze.some((j) => !w.plantel[c].includes(j)))) throw new Error('O onze tem de ter 11 jogadores da equipa principal.');
        m.sugestao = { ...(cmd.formacao ? { formacao: cmd.formacao } : {}), ...(cmd.instrucoes ? { instrucoes: cmd.instrucoes } : {}), ...(onze ? { onze } : {}) };
        break;
      }
      case 'cancelarSugestao': m.sugestao = null; break;
      case 'promover': {
        const j = idx(cmd.jogador), ac = w.academia!, e = escalaoDe(w, j);
        if (e === 'sub21') ac.promover(j, dia, false, 'utilizador');
        else if (e === 'sub18') ac.subirAoSub21(j);
        else throw new Error('Já está na equipa principal.');
        break;
      }
    }
  }

  /** Vistas dos ecrãs (só leitura). */
  vista(p: PedidoVista): Vista {
    const w = this.w!, dia = this.sim!.segunda;
    if (p.ecra === 'plantel') return { ecra: 'plantel', dados: vistaPlantel(w, this.clube, dia) };
    if (p.ecra === 'tactica') return { ecra: 'tactica', dados: vistaTactica(w, this.clube, dia, p.formacao) };
    const j = w.jogadores!.idx(p.jogador);
    if (j === undefined) throw new Error('Jogador desconhecido.');
    return { ecra: 'jogador', dados: vistaJogador(w, j, dia, this.clube) };
  }

  /** Avança uma semana. */
  avancar(): JogoR[] {
    const jogos = this.sim!.simularSemana();
    this.registo!.semanas++;
    return jogos;
  }

  /** Reconstrói um jogo gravado (mesmo mundo, mesmas semanas e comandos). */
  async carregar(r: RegistoJogo, prog: Progresso = () => {}) {
    await this.novoMundo(r.semente, (e, f, t) => prog(e, f * 0.3, t));
    this.comecar(r.clube, r.perfil);
    const n = r.semanas;
    const cmds = r.comandos ?? [];
    let q = 0;
    const aplicarAte = (semana: number) => { while (q < cmds.length && cmds[q].semana <= semana) this.aplicar(cmds[q++].dados); };
    for (let k = 0; k < n; k++) {
      aplicarAte(k);
      this.avancar();
      if (k % 4 === 0 || k === n - 1) prog('reconstrucao', 0.3 + (0.7 * (k + 1)) / n, `A reconstruir a carreira: semana ${k + 1} de ${n}`);
    }
    aplicarAte(n);
    this.registo = { ...r, semanas: n, comandos: [...cmds] };
    prog('pronto', 1, 'Pronto');
  }

  /** Temporada (calendário) do clube do utilizador. */
  private temporada(): Temporada | null {
    const w = this.w!, sim = this.sim!;
    const l = w.liga[this.clube];
    const grupo = l >= 0 ? w.ligas[l].regras.epoca.calendario : 'ago_mai';
    return sim.temporadas.get(grupo) ?? null;
  }

  private jogoResumo(t: Temporada, j: JogoR, c = this.clube): JogoResumo {
    const w = this.w!, emCasa = j.casa === c;
    const dia = j.diaAbs ?? t.base + j.semana * 7 + j.dia;
    const r = j.r;
    const gc = r ? (emCasa ? r.gc : r.gf) : null, gf = r ? (emCasa ? r.gf : r.gc) : null;
    const nomeComp = t.comps.find((x) => x.id === j.comp)?.nome ?? j.comp;
    const adv = emCasa ? j.fora : j.casa;
    return { dia, data: dataPt(dia), comp: nomeComp, casa: w.clubes[j.casa].nome, fora: w.clubes[j.fora].nome, emCasa, gc, gf,
      coresCasa: w.clubes[j.casa].cores, coresFora: w.clubes[j.fora].cores, adversario: w.clubes[adv].nome, coresAdv: w.clubes[adv].cores,
      resultado: r ? (gc! > gf! ? 'V' : gc! < gf! ? 'D' : r.pen ? ((emCasa ? r.pen[0] > r.pen[1] : r.pen[1] > r.pen[0]) ? 'V' : 'D') : 'E') : null };
  }

  /** Resumo para a barra de topo e o ecrã de Início. */
  resumo(): Resumo {
    const w = this.w!, sim = this.sim!, c = this.clube;
    const t = this.temporada();
    const l = w.liga[c];
    const ligaId = l >= 0 ? w.ligas[l].regras.id : '';
    const comp = t?.ligas.get(ligaId);
    const tab = comp ? comp.classificacaoActual() : [];
    const pos = tab.findIndex((x) => x.clube === c);
    const meus: JogoR[] = [];
    let proximo: JogoR | null = null;
    if (t) {
      for (const j of t.jogos) if (j.casa === c || j.fora === c) meus.push(j);
      for (let s = t.semana; s < t.semana + 12 && !proximo; s++) {
        for (const cp of t.comps) for (const j of cp.jogosDaSemana(s)) if ((j.casa === c || j.fora === c) && !j.r && (!proximo || j.semana * 7 + j.dia < proximo.semana * 7 + proximo.dia)) proximo = j;
      }
    }
    const zonas = l >= 0 ? zonasLiga(w, l) : [];
    const forma = (k: number) => (t ? t.jogos.filter((j) => j.r && (j.casa === k || j.fora === k)).slice(-5).map((j) => this.jogoResumo(t, j, k).resultado ?? '') : []);
    const prox = t && proximo ? this.jogoResumo(t, proximo) : null;
    const st = w.jogadores!, dia = sim.segunda;
    const plantel = (w.plantel[c] ?? []).filter((j) => st.clube[j] === c);
    const top = (f: (j: number) => number) => [...plantel].sort((a, b) => f(b) - f(a) || st.ovrNat(b) - st.ovrNat(a)).slice(0, 5)
      .map((j) => ({ jogador: st.ids[j], nome: st.nomes[j], pos: POSICOES[st.posNat[j]], v: f(j) }));
    const e = w.economia, s = e?.clubes;
    const saude = e ? e.calcularSaude(c) : 0;
    const receita = e ? e.estimarReceita(c) : 0;
    const massa = e ? e.massaSalarialReal(c) : 0;
    const fimEpoca = t ? t.base + 52 * 7 : dia + 365;
    const tarefas: Resumo['tarefas'] = [];
    for (const j of plantel) {
      if (st.fimContrato[j] > 0 && st.fimContrato[j] <= fimEpoca) tarefas.push({ tipo: 'contrato', texto: `${st.nomes[j]}: contrato acaba no fim da época`, detalhe: 'Renovações chegam no Escritório (A4)', jogador: st.ids[j] });
    }
    for (const j of plantel) if (st.indisponivelAte[j] > dia) tarefas.push({ tipo: 'lesao', texto: `${st.nomes[j]} lesionado`, detalhe: `${st.indisponivelAte[j] - dia} dias`, jogador: st.ids[j] });
    const m = w.motor;
    if (m?.sugestao) tarefas.unshift({ tipo: 'sugestao', texto: 'Sugestão enviada ao treinador', detalhe: 'decide no próximo jogo' });
    else if (m?.ultimaDecisao) tarefas.unshift({ tipo: 'treinador', texto: `O treinador ${({ aceita: 'aceitou', parcial: 'aceitou em parte', ignora: 'ignorou' } as const)[m.ultimaDecisao.decisao]} a tua última sugestão`, detalhe: `${m.ultimaDecisao.aplicadas} de ${m.ultimaDecisao.pedidas} alterações` });
    return {
      data: dataPt(sim.segunda), dia: sim.segunda, epoca: t ? rotuloEpoca({ grupo: t.grupo, epoca: t.ano }) : '',
      clube: { id: w.clubes[c].id, nome: w.clubes[c].nome, cores: w.clubes[c].cores, liga: ligaId, ligaNome: l >= 0 ? w.ligas[l].regras.nome : '', caixa: w.economia ? Math.round(w.economia.clubes.caixa[c]) : null, reputacao: Math.round(w.reputacao[c]) },
      posicao: pos >= 0 ? pos + 1 : null,
      tabela: tab.map((x, i) => ({ pos: i + 1, clube: w.clubes[x.clube].nome, cores: w.clubes[x.clube].cores, meu: x.clube === c, j: x.pj, v: x.v, e: x.e, d: x.d, dg: x.gm - x.gs, pts: x.pts, zona: zonas[i] ?? '' })),
      proximo: prox && proximo ? { ...prox, dias: prox.dia - dia, formaMeu: forma(c), formaAdv: forma(proximo.casa === c ? proximo.fora : proximo.casa) } : null,
      objectivo: e?.objectivos[c] ?? '',
      financas: e && s ? { estado: saude === 2 ? 'Crise' : saude === 1 ? 'Apertada' : 'Saudável', caixa: Math.round(s.caixa[c]), transferencias: Math.round(s.orcTransferencias[c]), massa: Math.round(massa), orcSalarios: Math.round(s.orcSalarios[c]), divida: Math.round(s.divida(c)), receita: Math.round(receita), fairPlay: receita > 0 ? Math.round((massa / receita / e.limiteFairPlay(c)) * 100) : null } : null,
      destaques: { jogos: top((j) => st.eJogos[j]), golos: top((j) => st.eGolos[j]), assist: top((j) => st.eAssist[j]) },
      tarefas,
      ultimos: t ? meus.filter((j) => j.r).slice(-5).reverse().map((j) => this.jogoResumo(t, j)) : [],
      semanas: this.registo?.semanas ?? 0,
    };
  }
}
