// Gera um treinador fictício por clube, com perfil e qualidade coerentes com a reputação.
import { Rng } from '../core/rng.ts';
import { ATRIBUTOS_TREINADOR, PERFIS, TREINADORES as T } from '../config/treinadores.ts';
import { nomePessoa } from '../players/nomesPessoas.ts';
import type { Treinador } from './store.ts';
import type { World } from '../engine/world.ts';

const clamp = (x: number) => Math.max(1, Math.min(20, Math.round(x)));

export function gerarTreinador(w: World, c: number, rng: Rng, id = `${w.clubes[c].id}_t`): Treinador {
  const rep = w.reputacao[c];
  // Clubes grandes: mais perfis ofensivos e de pressão; pequenos: mais pragmáticos e de contra-ataque.
  const pesos = PERFIS.map((p) => (p.id === 'ofensivo' || p.id === 'pressao_alta' ? 0.5 + rep / 100 : p.id === 'pragmatico' || p.id === 'contra_ataque' ? 1.5 - rep / 100 : 0.8));
  let r = rng.next() * pesos.reduce((s, x) => s + x, 0);
  let perfil = PERFIS[0];
  for (let k = 0; k < PERFIS.length; k++) if ((r -= pesos[k]) < 0) { perfil = PERFIS[k]; break; }
  const nivel = T.nivel_base + (T.nivel_por_reputacao * rep) / 100;
  const atributos = Object.fromEntries(ATRIBUTOS_TREINADOR.map((a) => [a, clamp(rng.normal(nivel + (perfil.fortes.includes(a) ? T.bonus_fortes : 0), T.desvio))])) as Treinador['atributos'];
  // A adaptabilidade não depende da reputação (há teimosos em todos os níveis).
  atributos.adaptabilidade = clamp(rng.normal(10.5, 4));
  return {
    id, nome: nomePessoa(w.clubes[c].pais, rng), pais: w.clubes[c].pais, clube: c, perfil: perfil.id, atributos,
    formacoes: [...perfil.formacoes], instrucoes: { ...perfil.instrucoes }, papeis: {}, origem: 'gerado',
  };
}

export function gerarTreinadores(w: World): Treinador[] {
  return w.clubes.map((c, i) => gerarTreinador(w, i, Rng.de(w.semente, 'treinador', c.id)));
}
