// Sessão de jogo (corre no Web Worker): o mundo, o simulador e o clube do utilizador. A interface só lê vistas e envia
// comandos. A sessão guarda um registo (semente, clube, perfil, semanas avançadas e comandos) que chega para a reconstruir:
// o motor é determinístico, por isso carregar uma gravação = gerar o mesmo mundo e repetir as mesmas semanas.
import { configJogo2D, jogarResumir, type Resumo2D } from '../match/jogo2d.ts';
import { JOGO_2D } from '../config/match2d/fase6.ts';
import type { Config2D } from '../engine/match2d/Motor2D.ts';
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
import { vistaMercado, vistaNegociacao, vistaScouting, vistaAcademia, type VistaMercado, type VistaNegociacao, type VistaScouting, type VistaAcademia } from './vistasA3.ts';
import { vistaStaff, vistaFinancas, vistaInfra, vistaCompeticoes, vistaEscritorio, type VistaStaff, type VistaFinancas, type VistaInfra, type VistaCompeticoes, type VistaEscritorio } from './vistasA4.ts';
import { MercadoUtilizador, type TipoNeg, type PropostaJogador } from '../mercado/mercadoUtilizador.ts';
import type { PosicaoMissao } from '../scouting/missoesJovens.ts';
import { SCOUTS } from '../config/scouting.ts';
import { TIPOS_INFRA } from '../config/infraestruturas.ts';
import { N_INFRA } from '../club/store.ts';
import { custoObra } from '../club/controlador.ts';
import { indiceRiqueza } from '../economia/contratos.ts';
import { Rng } from '../core/rng.ts';
import { STAFF_UTILIZADOR, BILHETE_UTILIZADOR, OBRAS_UTILIZADOR } from '../config/negociacaoUtilizador.ts';
import { FORMACAO_POR_ID, type Instrucoes } from '../config/tacticas.ts';
import { vistaPlantel, vistaJogador, vistaTactica, zonasLiga, escalaoDe, type VistaPlantel, type VistaJogador, type VistaTactica } from './vistas.ts';

export type Etapa = 'dados' | 'mundo' | 'motor' | 'reconstrucao' | 'pronto';
export type Progresso = (etapa: Etapa, fraccao: number, texto: string) => void;

/** Comandos do utilizador (A2). Os jogadores vão pelo id (estável entre reconstruções). */
export type Comando =
  | { tipo: 'sugerir'; formacao?: string; instrucoes?: Partial<Instrucoes>; onze?: string[] }
  | { tipo: 'cancelarSugestao' }
  | { tipo: 'promover'; jogador: string }
  // A3: mercado
  | { tipo: 'negociar'; jogador: string; negocio: TipoNeg }
  | { tipo: 'propostaClube'; id: number; valor: number; vendaFutura: number; parcelas: string; troca: string | null }
  | { tipo: 'propostaEmprestimo'; id: number; salario: number; opcao: number }
  | { tipo: 'propostaJogador'; id: number; proposta: PropostaJogador }
  | { tipo: 'desistir'; id: number }
  | { tipo: 'responderOferta'; negocio: number; resposta: 'aceitar' | 'recusar' | { contra: number } }
  | { tipo: 'listar'; jogador: string; listado: boolean }
  | { tipo: 'shortlist'; jogador: string; marcar: boolean }
  // A3: scouting e academia
  | { tipo: 'atribuirScouts'; ligas: string[] }
  | { tipo: 'missao'; pais: string; posicao: PosicaoMissao; semanas: number }
  | { tipo: 'contratarJovem'; jogador: string }
  | { tipo: 'excedente'; libertar: string[] }
  | { tipo: 'libertarJovem'; jogador: string }
  // A4: staff, treinador, finanças, infraestruturas
  | { tipo: 'contratarStaff'; membro: string }
  | { tipo: 'despedirStaff'; membro: string }
  | { tipo: 'despedirTreinador'; motivo: 'resultados' | 'mutuo_acordo'; novo: string | null }
  | { tipo: 'obra'; infra: (typeof TIPOS_INFRA)[number] }
  | { tipo: 'orcamentos'; transferencias: number }
  | { tipo: 'precoBilhete'; factor: number };

