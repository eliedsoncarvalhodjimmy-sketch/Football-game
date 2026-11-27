// Prompt 11, Bloco 0/1: nome da fase e da mão a partir da chave que o motor já devolve (Prompt 10/temporada.ts),
// sem precisar de nenhuma alteração ao motor. Puro: só texto e números.
export interface ChaveJogo { ano: number; comp: string; ronda: number; casa: number; fora: number; segundaMao: boolean }

/** A chave vem como "${ano}|${comp}|${ronda}|${casa}|${fora}|${idaNum}" (temporada.ts); idaNum 2 = 2.ª mão. */
export function parseChave(chave: string): ChaveJogo | null {
  const p = chave.split('|');
  if (p.length !== 6) return null;
  const [ano, comp, ronda, casa, fora, idaNum] = p;
  if (![ano, ronda, casa, fora, idaNum].every((x) => /^-?\d+$/.test(x))) return null;
  return { ano: Number(ano), comp, ronda: Number(ronda), casa: Number(casa), fora: Number(fora), segundaMao: Number(idaNum) === 2 };
}

/** É jogo a 2 mãos (play-offs e eliminatórias, excepto a final)? A fase de liga nunca tem "mão". */
function temMao(comp: string, ronda: number): boolean {
  if (comp.endsWith('_ko')) return ronda < 4; // oitavos/quartos/meias: sim; final (ronda 4): não
  return comp.endsWith('_PO') || comp.endsWith('_pe');
}

/** Nome da fase (ex.: "Oitavos de final · 1.ª mão", "Fase de liga · Jornada 3", "Final"), a partir do sufixo do id da
 *  competição (temporada.ts/leaguePhase.ts): "" (fase de liga), "_PO" (play-off de acesso), "_pe" (play-off de
 *  eliminatórias), "_ko" (eliminatórias: ronda 1–4 = oitavos/quartos/meias/final). */
export function faseContinental(comp: string, ronda: number, segundaMao: boolean): string {
  const mao = ` · ${segundaMao ? '2.ª' : '1.ª'} mão`;
  if (comp.endsWith('_ko')) {
    const nome = ['Oitavos de final', 'Quartos de final', 'Meias-finais', 'Final'][ronda - 1] ?? `Eliminatórias (ronda ${ronda})`;
    return ronda >= 4 ? nome : nome + mao;
  }
  if (comp.endsWith('_PO')) return 'Play-off de acesso' + mao;
  if (comp.endsWith('_pe')) return 'Play-off' + mao;
  return `Fase de liga · Jornada ${ronda}`;
}

/** "champions" ou "europa" a partir do id base da competição (UCL/UEL, com ou sem sufixo); outra competição → null
 *  (esta cutscene é só para estas duas, por decisão do utilizador no Prompt 11). */
export function idCutsceneDaCompeticao(comp: string): 'champions' | 'europa' | null {
  const base = comp.replace(/_(PO|pe|ko)$/, '');
  return base === 'UCL' ? 'champions' : base === 'UEL' ? 'europa' : null;
}

export { temMao };
