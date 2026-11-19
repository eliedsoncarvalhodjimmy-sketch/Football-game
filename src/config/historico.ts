// Histórico das competições e dos prémios (dados reais dos PDFs do utilizador + o que o jogo simula).

/** Nomes do mesmo clube em épocas ou fontes diferentes → nome canónico (para contar títulos e escrever notícias).
 *  Só clubes que são de facto o mesmo (ex.: "Madrid" era o Real Madrid na II República; "Ambrosiana-Inter" o Inter). */
export const NOMES_EQUIVALENTES: Record<string, string[]> = {
  'Real Madrid': ['Madrid'],
  'Athletic Bilbao': ['Athletic de Bilbao', 'Atlético Bilbao'],
  'Atlético de Madrid': ['Atlético Aviación'],
  Villarreal: ['Villareal'],
  Espanyol: ['Español'],
  Internazionale: ['Ambrosiana-Inter', 'Ambrosiana- Inter', 'Inter de Milão'],
  '1. FC Nürnberg': ['Nuremberg'],
  'Hamburger SV': ['Hamburgo'],
  '1. FC Köln': ['Colônia', 'Köln'],
  'TSV 1860 München': ['Munique 1860'],
  '1. FC Kaiserslautern': ['Kaiserslautern'],
  'Hertha BSC': ['Hertha Berlim'],
  'Dresdner SC': ['Dresdner'],
  'VfB Stuttgart': ['Stuttgart'],
  'SC Freiburg': ['Freiburg'],
  'Olympique de Marseille': ['Olympique de Marselha'],
  'Stade de Reims': ['Stade Reims'],
  'FC Porto': ['Porto'],
  'SC Braga': ['Braga'],
};

/** Ficheiros de histórico de prémios (packs/_continental/historico/premio_<id>.csv) — os ids dos prémios do jogo. */
export const PREMIOS_HISTORICO = {
  melhor_do_mundo: { nome: 'Melhor do Mundo (Bola de Ouro)', ficheiro: 'premio_melhor_do_mundo' },
  golden_boy: { nome: 'Golden Boy (Troféu Kopa)', ficheiro: 'premio_golden_boy' },
  guarda_redes: { nome: 'Melhor guarda-redes', ficheiro: 'premio_guarda_redes' },
} as const;

/** Factos para as notícias quando há um campeão: a partir de quantos anos sem títulos é "jejum". */
export const FACTOS_HISTORICO = { jejum_minimo: 10, marcos: [10, 20, 25, 30, 40, 50] };
