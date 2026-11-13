// Datas. Cada época de cada modelo de calendário começa na segunda-feira da
// semana que contém o seu dia de início (1 de Julho em "ago_mai", 1 de Janeiro
// em "ano_civil"). Os dias absolutos contam-se desde 1970-01-01 (UTC).
import { CALENDARIO } from '../../config/calendario.ts';

const DIA_MS = 86400000;

/** Dia absoluto da segunda-feira da semana 0 da época `ano` do modelo. */
export function baseDias(ano: number, modeloId = 'ago_mai'): number {
  const inicio = CALENDARIO.modelos[modeloId]?.inicio ?? CALENDARIO.inicio_epoca;
  const d = new Date(`${ano}-${inicio}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  return Math.round(d.getTime() / DIA_MS) - dow;
}

export function isoDias(dias: number): string {
  return new Date(dias * DIA_MS).toISOString().slice(0, 10);
}

/** Segunda-feira da semana 0 da época que começa no ano `epoca` (modelo ago_mai). */
export function segundaSemana0(epoca: number, modeloId = 'ago_mai'): Date {
  return new Date(baseDias(epoca, modeloId) * DIA_MS);
}

export function dataDe(epoca: number, semana: number, dia: number, modeloId = 'ago_mai'): Date {
  return new Date((baseDias(epoca, modeloId) + semana * 7 + dia) * DIA_MS);
}

export function isoData(epoca: number, semana: number, dia: number, modeloId = 'ago_mai'): string {
  return dataDe(epoca, semana, dia, modeloId).toISOString().slice(0, 10);
}

/** Dia absoluto dentro da época (para verificar choques). */
export function diaAbsoluto(semana: number, dia: number): number {
  return semana * 7 + dia;
}
