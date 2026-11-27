// Prompt 10, Bloco 1: gestor de áudio único. Só ouve a interface (nunca o motor de simulação) e nunca lança erro —
// ficheiro em falta, sem suporte do navegador, ou contexto bloqueado é sempre silêncio. Web Audio API (AudioContext +
// GainNode por canal) para loops sem estalido; HTMLAudioElement só como alternativa se o Web Audio não existir. Em Node
// (testes) nenhum dos dois existe: a lógica de estado/volumes continua toda testável, a reprodução é um não-faz-nada.
import { AUDIO, CANAIS, type Canal } from '../config/audio.ts';
import { lerDefinicoes, gravarDefinicoes, type Armazenamento } from './persistencia.ts';
import { CATALOGO_VAZIO, type Catalogo, type ContextoMusica, type IdCutscene, type DefinicoesAudio } from './tipos.ts';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Um som a tocar num canal (Web Audio): a sua fonte + o seu próprio ganho, para crossfade sem tocar no ganho do canal. */
interface Som { fonte: AudioBufferSourceNode; ganho: GainNode; terminou: boolean }
/** O mesmo papel com o HTMLAudioElement como alternativa. */
interface SomHtml { el: HTMLAudioElement }

export class AudioManager {
  private def: DefinicoesAudio;
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private ganhosCanal: Partial<Record<Canal, GainNode>> = {};
  private actuais: Partial<Record<Canal, Som>> = {};
  private actuaisHtml: Partial<Record<Canal, SomHtml>> = {};
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private desbloqueado = false;
  private suspensoPeloUtilizador = false;
  /** O que está a tocar em cada canal agora (para saber se já está a tocar isto, e não voltar a trocar sem necessidade). */
  private ambienteAtual: string | null = null;
  private musicaContexto: ContextoMusica | null = null;
  private jaTocou = new Set<string>();

  constructor(
    private catalogo: Catalogo = CATALOGO_VAZIO,
    private arm?: Armazenamento,
  ) {
    this.def = lerDefinicoes(this.arm);
  }

  // ---------------------------------------------------------------- suporte e desbloqueio

