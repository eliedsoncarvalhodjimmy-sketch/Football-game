// Força de equipa (ataque e defesa, 1–100) nesta fase, sem jogadores.
//   força = reputação × (base + peso × força_desportiva_da_liga / 100) + choque de forma
// A força desportiva da liga (0–100) está em cada ficheiro de liga, calibrada pelo
// ranking UEFA. NÃO se usa o índice de riqueza (que é económico).
// Quando existir o módulo de jogadores, a força passa a vir do onze.
export const FORCA = {
  base: 0.7,
  peso_forca_desportiva: 0.3,
  /** Choque de forma do clube na época (igual no ataque e na defesa): mudanças de plantel, lesões, treinador. */
  choque_forma: 7,
  /** Ruído próprio do ataque e da defesa, por época. */
  ruido_ataque_defesa: 2.5,
};
