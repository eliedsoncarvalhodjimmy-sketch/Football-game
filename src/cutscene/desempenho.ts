// Prompt 11, Bloco 6: decide quando activar o modo leve (sem partículas, feixes de luz nem brilhos — ver
// `ContextoCena.modoLeve`), a partir dos intervalos entre frames. Puro: só números, nada de requestAnimationFrame
// nem DOM — o motor (`motor.ts`) é quem lhe dá os tempos a sério, frame a frame.
export interface OpcoesDesempenho {
  /** Fps médio abaixo do qual activa o modo leve (Bloco 6: alvo 60 fps, modo leve abaixo de 40). */
  limiteFps: number;
  /** Quantos frames seguidos entram na média — evita reagir a um único soluço (ex.: um frame a carregar algo). */
  janela: number;
  /** Segundos de arranque a ignorar: os primeiros frames são sempre mais lentos (primeiras imagens a desenhar). */
  arranqueS: number;
}

export const DESEMPENHO_DEFEITO: OpcoesDesempenho = { limiteFps: 40, janela: 20, arranqueS: 1 };

/** Mede o desempenho frame a frame e decide, uma vez por cutscene, se liga o modo leve. Nunca volta a desligá-lo
 *  (evita alternar visual a meio) — uma vez fraco, fica leve até ao fim. */
export class MedidorDesempenho {
  private leve = false;
  private janela: number[] = [];
  private somaMs = 0;
  private fpsMedioAtual: number | null = null;

  constructor(private op: OpcoesDesempenho = DESEMPENHO_DEFEITO) {}

  /** Chama-se uma vez por frame, com o tempo desde o início da cutscene (`t`, segundos) e o intervalo desde o
   *  frame anterior (`deltaMs`). Devolve se o modo leve está (ou passou a estar) activo. */
  registar(t: number, deltaMs: number): boolean {
    if (this.leve || t < this.op.arranqueS || deltaMs <= 0) return this.leve;
    this.janela.push(deltaMs);
    this.somaMs += deltaMs;
    if (this.janela.length > this.op.janela) this.somaMs -= this.janela.shift()!;
    if (this.janela.length === this.op.janela) {
      this.fpsMedioAtual = 1000 / (this.somaMs / this.janela.length);
      if (this.fpsMedioAtual < this.op.limiteFps) this.leve = true;
    }
    return this.leve;
  }

  get modoLeve() { return this.leve; }
  /** Último fps médio calculado (janela cheia); `null` antes disso (poucos frames, ou ainda no arranque). */
  get fpsMedio() { return this.fpsMedioAtual; }
}
