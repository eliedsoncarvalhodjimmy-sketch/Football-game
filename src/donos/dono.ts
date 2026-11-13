// Donos dos clubes (Prompt 3, Bloco B): geração por tipo e país, política financeira, objectivo da época.
import { Rng } from '../core/rng.ts';
import { ATRIBUTOS_DONO, PERFIL_TIPO, PESOS_TIPO_PAIS, ATRACCAO_REPUTACAO, FORTUNA, DONOS as D, TIPOS_DONO, type TipoDono, type AtributoDono } from '../config/donos.ts';
import { nomePessoa } from '../players/nomesPessoas.ts';
import type { World } from '../engine/world.ts';

export interface Dono {
  id: string;
  nome: string;
  tipo: TipoDono;
  atributos: Record<AtributoDono, number>;
  idade: number;
  /** Dia em que comprou o clube; lua de mel até ao dia indicado. */
  desde: number;
  luaDeMelAte: number;
  origem: 'gerado' | 'real' | 'manual';
}

const clamp20 = (x: number) => Math.max(1, Math.min(20, Math.round(x)));

export function fortuna(d: Dono): number {
  return Math.pow(10, FORTUNA.expoente_base + d.atributos.riqueza * FORTUNA.expoente_por_ponto);
}

/** Dinheiro que o dono está disposto a pôr por ano. */
export function capacidadeAnual(d: Dono): number {
  return (fortuna(d) * D.capacidade_fortuna * d.atributos.gasto) / 10;
}

/** Dívida máxima aceite pelo dono (fracção da receita). */
export function politicaDivida(d: Dono): number {
  return D.divida_base + d.atributos.risco / 20;
}

/** Massa salarial alvo (fracção da receita) e se aceita passar o limite do fair play. */
export function massaAlvo(d: Dono): { alvo: number; arriscaFFP: boolean } {
  const a = d.atributos;
  return { alvo: D.massa_base + (D.massa_ambicao * (a.ambicao - 10)) / 10 + (D.massa_risco * (a.risco - 10)) / 10, arriscaFFP: a.risco >= D.risco_ffp };
}

/** Tipo de dono por país e reputação (adeptos excluídos se `semAdeptos`). */
export function sortearTipo(pais: string, rep: number, rng: Rng, semAdeptos = false): TipoDono {
  const base = { ...PESOS_TIPO_PAIS.padrao, ...(PESOS_TIPO_PAIS[pais] ?? {}) } as Record<TipoDono, number>;
  const pesos = TIPOS_DONO.map((t) => {
    if (semAdeptos && t === 'adeptos') return 0;
    let p = base[t] ?? 0;
    const at = ATRACCAO_REPUTACAO[t];
    if (at) p *= Math.max(0.05, 1 + (at * (rep - 50)) / 50);
    return p;
  });
  let r = rng.next() * pesos.reduce((s, x) => s + x, 0);
  for (let k = 0; k < TIPOS_DONO.length; k++) if ((r -= pesos[k]) < 0) return TIPOS_DONO[k];
  return 'familia';
}

export function gerarDono(w: World, c: number, rng: Rng, dia: number, tipo?: TipoDono, id?: string): Dono {
  const pais = w.clubes[c].pais;
  const t = tipo ?? sortearTipo(pais, w.reputacao[c], rng);
  const perfil = PERFIL_TIPO[t];
  const atributos = Object.fromEntries(ATRIBUTOS_DONO.map((a) => [a, clamp20(perfil[a] + rng.normal(0, 2.5))])) as Record<AtributoDono, number>;
  // Os donos de clubes grandes tendem a ser mais ricos (excepto adeptos).
  if (t !== 'adeptos') atributos.riqueza = clamp20(atributos.riqueza + (w.reputacao[c] - 50) / 25);
  const nome = t === 'adeptos' ? `Sócios do ${w.clubes[c].nome}` : t === 'estado' ? `Fundo soberano (${['Golfo', 'Oriente', 'Norte', 'Ásia'][rng.int(0, 3)]})` : t === 'investimento' ? `${['Atlas', 'Meridian', 'Northgate', 'Silverline', 'Harbour', 'Crestview', 'Bluestone', 'Kestrel'][rng.int(0, 7)]} ${['Capital', 'Partners', 'Holdings', 'Ventures'][rng.int(0, 3)]}` : t === 'multiclube' ? `${['Global Football', 'United Clubs', 'Prime Sports', 'Orbit'][rng.int(0, 3)]} Group` : nomePessoa(pais, rng);
  return { id: id ?? `${w.clubes[c].id}_d${dia}`, nome, tipo: t, atributos, idade: t === 'familia' || t === 'bilionario' ? rng.int(38, 78) : 0, desde: dia, luaDeMelAte: dia, origem: 'gerado' };
}

/** Objectivo da época: pela posição esperada (ordem de reputação na liga) e pela ambição do dono. */
export function objectivo(w: World, c: number, d: Dono): string {
  const l = w.liga[c];
  if (l < 0) return 'manutenção';
  const L = w.ligas[l];
  const ordem = [...L.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
  const pos = ordem.indexOf(c) + 1 - Math.round((d.atributos.ambicao - 10) / 4);
  const n = L.clubes.length;
  if (L.regras.nivel > 1 && pos <= 4) return 'subida';
  if (pos <= 1) return 'título';
  if (L.regras.nivel === 1 && pos <= Math.max(3, Math.round(n / 4))) return 'competições europeias';
  if (pos <= n / 2) return 'metade de cima';
  return 'manutenção';
}

/** Cumpriu o objectivo? (posição final na liga) */
export function cumpriu(obj: string, pos: number, n: number, nivel: number, subiu: boolean): boolean {
  switch (obj) {
    case 'título': return pos === 1;
    case 'competições europeias': return pos <= Math.max(4, Math.round(n / 4));
    case 'metade de cima': return pos <= n / 2;
    case 'subida': return subiu || (nivel === 1 && pos <= n / 2);
    default: return pos <= n - 3;
  }
}

/** Donos de donos.csv (id, nome, tipo, clube, origem e, opcionalmente, os 7 atributos e a idade). */
export function donoDeCsv(l: Record<string, string>, dia: number): Dono | null {
  if (!TIPOS_DONO.includes(l.tipo as TipoDono)) return null;
  const perfil = PERFIL_TIPO[l.tipo as TipoDono];
  const atributos = Object.fromEntries(ATRIBUTOS_DONO.map((a) => [a, l[a] ? clamp20(Number(l[a])) : perfil[a]])) as Record<AtributoDono, number>;
  return { id: l.id || `${l.clube}_d`, nome: l.nome || l.clube, tipo: l.tipo as TipoDono, atributos, idade: Number(l.idade) || 0, desde: dia, luaDeMelAte: dia, origem: l.origem === 'real' ? 'real' : 'manual' };
}
