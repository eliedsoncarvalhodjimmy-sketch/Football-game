// Prémios individuais anuais (pedido do utilizador): Melhor do Mundo (Bola de Ouro), Melhor guarda-redes, Golden Boy (melhor sub-21).
// Época de avaliação: 1 de Agosto a 15 de Julho. Finalistas a 16 de Julho; cerimónia a 30 de Julho.

export const CALENDARIO_PREMIOS = {
  /** Período de avaliação (mês 1–12, dia). */
  inicio: { mes: 8, dia: 1 },
  fim: { mes: 7, dia: 15 },
  anuncio_finalistas: { mes: 7, dia: 16 },
  cerimonia: { mes: 7, dia: 30 },
  /** Ordem da cerimónia; cada etapa tem botão de saltar. */
  ordem: ['golden_boy', 'guarda_redes', 'melhor_do_mundo'] as const,
};

export const FINALISTAS = { melhor_do_mundo: 30, golden_boy: 30, guarda_redes: 5 };

/** Golden Boy: até aos 21 anos no início do período de avaliação (1 de Agosto). */
export const GOLDEN_BOY = { idade_maxima: 21 };

/** Mínimos para entrar na votação (em jogos oficiais do período). */
export const ELEGIBILIDADE = { jogos_minimos: 25, jogos_minimos_gr: 25, jogos_minimos_golden_boy: 18 };

/** Pontuação de cada candidato (soma), antes do ruído da "votação". */
export const PONTUACAO = {
  /** Nota média dos jogos (escala do motor) × peso. */
  nota_media: 22,
  /** Por golo e por assistência, conforme o grupo de posições. */
  golo: { AVA: 1.0, MED: 1.3, DEF: 1.8, GR: 3 } as Record<string, number>,
  assistencia: { AVA: 0.8, MED: 1.0, DEF: 1.2, GR: 3 } as Record<string, number>,
  /** Guarda-redes: por jogo sem sofrer e por defesa decisiva. */
  jogo_sem_sofrer: 1.6,
  defesa_decisiva: 0.4,
  /** Títulos colectivos do período (o clube ou a selecção), × participação (minutos jogados na competição / possíveis). */
  titulos: { liga: 18, taca: 6, supertaca: 2, continental_1: 30, continental_2: 14, continental_3: 8, mundial: 40, continental_seleccoes: 28 } as Record<string, number>,
  /** Prémio de "nome": reputação 0–100 × peso (os votantes conhecem melhor as estrelas). */
  reputacao: 0.25,
  /** Força do campeonato onde joga (0–100) × peso. */
  forca_liga: 0.15,
  /** Ruído da votação (desvio padrão, em pontos). */
  ruido: 4,
};

/** Na cerimónia, do 30.º ao 4.º lugar com intervalo curto; o top 3 com suspense. */
export const CERIMONIA = { intervalo_ms: 450, suspense_ms: 1800 };
