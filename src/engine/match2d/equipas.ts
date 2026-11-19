// Plantéis gerados para o motor 2D (testes, ecrã de teste): os lugares da formação da app (posição e papel) com
// atributos pelo nível; o 3-4-3 losango, que ainda não existe na app, usa os lugares do config do motor 2D.
import { FORMACAO_POR_ID } from '../../config/tacticas.ts';
import { LUGARES_343L } from '../../config/match2d/formacoes.ts';
import { gerarAtributos } from '../decision/montarJogo.ts';
import type { Posicao } from '../../config/papeis.ts';
import type { JogadorBase2D } from './tipos.ts';

export function lugaresApp(formacao: string): { pos: string; papel: string }[] {
  if (formacao === '3-4-3L') return LUGARES_343L;
  const f = FORMACAO_POR_ID[formacao];
  if (!f) throw new Error(`Formação desconhecida: ${formacao}`);
  return f.lugares.map((l) => ({ pos: l.pos, papel: l.papel }));
}

export function gerarEquipa2D(prefixo: string, ovr: number, formacao: string, nomes?: string[]): JogadorBase2D[] {
  return lugaresApp(formacao).map((l, k) => ({ id: `${prefixo}${k + 1}`, nome: nomes?.[k] ?? `${prefixo.toUpperCase()}${k + 1}`, numero: k + 1, pos: l.pos, papel: l.papel,
    attrs: gerarAtributos(`${prefixo}|${k}`, ovr + ((k * 7) % 5) - 2, l.pos as Posicao, l.papel) }));
}
