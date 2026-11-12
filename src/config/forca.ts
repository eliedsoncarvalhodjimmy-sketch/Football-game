// Força de equipa (ataque e defesa, 1–100) nesta fase, sem jogadores.
// força = reputação * (base + peso * índice_liga / 100); ataque e defesa têm ruído próprio.
// Quando existir o módulo de jogadores, a força passa a vir do onze.
export const FORCA = {
  base: 0.85,
  peso_indice_liga: 0.15,
  ruido_ataque_defesa: 4,
};
