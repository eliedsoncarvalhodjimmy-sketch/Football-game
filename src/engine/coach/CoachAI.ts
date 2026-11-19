// Nível MACRO: a IA do treinador durante o jogo. Avaliada a cada 5 minutos de jogo simulado e nos eventos (golo, lesão,
// cartão, substituição). Gatilhos:
//   1. a perder por 1+ golo depois do minuto 60 → mentalidade ofensiva (e mais pressão);
//   2. jogador com condição < 60% → substituição;
//   3. jogador com amarelo → pede-lhe menos agressividade;
//   4. lesão → substituição forçada (sempre);
//   5. 15 minutos sem rematar → explorar a largura.
// Cada gatilho (excepto a lesão) activa com uma probabilidade dada pelos atributos do treinador. Os atributos do jogo
// não têm "Determinação" para treinadores: usa-se a Motivação; "Conhecimento táctico" = táctica; "Gestão de pessoas" =
// gestão. A probabilidade é determinística: semente = hash(id do treinador + minuto + gatilho).
import { TREINADOR_IA as T } from '../../config/decisao.ts';
import { aleatorio } from '../decision/rng.ts';
import type { MatchState, PlayerState, Equipa } from '../decision/types.ts';

export interface AtributosTreinadorJogo { tactica: number; gestao: number; motivacao: number }

export type DecisaoTreinador =
  | { tipo: 'mentalidade'; valor: number; motivo: string }
  | { tipo: 'pressao'; valor: number; motivo: string }
  | { tipo: 'largura'; valor: number; motivo: string }
  | { tipo: 'agressividade'; jogador: string; motivo: string }
  | { tipo: 'substituicao'; sai: string; entra: string; motivo: string };

export class CoachAI {
  substituicoes = 0;
  private ultimaAvaliacao = -1;
  constructor(public id: string, public team: Equipa, public atributos: AtributosTreinadorJogo, public banco: PlayerState[]) {}

  /** Probabilidade de activação de um gatilho (pelos atributos relevantes). */
  prob(attrs: (keyof AtributosTreinadorJogo)[]): number {
    const m = attrs.reduce((s, a) => s + this.atributos[a], 0) / attrs.length;
    return Math.max(0.05, Math.min(0.98, T.prob_base + T.prob_por_ponto * (m - 10)));
  }

  private activa(minuto: number, gatilho: string, attrs: (keyof AtributosTreinadorJogo)[]): boolean {
    return aleatorio(`${this.id}|${minuto}|${gatilho}`) < this.prob(attrs);
  }

  /** É altura de avaliar? A cada 5 minutos, ou num evento. */
  devoAvaliar(state: MatchState, evento = false): boolean {
    const bloco = Math.floor(state.minute / 5);
    if (evento) return true;
    if (bloco === this.ultimaAvaliacao) return false;
    return true;
  }

  /** Avalia os gatilhos e devolve as decisões (não as aplica). */
  avaliar(state: MatchState, evento = false): DecisaoTreinador[] {
    if (!this.devoAvaliar(state, evento)) return [];
    this.ultimaAvaliacao = Math.floor(state.minute / 5);
    const out: DecisaoTreinador[] = [];
    const min = Math.floor(state.minute), t = state.tactics[this.team];
    const meus = state.players.filter((p) => p.team === this.team && p.onPitch);
    const dif = state.score[this.team] - state.score[this.team === 0 ? 1 : 0];
    // 4. Lesão: substituição forçada.
    for (const p of meus) if (p.injured) { const e = this.suplente(p); if (e) out.push({ tipo: 'substituicao', sai: p.id, entra: e.id, motivo: 'lesão' }); }
    // 1. A perder depois do minuto 60.
    if (dif < 0 && state.minute >= T.perder_apos_min && t.mentality < 2 && this.activa(min, 'perder', ['tactica', 'motivacao'])) {
      out.push({ tipo: 'mentalidade', valor: Math.min(2, t.mentality + 1), motivo: `a perder por ${-dif} depois do minuto ${T.perder_apos_min}` });
      out.push({ tipo: 'pressao', valor: Math.min(1, t.pressing + 0.2), motivo: 'subir a pressão para recuperar a bola' });
    }
    // 2. Fadiga.
    const cansado = meus.filter((p) => p.condition < T.condicao_substituir && !p.injured).sort((a, b) => a.condition - b.condition)[0];
    if (cansado && this.activa(min, 'fadiga', ['gestao'])) { const e = this.suplente(cansado); if (e) out.push({ tipo: 'substituicao', sai: cansado.id, entra: e.id, motivo: `condição ${Math.round(cansado.condition * 100)}%` }); }
    // 3. Amarelo.
    for (const p of meus) if (p.yellow && !p.calmer && this.activa(min, `amarelo-${p.id}`, ['gestao', 'motivacao'])) out.push({ tipo: 'agressividade', jogador: p.id, motivo: 'tem amarelo' });
    // 5. Seca de ocasiões.
    if (state.minute - state.lastShotMinute[this.team] >= T.seca_remates_min && t.width < 1 && this.activa(min, 'seca', ['tactica'])) out.push({ tipo: 'largura', valor: Math.min(1, t.width + 0.2), motivo: `${T.seca_remates_min} minutos sem rematar: explorar a largura` });
    return out;
  }

  /** Melhor suplente da mesma posição (ou do mesmo sector). */
  private suplente(sai: PlayerState): PlayerState | null {
    if (this.substituicoes >= T.substituicoes_max) return null;
    const livres = this.banco.filter((b) => !b.onPitch);
    return livres.find((b) => b.role === sai.role) ?? livres.find((b) => (b.role === 'GR') === (sai.role === 'GR')) ?? null;
  }

  /** Aplica as decisões ao estado (táctica, jogadores em campo). */
  aplicar(state: MatchState, decisoes: DecisaoTreinador[]) {
    const t = state.tactics[this.team];
    for (const d of decisoes) {
      if (d.tipo === 'mentalidade') t.mentality = d.valor;
      else if (d.tipo === 'pressao') t.pressing = d.valor;
      else if (d.tipo === 'largura') t.width = d.valor;
      else if (d.tipo === 'agressividade') { const p = state.players.find((x) => x.id === d.jogador); if (p) p.calmer = true; }
      else if (d.tipo === 'substituicao') {
        const s = state.players.find((x) => x.id === d.sai), e = this.banco.find((x) => x.id === d.entra);
        if (!s || !e || e.onPitch || this.substituicoes >= T.substituicoes_max) continue;
        s.onPitch = false;
        e.onPitch = true; e.pos = { ...s.pos }; e.vel = { x: 0, y: 0 }; e.slot = { ...s.slot }; e.team = this.team;
        if (!state.players.includes(e)) state.players.push(e);
        if (state.ball.ownerId === s.id) state.ball.ownerId = e.id;
        this.substituicoes++;
      }
    }
  }
}
