// Prompt 10, Bloco 4: playlist de música de gestão — ordem aleatória sem repetir até todas tocarem, pausa de 5–15 s
// entre faixas (o crossfade em si já é o `AudioManager` a trocar de som no canal "música"). Uma só faixa: toca,
// acaba, a pausa e a mesma faixa volta a tocar (nunca pára de vez); nenhuma faixa: nunca chama `tocarFaixaMusica`
// (silêncio). `aleatorio` é injectável, para o baralhar ser determinístico nos testes.
export interface TocadorMusica { tocarFaixaMusica(id: string, aoAcabar: () => void): void }
export interface OpcoesPlaylist { pausaMinMs: number; pausaMaxMs: number; aleatorio: () => number }

export const OPCOES_PLAYLIST_DEFEITO: OpcoesPlaylist = { pausaMinMs: 5000, pausaMaxMs: 15000, aleatorio: Math.random };

/** Baralha `faixas` (Fisher–Yates) com o gerador `aleatorio` (0–1); puro, não muda `faixas`. */
export function embaralhar<T>(faixas: readonly T[], aleatorio: () => number): T[] {
  const a = [...faixas];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class PlaylistGestao {
  private ordem: string[] = [];
  private pos = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activo = false;

  constructor(
    private tocador: TocadorMusica,
    private faixas: readonly string[],
    private op: OpcoesPlaylist = OPCOES_PLAYLIST_DEFEITO,
  ) {}

  /** Começa a tocar (ou continua, se já estava activa — idempotente). Sem faixas: não faz nada (silêncio). */
  iniciar() {
    if (this.activo || !this.faixas.length) return;
    this.activo = true;
    this.ordem = embaralhar(this.faixas, this.op.aleatorio);
    this.pos = 0;
    this.tocarProxima();
  }

  /** Pára a playlist (ex.: ao sair do jogo). `iniciar()` depois disto recomeça com uma ordem nova. */
  parar() {
    this.activo = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  get estaActiva() { return this.activo; }

  private tocarProxima() {
    if (!this.activo) return;
    if (this.pos >= this.ordem.length) { this.ordem = embaralhar(this.faixas, this.op.aleatorio); this.pos = 0; }
    const id = this.ordem[this.pos++];
    this.tocador.tocarFaixaMusica(id, () => {
      if (!this.activo) return;
      const pausa = this.op.pausaMinMs + this.op.aleatorio() * (this.op.pausaMaxMs - this.op.pausaMinMs);
      this.timer = setTimeout(() => this.tocarProxima(), pausa);
    });
  }
}
