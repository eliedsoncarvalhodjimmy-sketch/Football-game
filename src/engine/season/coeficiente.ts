// Coeficiente UEFA da época, por associação (liga que deu a vaga ao clube).
import { COEFICIENTE as C } from '../../config/coeficiente.ts';
import type { Temporada } from './temporada.ts';
import { FaseLigaUEFA } from '../competitions/leaguePhase.ts';

export function coeficientesUEFA(t: Temporada): Record<string, number> {
  const assoc = new Map<number, string>();
  const comps = Object.keys(C.fator_competicao);
  for (const id of comps) {
    for (const q of t.w.qualificados.get(`${id}_PO`) ?? []) assoc.set(q.clube, q.liga);
    for (const q of t.participantes.get(id) ?? []) assoc.set(q.clube, q.liga);
  }
  const pts = new Map<number, number>();
  const somar = (x: number, v: number) => pts.set(x, (pts.get(x) ?? 0) + v);
  for (const j of t.jogos) {
    const base = j.comp.split('_')[0];
    if (!comps.includes(base) || !j.r) continue;
    const f = C.fator_competicao[base] * (j.comp.endsWith('_PO') ? C.fator_acesso : 1);
    const { gc, gf } = j.r;
    if (gc > gf) somar(j.casa, C.vitoria * f);
    else if (gc < gf) somar(j.fora, C.vitoria * f);
    else { somar(j.casa, C.empate * f); somar(j.fora, C.empate * f); }
  }
  for (const [id, cc] of t.continentais) {
    if (!(cc instanceof FaseLigaUEFA)) continue;
    for (const e of cc.equipas) somar(e.clube, (C.bonus_fase[cc.faseDe(e.clube)] ?? 0) * C.fator_competicao[id]);
  }
  const soma = new Map<string, number>();
  const n = new Map<string, number>();
  for (const [x, l] of assoc) {
    soma.set(l, (soma.get(l) ?? 0) + (pts.get(x) ?? 0));
    n.set(l, (n.get(l) ?? 0) + 1);
  }
  return Object.fromEntries([...soma].map(([l, v]) => [l, Math.round((v / n.get(l)!) * 1000) / 1000]));
}
