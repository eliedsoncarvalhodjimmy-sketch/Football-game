// Prompt 11, Bloco 1: motor da cutscene — relógio, ciclo de desenho num único canvas, saltar, movimento reduzido.
// Puro: sem DOM próprio (recebe o <canvas> já criado) e sem Web Audio (só a interface `FonteTempo`, do relógio).
import { CUTSCENE } from '../config/cutscene.ts';
import { Relogio, type FonteTempo } from './relogio.ts';
import { MedidorDesempenho, DESEMPENHO_DEFEITO, type OpcoesDesempenho } from './desempenho.ts';
import type { ContextoCena, DadosCutscene, FuncaoCena, LinhaTempo } from './tipos.ts';

export interface OpcoesCutscene {
  canvas: HTMLCanvasElement;
  tl: LinhaTempo;
  dados: DadosCutscene;
  desenhar: FuncaoCena;
  /** Fonte do relógio (o AudioManager, se a cutscene tiver som a tocar); `null` corre sempre por `performance.now()`. */
  fonteTempo?: FonteTempo | null;
  /** Chamado uma vez, ao terminar (naturalmente ou por ter sido saltada). */
  aoTerminar: () => void;
  /** `true` força o modo de movimento reduzido (testes); por omissão lê `prefers-reduced-motion`. */
  reduzidoForcado?: boolean;
  /** Prompt 11, Bloco 6: afina o medidor de desempenho (testes); por omissão, `DESEMPENHO_DEFEITO`. */
  desempenho?: OpcoesDesempenho;
}

export class Cutscene {
  private ctx: CanvasRenderingContext2D;
  private relogio: Relogio;
  private a = 0; // frame do requestAnimationFrame, para cancelar
  private terminada = false;
  private saltando = false;
  private inicioSalto = 0;
  private podeMostrarSaltar = false;
  private aoMudarSaltar?: (pode: boolean) => void;
  private medidor: MedidorDesempenho;
  private ultimoFrameMs: number | null = null;
  readonly reduzido: boolean;

  constructor(private op: OpcoesCutscene) {
    const c = op.canvas.getContext('2d');
    if (!c) throw new Error('canvas 2D indisponível');
    this.ctx = c;
    this.relogio = new Relogio(op.fonteTempo ?? null);
    this.reduzido = op.reduzidoForcado ?? (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.medidor = new MedidorDesempenho(op.desempenho ?? DESEMPENHO_DEFEITO);
  }

  /** Fps médio mais recente (janela cheia); `null` no arranque ou com poucos frames (Bloco 6: para o relatório). */
  fpsMedio() { return this.medidor.fpsMedio; }

  /** Liga um aviso quando o botão de saltar pode aparecer (depois de `saltar_apos_s` ou de um toque antes disso). */
  aoPoderSaltar(f: (pode: boolean) => void) { this.aoMudarSaltar = f; }

  /** Um toque no ecrã, antes do tempo normal, já mostra o botão de saltar. */
  tocouNoEcra() { this.mostrarSaltar(); }

  private mostrarSaltar() {
    if (this.podeMostrarSaltar) return;
    this.podeMostrarSaltar = true;
    this.aoMudarSaltar?.(true);
  }

  iniciar() {
    this.relogio.iniciar();
    this.redimensionar();
    const passo = () => {
      if (this.terminada) return;
      const dur = this.reduzido ? CUTSCENE.reduzido_duracao_s : this.op.tl.dur;
      let t = this.relogio.t();
      if (this.saltando) { const k = (performance.now() - this.inicioSalto) / CUTSCENE.saltar_fade_ms; if (k >= 1) { this.terminar(); return; } }
      if (t >= dur) { this.terminar(); return; }
      if (!this.podeMostrarSaltar && t >= CUTSCENE.saltar_apos_s) this.mostrarSaltar();
      this.desenhar(t);
      this.a = requestAnimationFrame(passo);
    };
    this.a = requestAnimationFrame(passo);
  }

  /** O utilizador saltou: pára de avançar na linha de tempo e esmaece (~300 ms) antes de terminar. */
  saltar() {
    if (this.saltando || this.terminada) return;
    this.saltando = true;
    this.inicioSalto = performance.now();
  }

  private terminar() {
    if (this.terminada) return;
    this.terminada = true;
    cancelAnimationFrame(this.a);
    this.op.aoTerminar();
  }

  /** Pára tudo já (ex.: a trocar de ecrã a meio); não chama `aoTerminar` outra vez se já tinha terminado. */
  destruir() { cancelAnimationFrame(this.a); this.terminada = true; }

  redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, CUTSCENE.dpr_maximo);
    const w = this.op.canvas.clientWidth, h = this.op.canvas.clientHeight;
    this.op.canvas.width = Math.round(w * dpr);
    this.op.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private desenhar(t: number) {
    const { canvas } = this.op;
    const largura = canvas.clientWidth, altura = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, CUTSCENE.dpr_maximo);
    this.ctx.clearRect(0, 0, largura, altura);
    const opacidadeSaida = this.saltando ? Math.max(0, 1 - (performance.now() - this.inicioSalto) / CUTSCENE.saltar_fade_ms) : 1;
    const agora = performance.now();
    const jaEstavaLeve = this.medidor.modoLeve;
    const modoLeve = this.medidor.registar(t, this.ultimoFrameMs === null ? 0 : agora - this.ultimoFrameMs);
    this.ultimoFrameMs = agora;
    if (modoLeve && !jaEstavaLeve) console.info(`Cutscene: modo leve activado (fps médio ~${Math.round(this.medidor.fpsMedio ?? 0)}).`);
    const contexto: ContextoCena = { t, tl: this.op.tl, dados: this.op.dados, largura, altura, dpr, opacidadeSaida, modoLeve };
    this.op.desenhar(contexto, this.ctx);
    if (opacidadeSaida < 1) { this.ctx.save(); this.ctx.fillStyle = `rgba(0,0,0,${(1 - opacidadeSaida).toFixed(3)})`; this.ctx.fillRect(0, 0, largura, altura); this.ctx.restore(); }
  }
}