/** Carreira do Presidente (acumulada nas semanas jogadas; reconstrói-se com a gravação). */
export interface Carreira {
  inicio: number; jogos: number; v: number; e: number; d: number; gm: number; gs: number;
  maiorVitoria: { texto: string; dif: number } | null;
  melhorMarcador: { nome: string; golos: number; jogos: number; epoca: string } | null;
}
/** Comando guardado no registo: aplica-se antes de simular a semana `semana` (0 = antes da primeira). */
export interface ComandoRegistado { semana: number; tipo: Comando['tipo']; dados: Comando }
export type PedidoVista = { ecra: 'plantel' } | { ecra: 'jogador'; jogador: string } | { ecra: 'tactica'; formacao?: string } | { ecra: 'mercado' } | { ecra: 'negociacao'; id: number } | { ecra: 'scouting' } | { ecra: 'academia' }
  | { ecra: 'staff' } | { ecra: 'financas' } | { ecra: 'infra' } | { ecra: 'competicoes'; comp?: string } | { ecra: 'escritorio' } | { ecra: 'jogo' };
export type Vista = { ecra: 'plantel'; dados: VistaPlantel } | { ecra: 'jogador'; dados: VistaJogador } | { ecra: 'tactica'; dados: VistaTactica }
  | { ecra: 'mercado'; dados: VistaMercado } | { ecra: 'negociacao'; dados: VistaNegociacao } | { ecra: 'scouting'; dados: VistaScouting } | { ecra: 'academia'; dados: VistaAcademia }
  | { ecra: 'staff'; dados: VistaStaff } | { ecra: 'financas'; dados: VistaFinancas } | { ecra: 'infra'; dados: VistaInfra } | { ecra: 'competicoes'; dados: VistaCompeticoes } | { ecra: 'escritorio'; dados: VistaEscritorio } | { ecra: 'jogo'; dados: VistaJogo2D | null };

/** Tudo o que é preciso para reconstruir um jogo. */
export interface RegistoJogo {
  versaoMotor: string;
  semente: number;
  clube: string; // id do clube (estável entre gerações do mesmo mundo)
  perfil: { nome: string; perfilDono: string };
  semanas: number;
  comandos: ComandoRegistado[];
  /** Jogos do utilizador jogados no motor 2D (Fase 6), pela chave do jogo: ao carregar não se voltam a simular. */
  jogos2d?: Record<string, Resumo2D>;
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
  /** Último jogo do utilizador jogado no motor 2D (para abrir o ecrã do jogo). */
  jogo2d: { chave: string; texto: string } | null;
}