  private get suportaWebAudio() {
    return typeof AudioContext !== 'undefined' || typeof (globalThis as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== 'undefined';
  }
  private get suportaHtmlAudio() {
    return typeof Audio !== 'undefined';
  }

  /** Cria o AudioContext e os ganhos, se ainda não existirem (não precisa de gesto do utilizador; só o `resume()` precisa). */
  private garantirContexto() {
    if (this.ctx || !this.suportaWebAudio) return;
    const C = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!;
    this.ctx = new C();
    this.mestre = this.ctx.createGain();
    this.mestre.connect(this.ctx.destination);
    this.aplicarVolumeGeral();
    for (const c of CANAIS) {
      const g = this.ctx.createGain();
      g.connect(this.mestre);
      g.gain.value = this.def.volume[c];
      this.ganhosCanal[c] = g;
    }
  }

  /** Só arranca depois do primeiro toque (iOS/Android). Chamar num listener de gesto do utilizador; idempotente. */
  desbloquear() {
    if (this.desbloqueado) return;
    this.garantirContexto();
    if (this.ctx && this.ctx.state !== 'running' && !this.suspensoPeloUtilizador) void this.ctx.resume().catch(() => {});
    this.desbloqueado = true;
  }

  /** Liga os listeners de desbloqueio automático (primeiro toque) e de pausa/retoma em segundo plano. Chamar uma vez,
   *  no arranque da aplicação; não faz nada sem `document` (Node, testes). */
  ligarAutomatismos() {
    if (typeof document === 'undefined') return;
    const gestos: (keyof DocumentEventMap)[] = ['pointerdown', 'touchend', 'keydown'];
    const aoPrimeiroGesto = () => { this.desbloquear(); for (const g of gestos) document.removeEventListener(g, aoPrimeiroGesto); };
    for (const g of gestos) document.addEventListener(g, aoPrimeiroGesto, { once: false, passive: true });
    document.addEventListener('visibilitychange', () => this.aoVisibilidadeMudar());
    if (typeof window !== 'undefined') window.addEventListener('pageshow', () => this.aoVisibilidadeMudar());
  }

  private aoVisibilidadeMudar() {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') { if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => {}); for (const s of Object.values(this.actuaisHtml)) s?.el.pause(); }
    else if (this.desbloqueado) { if (this.ctx && !this.suspensoPeloUtilizador) void this.ctx.resume().catch(() => {}); if (!this.def.silenciado) for (const s of Object.values(this.actuaisHtml)) void s?.el.play().catch(() => {}); }
  }

  // ---------------------------------------------------------------- volumes e definições (Definições → ecrã "Som")

  definicoesActuais(): Readonly<DefinicoesAudio> { return this.def; }

  definirVolumeCanal(canal: Canal, v: number) {
    this.def.volume[canal] = clamp01(v);
    this.ganhosCanal[canal]?.gain.setTargetAtTime(this.def.volume[canal], this.ctx?.currentTime ?? 0, 0.01);
    this.gravar();
  }

  definirVolumeGeral(v: number) {
    this.def.geral = clamp01(v);
    this.aplicarVolumeGeral();
    this.gravar();
  }

  /** Silencia/retoma tudo de uma vez, sem perder os volumes por canal (retoma com os mesmos valores de antes). */
  silenciarTudo(sim: boolean) {
    this.def.silenciado = sim;
    this.aplicarVolumeGeral();
    for (const s of Object.values(this.actuaisHtml)) { if (sim) s?.el.pause(); else if (this.desbloqueado) void s?.el.play().catch(() => {}); }
    this.gravar();
  }

  private aplicarVolumeGeral() {
    const v = this.def.silenciado ? 0 : this.def.geral;
    if (this.mestre) this.mestre.gain.setTargetAtTime(v, this.ctx?.currentTime ?? 0, 0.01);
    for (const s of Object.values(this.actuaisHtml)) if (s) s.el.volume = v;
  }

  private gravar() { gravarDefinicoes(this.def, this.arm); }

  // ---------------------------------------------------------------- catálogo e decodificação

  /** Troca o catálogo (Bloco 2: liga ao manifesto real quando carrega). */
  definirCatalogo(c: Catalogo) { this.catalogo = c; }

  private async decodificar(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    let p = this.buffers.get(url);
    if (!p) {
      p = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((b) => this.ctx!.decodeAudioData(b)).catch(() => null);
      this.buffers.set(url, p);
    }
    return p;
  }

  // ---------------------------------------------------------------- API pública (Bloco 3/4 ligam os eventos a isto)

  /** Ambiente (estádio, imprensa...). `null` desliga com crossfade. Ficheiro em falta: silêncio, sem aviso repetido. */
  definirAmbiente(id: string | null, volumeExtra = 1) {
    this.ambienteAtual = id;
    if (id === null) { this.pararCanal('ambiente'); return; }
    this.tocarNoCanal('ambiente', id, true, volumeExtra);
  }

  /** Música por contexto (menu/gestão/partida). A playlist de gestão (Bloco 4) decide a faixa; aqui só se troca de som. */
  definirMusica(contexto: ContextoMusica, idFaixa: string | null) {
    this.musicaContexto = contexto;
    if (!idFaixa) { this.pararCanal('musica'); return; }
    this.tocarNoCanal('musica', idFaixa, true);
  }

  /** Cutscene europeia (Champions ou Liga Europa, config `AUDIO.cutscenes`); música e ambiente baixam primeiro. Chama
   *  `aoAcabar` quando o áudio termina naturalmente, for cortado pelo fim da cutscene ou for saltado. Sem ficheiro
   *  (competição não mapeada ou ficheiro em falta): não toca nada e `aoAcabar` corre já, para a transição seguir normal. */
  tocarCutscene(id: IdCutscene, aoAcabar: () => void) {
    const catalogoId = AUDIO.cutscenes[id];
    const item = catalogoId ? this.catalogo.obter(catalogoId) : undefined;
    if (!item) { aoAcabar(); return; }
    this.cutsceneAoAcabar = aoAcabar;
    this.fadeCanal('musica', 0, AUDIO.fade.cutscene_entrada_ms);
    this.fadeCanal('ambiente', 0, AUDIO.fade.cutscene_entrada_ms);
    setTimeout(() => {
      this.tocarNoCanal('cutscene', catalogoId, false, 1, () => this.terminarCutscene());
    }, AUDIO.fade.cutscene_entrada_ms);
  }

  /** O utilizador saltou a cutscene (o fecho visual, de outro prompt, chama isto): corta o áudio com fade curto. */
  saltarCutscene() {
    this.fadeCanal('cutscene', 0, AUDIO.fade.cutscene_saida_ms);
    setTimeout(() => this.terminarCutscene(), AUDIO.fade.cutscene_saida_ms);
  }

  /** A cutscene visual (noutro prompt) fechou antes do áudio acabar: corta-o já, com fade curto. */
  cutsceneFechou() { this.saltarCutscene(); }

  private cutsceneAoAcabar: (() => void) | null = null;
  private terminarCutscene() {
    this.pararCanal('cutscene');
    const cb = this.cutsceneAoAcabar; this.cutsceneAoAcabar = null;
    cb?.();
  }

  /** Pára tudo imediatamente (ex.: ao sair do jogo). */
  parar() { for (const c of CANAIS) this.pararCanal(c); }

  /** Já tocou esta cutscene/evento com esta chave nesta sessão? (ex.: "champions|2027-03-10"). Marca-a como vista. */
  marcarVisto(chave: string): boolean { const visto = this.jaTocou.has(chave); this.jaTocou.add(chave); return visto; }

  // ---------------------------------------------------------------- reprodução interna por canal

  private tocarNoCanal(canal: Canal, id: string, loop: boolean, volumeExtra = 1, aoAcabar?: () => void) {
    const item = this.catalogo.obter(id);
    if (!item) return; // silêncio, sem erro
    if (this.suportaWebAudio) void this.tocarWebAudio(canal, item.ficheiro, loop, item.volumeBase * volumeExtra, aoAcabar);
    else if (this.suportaHtmlAudio) this.tocarHtmlAudio(canal, item.ficheiro, loop, item.volumeBase * volumeExtra, aoAcabar);
    // Sem Web Audio nem <audio> (ex.: Node/testes): silêncio.
  }

  private async tocarWebAudio(canal: Canal, url: string, loop: boolean, volumeExtra: number, aoAcabar?: () => void) {
    this.garantirContexto();
    const buffer = await this.decodificar(url);
    const anterior = this.actuais[canal];
    const canalGain = this.ganhosCanal[canal];
    if (!buffer || !this.ctx || !canalGain) { if (anterior) this.desligarSom(anterior, AUDIO.fade.ambiente_crossfade_ms); delete this.actuais[canal]; return; }
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = buffer; fonte.loop = loop;
    const ganho = this.ctx.createGain();
    ganho.gain.value = 0;
    fonte.connect(ganho).connect(canalGain);
    const dur = canal === 'cutscene' ? AUDIO.fade.cutscene_entrada_ms : canal === 'musica' ? AUDIO.fade.musica_crossfade_ms : AUDIO.fade.ambiente_crossfade_ms;
    const agora = this.ctx.currentTime;
    ganho.gain.linearRampToValueAtTime(volumeExtra, agora + dur / 1000);
    const som: Som = { fonte, ganho, terminou: false };
    fonte.start();
    if (!loop) fonte.onended = () => { som.terminou = true; if (this.actuais[canal] === som) delete this.actuais[canal]; aoAcabar?.(); };
    if (anterior) this.desligarSom(anterior, dur);
    this.actuais[canal] = som;
  }

  private desligarSom(s: Som, fadeMs: number) {
    if (!this.ctx) return;
    try { s.ganho.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeMs / 1000); s.fonte.stop(this.ctx.currentTime + fadeMs / 1000 + 0.02); } catch { /* já tinha acabado */ }
  }

