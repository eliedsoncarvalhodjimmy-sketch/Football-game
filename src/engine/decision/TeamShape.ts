// Nível MESO: a forma da equipa. Cada jogador tem uma posição-alvo calculada a partir do seu lugar na formação, da
// posição da bola e da táctica (linha defensiva, largura, compactação). "Forças de coesão" mantêm os sectores juntos:
// a linha defensiva sobe e desce alinhada; os médios compactam à volta da sua média; os laterais sobem em sincronia.
import { CAMPO, ESTILOS_DECISAO } from '../../config/decisao.ts';
import type { MatchState, Position, PlayerState, Equipa } from './types.ts';

type Sector = 'gr' | 'def' | 'med' | 'ata';
export function sectorDe(p: PlayerState): Sector {
  if (p.role === 'GR') return 'gr';
  if (p.role === 'DC' || p.role === 'DD' || p.role === 'DE') return 'def';
  if (p.role === 'PL' || p.role === 'ED' || p.role === 'EE') return 'ata';
  return 'med'; // MDC, MC, MO, ALD, ALE
}
const lateral = (p: PlayerState) => p.role === 'DD' || p.role === 'DE' || p.role === 'ALD' || p.role === 'ALE';

/** Converte x "da equipa" (0 = própria baliza, 105 = baliza adversária) para x do campo. */
export const xCampo = (team: Equipa, xEq: number) => (team === 0 ? xEq : CAMPO.comprimento - xEq);
export const xEquipa = (team: Equipa, x: number) => (team === 0 ? x : CAMPO.comprimento - x);

/**
 * Posições-alvo de todos os jogadores de uma equipa (id → posição no campo).
 * Memoizada pela posição da bola (arredondada a 1 m), pela posse e pela táctica.
 */
const cache = new Map<string, Map<string, Position>>();
export function formaEquipa(state: MatchState, team: Equipa): Map<string, Position> {
  const t = state.tactics[team];
  const bx = xEquipa(team, state.ball.pos.x), by = state.ball.pos.y;
  const comBola = state.possessionTeam === team;
  const chave = `${team}|${Math.round(bx)}|${Math.round(by)}|${comBola ? 1 : 0}|${t.style}|${t.mentality}|${t.defensiveLine.toFixed(2)}|${t.width.toFixed(2)}|${state.players.filter((p) => p.team === team && p.onPitch).map((p) => p.id).join(',')}`;
  const c = cache.get(chave);
  if (c) return c;
  const ef = ESTILOS_DECISAO[t.style]?.forma ?? {};
  const meus = state.players.filter((p) => p.team === team && p.onPitch);
  // Altura do bloco: segue a bola (60%), mais subida com a posse e com mentalidade ofensiva.
  const linha = Math.max(0, Math.min(1, t.defensiveLine + (ef.linhaDefensiva ?? 0)));
  const subir = (comBola ? 10 : 0) + 4 * t.mentality + 2 * (ef.subir ?? 0);
  // Profundidade do bloco (distância da linha defensiva aos avançados): compacta sem bola.
  const profundidade = (comBola ? 42 : 30) - 4 * (ef.compactacao ?? 0);
  let linhaDef = 18 + 30 * linha + 0.35 * (bx - 52.5) + subir;
  // Sem bola, a linha defensiva fica sempre entre a bola e a própria baliza (nunca deixa o portador nas costas).
  if (!comBola) linhaDef = Math.max(5, Math.min(linhaDef, bx - 6));
  const larguraBase = 0.55 + 0.4 * t.width + 0.08 * (ef.amplitude ?? 0);
  const largura = comBola ? larguraBase : larguraBase * (0.78 - 0.04 * (ef.compactacao ?? 0));
  const out = new Map<string, Position>();
  const brutas = new Map<string, Position>();
  for (const p of meus) {
    const s = sectorDe(p);
    let x: number;
    if (s === 'gr') x = Math.max(4, Math.min(16, 6 + 0.06 * (bx - 30) + (comBola ? 3 : 0)));
    else x = linhaDef + profundidade * Math.max(0, (p.slot.x - 0.25) / 0.75);
    // Laterais sobem com a posse (sincronizados) e mais nos estilos que o pedem.
    if (lateral(p) && comBola) x += 6 + 4 * (ef.subidaLaterais ?? 0);
    // Largura em torno do centro, puxada para o lado da bola.
    const centro = CAMPO.largura / 2 + 0.25 * (by - CAMPO.largura / 2);
    let y = centro + (p.slot.y - 0.5) * CAMPO.largura * largura;
    if (s === 'gr') y = CAMPO.largura / 2 + 0.15 * (by - CAMPO.largura / 2);
    brutas.set(p.id, { x, y });
  }
  // Coesão por sector: a defesa alinha-se (mesmo x), os médios compactam 50% em direcção à média do sector.
  const porSector = new Map<Sector, PlayerState[]>();
  for (const p of meus) { const s = sectorDe(p); porSector.set(s, [...(porSector.get(s) ?? []), p]); }
  const mediaX = (l: PlayerState[]) => l.reduce((a, p) => a + brutas.get(p.id)!.x, 0) / Math.max(1, l.length);
  const def = (porSector.get('def') ?? []).filter((p) => !(lateral(p) && comBola));
  const xDef = def.length ? mediaX(def) : 0;
  const med = porSector.get('med') ?? [];
  const xMed = med.length ? mediaX(med) : 0;
  for (const p of meus) {
    const b = brutas.get(p.id)!, s = sectorDe(p);
    let x = b.x;
    if (s === 'def' && !(lateral(p) && comBola)) x = xDef;
    else if (s === 'med') x = 0.5 * x + 0.5 * xMed;
    x = Math.max(2, Math.min(CAMPO.comprimento - 2, x));
    out.set(p.id, { x: xCampo(team, x), y: Math.max(2, Math.min(CAMPO.largura - 2, b.y)) });
  }
  if (cache.size > 4000) cache.clear();
  cache.set(chave, out);
  return out;
}
