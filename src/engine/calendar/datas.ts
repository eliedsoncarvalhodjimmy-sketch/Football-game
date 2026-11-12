import { CALENDARIO } from '../../config/calendario.ts';

/** Segunda-feira da semana 0 da época que começa no ano `epoca`. */
export function segundaSemana0(epoca: number): Date {
  const d = new Date(`${epoca}-${CALENDARIO.inicio_epoca}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export function dataDe(epoca: number, semana: number, dia: number): Date {
  const d = segundaSemana0(epoca);
  d.setUTCDate(d.getUTCDate() + semana * 7 + dia);
  return d;
}

export function isoData(epoca: number, semana: number, dia: number): string {
  return dataDe(epoca, semana, dia).toISOString().slice(0, 10);
}

/** Dia absoluto dentro da época (para verificar choques). */
export function diaAbsoluto(semana: number, dia: number): number {
  return semana * 7 + dia;
}