  private tocarHtmlAudio(canal: Canal, url: string, loop: boolean, volumeExtra: number, aoAcabar?: () => void) {
    const anterior = this.actuaisHtml[canal];
    const el = new Audio(url);
    el.loop = loop;
    el.volume = (this.def.silenciado ? 0 : this.def.geral) * this.def.volume[canal] * volumeExtra;
    if (!loop) el.onended = () => { if (this.actuaisHtml[canal]?.el === el) delete this.actuaisHtml[canal]; aoAcabar?.(); };
    if (this.desbloqueado && !this.def.silenciado) void el.play().catch(() => {});
    anterior?.el.pause();
    this.actuaisHtml[canal] = { el };
  }

  private pararCanal(canal: Canal) {
    const fadeMs = canal === 'cutscene' ? AUDIO.fade.cutscene_saida_ms : canal === 'musica' ? AUDIO.fade.musica_crossfade_ms : AUDIO.fade.ambiente_crossfade_ms;
    const s = this.actuais[canal]; if (s) { this.desligarSom(s, fadeMs); delete this.actuais[canal]; }
    const h = this.actuaisHtml[canal]; if (h) { h.el.pause(); delete this.actuaisHtml[canal]; }
  }

  private fadeCanal(canal: Canal, para: number, ms: number) {
    const g = this.ganhosCanal[canal]; if (g && this.ctx) g.gain.linearRampToValueAtTime(para, this.ctx.currentTime + ms / 1000);
    const h = this.actuaisHtml[canal]; if (h) h.el.volume = para;
  }
}