/** O jogo do utilizador para o ecrã do jogo (Fase 6): a configuração exacta do motor 2D (determinística) e o resultado. */
export interface VistaJogo2D { chave: string; config: Config2D; nomes: [string, string]; cores: [[string, string], [string, string]]; resultado: [number, number]; data: string }

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
    this.carreira = null;
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
    if (w.mercado) w.mercado.util = new MercadoUtilizador(w, w.mercado, c);
    this.registo = { ...this.registo!, clube: clubeId, perfil, jogos2d: {} };
    // Fase 6 do motor 2D: os jogos do clube do utilizador jogam-se no modo detalhado. O resumo fica na gravação (carregar
    // não volta a simular) e a configuração do último jogo fica para o ecrã do jogo o mostrar por lances.
    if (w.motor && JOGO_2D.activo) w.motor.jogo2d = (casa, fora, neutro, dia, chave) => {
      const config = configJogo2D(w, casa, fora, neutro, dia, `${w.semente}|${chave}`);
      const guardados = (this.registo!.jogos2d ??= {});
      const resumo = guardados[chave] ?? jogarResumir(config);
      guardados[chave] = resumo;
      this.ultimoJogo2D = { chave, config, resumo, casa: casa.clube, fora: fora.clube, dia };
      return resumo;
    };
  }

  /** O último jogo do utilizador jogado no motor 2D (para o ecrã do jogo). */
  ultimoJogo2D: { chave: string; config: Config2D; resumo: Resumo2D; casa: number; fora: number; dia: number } | null = null;

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
      case 'negociar': {
        const j = st.idx(cmd.jogador);
        if (j === undefined) throw new Error('Jogador desconhecido.');
        this.util().abrir(j, cmd.negocio, dia);
        break;
      }
      case 'propostaClube': {
        const t = cmd.troca ? idx(cmd.troca) : null;
        this.util().propostaClube(cmd.id, { valor: cmd.valor, vendaFutura: cmd.vendaFutura, parcelas: cmd.parcelas, troca: t }, dia);
        break;
      }
      case 'propostaEmprestimo': this.util().propostaEmprestimo(cmd.id, { salario: cmd.salario, opcao: cmd.opcao }, dia); break;
      case 'propostaJogador': this.util().propostaJogador(cmd.id, cmd.proposta, dia); break;
      case 'desistir': this.util().desistir(cmd.id, dia); break;
      case 'responderOferta': this.util().responder(cmd.negocio, cmd.resposta); break;
      case 'listar': this.util().listar(idx(cmd.jogador), cmd.listado); break;
      case 'shortlist': {
        const j = st.idx(cmd.jogador);
        if (j === undefined) throw new Error('Jogador desconhecido.');
        this.util().marcar(j, cmd.marcar);
        break;
      }
      case 'atribuirScouts': {
        const sc = w.mercado!.scouting;
        const max = (w.economia?.staff.porClube[c] ?? []).filter((x) => x.cargo === 'olheiro').length * SCOUTS.ligas_por_scout;
        const ligas = cmd.ligas.map((id) => w.ligas.findIndex((l) => l.regras.id === id));
        if (ligas.some((l) => l < 0)) throw new Error('Liga desconhecida.');
        if (ligas.length > max) throw new Error(`Os teus olheiros cobrem no máximo ${max} liga(s).`);
        sc.atribuicao[c] = ligas;
        sc.fixas.add(c);
        break;
      }
      case 'missao': {
        const r = w.academia!.missoes.enviar(c, { pais: cmd.pais, posicao: cmd.posicao, semanas: cmd.semanas }, dia);
        if (typeof r === 'string') throw new Error(r.charAt(0).toUpperCase() + r.slice(1) + '.');
        break;
      }
      case 'contratarJovem': {
        const j = st.idx(cmd.jogador);
        if (j === undefined) throw new Error('Jogador desconhecido.');
        const r = w.academia!.missoes.contratar(c, j, dia);
        if (typeof r === 'string') throw new Error(r.charAt(0).toUpperCase() + r.slice(1) + '.');
        break;
      }
      case 'excedente': {
        const ac = w.academia!;
        if (!ac.excedente.has(c)) throw new Error('Não há decisão de excedente pendente.');
        const lib = cmd.libertar.map(idx);
        if (ac.sub18[c].length - lib.length > 30) throw new Error('O Sub-18 continua acima do máximo (30).');
        ac.decidirExcedente(c, dia, lib);
        break;
      }
      case 'contratarStaff': {
        const e = w.economia!, sm = e.staff;
        const mb = sm.livres.find((x) => x.id === cmd.membro);
        if (!mb) throw new Error('Esse membro já não está livre.');
        const ocupados = (sm.porClube[c] ?? []).filter((x) => x.cargo === mb.cargo).length;
        const max = sm.quantos(mb.cargo, w.reputacao[c], e.nivel(c, 'recrutamento'));
        if (ocupados >= max) throw new Error(`Já tens ${max} no cargo: despede primeiro.`);
        sm.livres = sm.livres.filter((x) => x !== mb);
        const sal = sm.salario(c, mb.cargo, mb.nivel, e.clubes.receitaPrevista[c]);
        sm.porClube[c].push({ ...mb, clube: c, salario: sal, contratoFim: dia + 3 * 365 });
        e.registar(dia, c, 'staff', `contrata ${mb.nome} (${mb.cargo}, nível ${mb.nivel})`, sal);
        break;
      }
      case 'despedirStaff': {
        const e = w.economia!, sm = e.staff;
        const mb = (sm.porClube[c] ?? []).find((x) => x.id === cmd.membro);
        if (!mb) throw new Error('Esse membro não é do teu staff.');
        const custo = Math.max(0, (mb.contratoFim - dia) / 365) * mb.salario * STAFF_UTILIZADOR.indemnizacao;
        if (custo > 0) e.clubes.lancar(c, 'indemnizacoes', custo);
        sm.porClube[c] = sm.porClube[c].filter((x) => x !== mb);
        sm.livres.push({ ...mb, clube: -1, salario: 0 });
        e.registar(dia, c, 'staff', `despede ${mb.nome} (${mb.cargo}): indemnização de ${Math.round(custo)} €`, custo);
        break;
      }
      case 'despedirTreinador': {
        const e = w.economia!, mt = e.mercadoT;
        const novo = cmd.novo ? mt.livres.find((t) => t.id === cmd.novo) : undefined;
        if (cmd.novo && !novo) throw new Error('Esse treinador já não está livre.');
        if (novo && mt.probAceitar(novo, c) < 0.5) throw new Error(`${novo.nome} não aceita vir para o clube.`);
        mt.despedir(c, dia, cmd.motivo, Rng.de(w.semente, 'despedir-utilizador', dia, w.clubes[c].id), 'decisão do presidente', novo);
        break;
      }
      case 'obra': {
        const e = w.economia!, s = e.clubes, k = TIPOS_INFRA.indexOf(cmd.infra);
        if (k < 0) throw new Error('Infraestrutura desconhecida.');
        const nivel = s.infra[c * N_INFRA + k];
        if (nivel >= 10) throw new Error('Já está no nível máximo.');
        if (s.obraFim[c * N_INFRA + k] > dia) throw new Error('Já há uma obra em curso nesta infraestrutura.');
        const { custo } = custoObra(cmd.infra, nivel, indiceRiqueza(w, c));
        if (s.caixa[c] < OBRAS_UTILIZADOR.caixa_minima * custo) throw new Error('Não há caixa para arrancar esta obra.');
        e.iniciarObra(c, cmd.infra, dia);
        break;
      }
      case 'orcamentos': {
        const s = w.economia!.clubes;
        const total = s.orcSalarios[c] + s.orcTransferencias[c];
        const t = Math.round(cmd.transferencias);
        if (!(t >= 0 && t <= total)) throw new Error('Valor fora do orçamento total.');
        s.orcTransferencias[c] = t;
        s.orcSalarios[c] = total - t;
        break;
      }
      case 'precoBilhete': {
        const B = BILHETE_UTILIZADOR;
        if (!(cmd.factor >= B.minimo - 1e-9 && cmd.factor <= B.maximo + 1e-9)) throw new Error('Preço fora dos limites.');
        w.economia!.precoBilhete.set(c, Math.round(cmd.factor * 100) / 100);
        break;
      }
      case 'libertarJovem': {
        const j = idx(cmd.jogador), ac = w.academia!;
        if (!ac.escalao[j]) throw new Error('Só se libertam jogadores do Sub-18 e do Sub-21 aqui.');
        ac.libertar(j, dia);
        break;
      }
      case 'promover': {
        const j = idx(cmd.jogador), ac = w.academia!, e = escalaoDe(w, j);
        if (e === 'sub21') ac.promover(j, dia, false, 'utilizador');
        else if (e === 'sub18') ac.subirAoSub21(j);
        else throw new Error('Já está na equipa principal.');
        break;
      }
    }
  }

  private util(): MercadoUtilizador {
    const u = this.w!.mercado?.util;
    if (!u) throw new Error('Mercado indisponível.');
    return u;
  }

  /** Vistas dos ecrãs (só leitura). */
  vista(p: PedidoVista): Vista {
    const w = this.w!, dia = this.sim!.segunda;
    if (p.ecra === 'plantel') return { ecra: 'plantel', dados: vistaPlantel(w, this.clube, dia) };
    if (p.ecra === 'staff') return { ecra: 'staff', dados: vistaStaff(w, this.clube, dia) };
    if (p.ecra === 'financas') { const t = this.temporada(); return { ecra: 'financas', dados: vistaFinancas(w, this.clube, dia, t ? rotuloEpoca({ grupo: t.grupo, epoca: t.ano }) : '') }; }
    if (p.ecra === 'infra') return { ecra: 'infra', dados: vistaInfra(w, this.clube, dia) };
    if (p.ecra === 'competicoes') return { ecra: 'competicoes', dados: vistaCompeticoes(w, this.clube, this.temporada(), this.sim!.historico, p.comp) };
    if (p.ecra === 'jogo') return { ecra: 'jogo', dados: this.vistaJogo2D() };
    if (p.ecra === 'escritorio') return { ecra: 'escritorio', dados: vistaEscritorio(w, this.clube, dia, this.registo?.perfil.nome ?? '', this.carreira, this.sim!.historico) };
    if (p.ecra === 'mercado') return { ecra: 'mercado', dados: vistaMercado(w, this.clube, dia) };
    if (p.ecra === 'negociacao') return { ecra: 'negociacao', dados: vistaNegociacao(w, this.clube, p.id, dia) };
    if (p.ecra === 'scouting') return { ecra: 'scouting', dados: vistaScouting(w, this.clube, dia) };
    if (p.ecra === 'academia') return { ecra: 'academia', dados: vistaAcademia(w, this.clube, dia) };
    if (p.ecra === 'tactica') return { ecra: 'tactica', dados: vistaTactica(w, this.clube, dia, p.formacao) };
    const j = w.jogadores!.idx(p.jogador);
    if (j === undefined) throw new Error('Jogador desconhecido.');
    return { ecra: 'jogador', dados: vistaJogador(w, j, dia, this.clube) };
  }

  /** Avança uma semana. */
  carreira: Carreira | null = null;

  avancar(): JogoR[] {
    const t = this.temporada();
    const ep = t ? rotuloEpoca({ grupo: t.grupo, epoca: t.ano }) : '';
    // Melhor marcador da época (antes de o fecho da época zerar as estatísticas).
    this.notarMarcador(ep);
    const jogos = this.sim!.simularSemana();
    this.registo!.semanas++;
    const c = this.clube, w = this.w!;
    const k = (this.carreira ??= { inicio: this.sim!.segunda - 7, jogos: 0, v: 0, e: 0, d: 0, gm: 0, gs: 0, maiorVitoria: null, melhorMarcador: null });
    for (const j of jogos) {
      if (!j.r || (j.casa !== c && j.fora !== c)) continue;
      const casa = j.casa === c, gm = casa ? j.r.gc : j.r.gf, gs = casa ? j.r.gf : j.r.gc;
      k.jogos++; k.gm += gm; k.gs += gs;
      if (gm > gs) k.v++; else if (gm < gs) k.d++; else k.e++;
      if (gm - gs > (k.maiorVitoria?.dif ?? 0)) k.maiorVitoria = { dif: gm - gs, texto: `${w.clubes[j.casa].nome} ${j.r.gc}–${j.r.gf} ${w.clubes[j.fora].nome}` };
    }
    return jogos;
  }

  private notarMarcador(epoca: string) {
    if (!this.carreira || !this.w) return;
    const st = this.w.jogadores!, c = this.clube;
    for (const j of this.w.plantel[c] ?? []) {
      if (st.clube[j] !== c) continue;
      const m = this.carreira.melhorMarcador;
      if (st.eGolos[j] > (m?.golos ?? 0)) this.carreira.melhorMarcador = { nome: st.nomes[j], golos: st.eGolos[j], jogos: st.eJogos[j], epoca };
    }
  }

  /** Reconstrói um jogo gravado (mesmo mundo, mesmas semanas e comandos). */
  async carregar(r: RegistoJogo, prog: Progresso = () => {}) {
    await this.novoMundo(r.semente, (e, f, t) => prog(e, f * 0.3, t));
    this.comecar(r.clube, r.perfil);
    this.registo!.jogos2d = { ...(r.jogos2d ?? {}) };
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
    this.registo = { ...r, semanas: n, comandos: [...cmds], jogos2d: this.registo!.jogos2d };
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
        for (const cp of t.comps) for (const j of cp.jogosPrevistos?.(s) ?? []) if ((j.casa === c || j.fora === c) && !j.r && (!proximo || j.semana * 7 + j.dia < proximo.semana * 7 + proximo.dia)) proximo = j;
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
      jogo2d: this.ultimoJogo2D ? { chave: this.ultimoJogo2D.chave, texto: `${w.clubes[this.ultimoJogo2D.casa].nome} ${this.ultimoJogo2D.resumo.golos[0]}–${this.ultimoJogo2D.resumo.golos[1]} ${w.clubes[this.ultimoJogo2D.fora].nome}` } : null,
    };
  }

  /** O último jogo do utilizador no motor 2D (ou null). */
  vistaJogo2D(): VistaJogo2D | null {
    const u = this.ultimoJogo2D, w = this.w;
    if (!u || !w) return null;
    const cor = (c: number) => w.clubes[c].cores as [string, string];
    return { chave: u.chave, config: u.config, nomes: [w.clubes[u.casa].nome, w.clubes[u.fora].nome], cores: [cor(u.casa), cor(u.fora)], resultado: u.resumo.golos, data: dataPt(u.dia) };
  }
}
