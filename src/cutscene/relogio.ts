// Prompt 11, Bloco 1: relógio mestre. Usa o tempo do áudio da cutscene (AudioManager.tempoCanal('cutscene')) quando
// há som a tocar; `performance.now()` caso contrário — sem som, a cutscene corre à mesma, com a mesma duração.
export interface FonteTempo { tempoCanal(canal: 'cutscene'): number | null }

export class Relogio {
  private inicioPerf = 0;

  constructor(private fonte: FonteTempo | null) {}

  iniciar() { this.inicioPerf = performance.now(); }

  /** Segundos desde o início. */
  t(): number {
    const doAudio = this.fonte?.tempoCanal('cutscene');
    if (doAudio !== null && doAudio !== undefined && doAudio >= 0) return doAudio;
    return (performance.now() - this.inicioPerf) / 1000;
  }
}
