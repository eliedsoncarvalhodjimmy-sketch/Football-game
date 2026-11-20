// Motor 2D táctico — Fase 5 (docs/tactics/MOTOR_2D.md, secções 10.2, 11 e 2.2): bolas paradas, penáltis, cartões,
// jogadas-padrão e apresentação por lances. Números aqui; lógica em src/engine/match2d/.

/** Bolas paradas (secção 11, "Bolas paradas (todos os estilos)"). Coordenadas no referencial de quem ataca (baliza
 *  adversária em x = 105, centro y = 34). */
export const BOLA_PARADA = {
  /** Variantes de canto e o seu peso (o melhor cabeceador vai à zona da variante escolhida). */
  variantes_canto: { primeiro_poste: 0.3, segundo_poste: 0.35, curto: 0.12, entrada_area: 0.23 },
  /** Zonas de ataque num canto (y relativo ao lado do canto: + = lado do canto). */
  zonas_ataque: { primeiro_poste: [100.5, 3.5], segundo_poste: [99, -4.5], centro: [99.5, 0], penalti: [94, -1], entrada_area: [87.5, 2] } as Record<string, [number, number]>,
  /** Jogadores na área num canto a favor (Catenaccio: 4, centrais incluídos). Os restantes: 2 atrás e o resto à entrada. */
  na_area: 5, na_area_catenaccio: 4, ficam_atras: 2,
  /** Defesa de canto mista: zonas (referencial de quem defende, baliza própria em x = 0; y + = lado do canto). */
  zonas_defesa: [[1.5, 3.4], [5, 1], [5, -3], [10, 0]] as [number, number][],
  /** Avançados que ficam à frente para o contra-ataque (Catenaccio: 1). */
  ficam_frente: 2,
  /** O canto curto: o colega fica a x m do marcador. */
  curto_m: 9,
  /** Altura do cruzamento de bola parada (m no ápice). */
  altura_cruzamento: 5,
  /** Tempo para todos chegarem às posições antes de marcar (s, máximo). */
  espera_posicoes_s: 12, posicao_ok_m: 2.5,
  /** Livre directo: até esta distância da baliza e com este ângulo (|y − 34| máximo). */
  livre_directo_m: 28, livre_directo_largura: 18,
  /** Livre lateral perigoso (cruzado como um canto): x mínimo no último terço. */
  livre_cruzado_x: 72,
  /** Barreira: jogadores por distância (< 20 m: 4; < 25 m: 3; senão 2), a 9,15 m da bola. */
  barreira_m: 9.15,
  /** P(a barreira bloquear) e o erro do remate de livre (rad) = base + por ponto abaixo de 20 em (Bolas paradas + Remate de longe)/2. */
  barreira_bloqueia: 0.22, livre_erro_base: 0.05, livre_erro_ponto: 0.006, livre_v: 25, livre_z_baliza: 1.4,
};

/** Penálti: P(golo) = base + por ponto (Finalização+Compostura+Bolas paradas)/3 − por ponto (Reflexos+Um-contra-um)/2 do GR,
 *  limitado; dos que não entram, esta fracção sai fora (o resto o GR defende). */
export const PENALTI = { base: 0.76, ponto_marcador: 0.012, ponto_gr: 0.012, min: 0.55, max: 0.92, fora: 0.3, espera_s: 3 };

/** Cartões. Amarelo numa falta = base + táctica (corta um ataque prometedor) + agressividade; vermelho directo quando
 *  a falta tira uma ocasião clara de golo (último homem, central, perto da área) ou, raro, por violência. */
export const CARTOES = {
  amarelo_base: 0.03, amarelo_tactica: 0.18, amarelo_agr: 0.008, amarelo_por_tras: 0.08,
  /** Ocasião clara: o atacante (referencial dele) com x acima disto, |y − 34| abaixo e nenhum outro defensor mais perto da baliza. */
  ocasiao_x: 80, ocasiao_largura: 12, vermelho_ocasiao: 0.05, vermelho_violento: 0.004,
  /** Ataque prometedor (para o amarelo táctico): atacante de frente com x acima disto ou equipa em transição. */
  promissor_x: 55,
  /** Na própria área o defensor arrisca muito menos a falta (dá penálti): a probabilidade multiplica por isto. */
  falta_area: 0.009,
  /** Quem já tem amarelo arrisca menos: a probabilidade de falta multiplica por isto (e o árbitro é mais brando no segundo). */
  com_amarelo: 0.5,
};

/** Cantos (secção 12: 4–6 por equipa). Na própria área: um cruzamento cortado, um alívio de cabeça ou um remate
 *  bloqueado saem muitas vezes pela linha de fundo. */
export const CANTOS = { corte_cruzamento: 0.9, corte_rasteiro: 0.35, cabeca_defensiva: 0.7, bloqueio: 0.75 };

/** Grupos de lugares usados nas jogadas-padrão. */
export type GrupoLugar = 'DC' | 'LAT' | 'MDC' | 'MC' | 'MO' | 'EXT' | 'PL';

/** Jogadas-padrão (secção 11): intenções, não guiões. Quando o gatilho existe (ver src/engine/match2d/jogadas.ts) e o
 *  sorteio (`prob`) o permite, durante `duracao_s` sobem os pesos: `accoes` (acções sem bola por grupo de lugar),
 *  `opcoes` (opções do portador), `receptores` (passes para esse grupo) e `linha_m` (altura da linha). Abandona-se se a
 *  equipa perder a bola (jogadas com bola) ou a recuperar (jogadas sem bola). */
export interface Jogada {
  id: string; nome: string; estilos: string[]; prob: number; duracao_s: number; comBola: boolean;
  accoes?: Partial<Record<GrupoLugar, Record<string, number>>>;
  opcoes?: Record<string, number>; receptores?: Partial<Record<GrupoLugar, number>>; linha_m?: number;
}
const J = (id: string, nome: string, estilos: string[], prob: number, duracao_s: number, comBola: boolean, r: Omit<Jogada, 'id' | 'nome' | 'estilos' | 'prob' | 'duracao_s' | 'comBola'>): Jogada => ({ id, nome, estilos, prob, duracao_s, comBola, ...r });

export const JOGADAS: Jogada[] = [
  // Tiki-Taka
  J('saida_3', 'Saída a 3', ['tiki_taka'], 0.8, 8, true, { accoes: { MDC: { OFERECER_APOIO: 2 }, LAT: { DAR_LARGURA: 2 } }, opcoes: { PASSE_CURTO: 1.4, PASSE_LONGO: 0.4 }, receptores: { DC: 1.3, MC: 1.4 } }),
  J('terceiro_homem', 'Terceiro homem', ['tiki_taka', 'futebol_total'], 0.5, 4, true, { accoes: { MC: { OFERECER_APOIO: 2, APOIO_FRONTAL: 1.5 }, EXT: { ATACAR_PROFUNDIDADE: 1.8 }, LAT: { ATACAR_PROFUNDIDADE: 1.4 } }, opcoes: { PASSE_PROGRESSIVO: 1.5 }, receptores: { PL: 1.6 } }),
  J('atrair_mudar', 'Atrair e mudar', ['tiki_taka', 'pelas_alas'], 0.5, 10, true, { accoes: { EXT: { DAR_LARGURA: 2 }, LAT: { DAR_LARGURA: 1.5 } }, opcoes: { PASSE_CURTO: 1.2, MUDANCA_FLANCO: 2.2 } }),
  J('tabela_area', 'Tabela à entrada da área', ['tiki_taka', 'futebol_total'], 0.5, 3, true, { accoes: { PL: { APOIO_FRONTAL: 2.2 }, MO: { ATACAR_PROFUNDIDADE: 2 }, EXT: { ATACAR_PROFUNDIDADE: 1.6 } }, opcoes: { PASSE_CURTO: 1.4, REMATAR: 1.3 }, receptores: { PL: 1.5 } }),
  // Gegenpressen
  J('recuperar_atacar', 'Recuperar e atacar', ['gegenpressen'], 0.85, 6, true, { accoes: { PL: { ATACAR_PROFUNDIDADE: 2, OCUPAR_AREA: 2 }, EXT: { ATACAR_PROFUNDIDADE: 2, OCUPAR_AREA: 1.6 }, MO: { OCUPAR_AREA: 1.6 } }, opcoes: { PASSE_PROGRESSIVO: 1.8, REMATAR: 1.4, PASSE_CURTO: 0.7 } }),
  J('armadilha_linha', 'Armadilha na linha', ['gegenpressen'], 0.7, 5, false, { accoes: { EXT: { PRESSIONAR: 2.2 }, MC: { FECHAR_LINHA_PASSE: 2 }, LAT: { FECHAR_LINHA_PASSE: 1.8, PRESSIONAR: 1.4 } } }),
  J('pressao_passe_atras', 'Pressão ao passe para trás', ['gegenpressen'], 0.7, 5, false, { accoes: { PL: { PRESSIONAR: 2.5 }, MO: { PRESSIONAR: 1.8, MARCAR: 1.5 }, MC: { MARCAR: 1.6, FECHAR_LINHA_PASSE: 1.5 } }, linha_m: 4 }),
  // Contra-ataque
  J('profundidade_imediata', 'Profundidade imediata', ['contra_ataque', 'bloco_medio_baixo'], 0.8, 8, true, { accoes: { PL: { ATACAR_PROFUNDIDADE: 2.5 }, EXT: { ATACAR_PROFUNDIDADE: 2 } }, opcoes: { PASSE_LONGO: 1.8, PASSE_PROGRESSIVO: 1.5, CONDUZIR: 1.5 } }),
  J('saida_extremo', 'Saída pelo extremo', ['contra_ataque', 'pelas_alas'], 0.7, 8, true, { accoes: { PL: { OCUPAR_AREA: 2 }, MC: { OCUPAR_AREA: 1.4 }, EXT: { DAR_LARGURA: 1.8 } }, opcoes: { CONDUZIR: 1.4, CRUZAMENTO: 1.6 }, receptores: { EXT: 2 } }),
  J('isca_explosao', 'Isca e explosão', ['contra_ataque'], 0.6, 10, false, { linha_m: -4, accoes: { PL: { MANTER_POSICAO: 1.5 } } }),
  // Catenaccio
  J('alivio_orientado', 'Alívio orientado', ['catenaccio'], 0.85, 6, true, { accoes: { PL: { APOIO_FRONTAL: 2, ATACAR_PROFUNDIDADE: 1.5 } }, opcoes: { PASSE_LONGO: 1.8, ALIVIAR: 1.5 }, receptores: { PL: 2 } }),
  J('marcar_libertar', 'Marcar e libertar', ['catenaccio'], 0.9, 4, false, { accoes: { DC: { MARCAR: 2 }, LAT: { MARCAR: 1.8 } }, opcoes: { ALIVIAR: 2 } }),
  // Jogo Directo
  J('bola_pivo', 'Bola no pivô', ['jogo_direto'], 0.85, 6, true, { accoes: { PL: { APOIO_FRONTAL: 2.2 }, MC: { APOIO_FRONTAL: 1.5, OFERECER_APOIO: 1.4 } }, opcoes: { PASSE_LONGO: 1.6 }, receptores: { PL: 2 } }),
  J('segunda_bola', 'Segunda bola', ['jogo_direto'], 0.9, 4, true, { accoes: { MC: { OCUPAR_AREA: 1.5, OFERECER_APOIO: 1.6 }, MO: { OFERECER_APOIO: 1.6 } }, opcoes: { REMATAR: 1.5, PASSE_PROGRESSIVO: 1.4 } }),
  J('costas_linha', 'Nas costas da linha', ['jogo_direto', 'contra_ataque'], 0.7, 6, true, { accoes: { PL: { ATACAR_PROFUNDIDADE: 2.8 } }, opcoes: { PASSE_LONGO: 2 }, receptores: { PL: 2 } }),
  // Pelas Alas
  J('sobreposicao', 'Sobreposição', ['pelas_alas'], 0.85, 6, true, { accoes: { LAT: { SOBREPOSICAO: 3 }, PL: { OCUPAR_AREA: 1.6 } }, opcoes: { CONDUZIR: 1.3, CRUZAMENTO: 1.4 }, receptores: { LAT: 2 } }),
  J('segundo_poste', 'Cruzamento ao segundo poste', ['pelas_alas', 'jogo_direto'], 0.8, 4, true, { accoes: { PL: { OCUPAR_AREA: 2.2 }, EXT: { OCUPAR_AREA: 2 }, MC: { OCUPAR_AREA: 1.4 } }, opcoes: { CRUZAMENTO: 2 } }),
  J('linha_fundo', 'Linha de fundo e atrasar', ['pelas_alas'], 0.6, 4, true, { accoes: { MC: { OCUPAR_AREA: 1.8 }, MO: { OCUPAR_AREA: 1.8 } }, opcoes: { CONDUZIR: 1.6, DRIBLAR: 1.4, PASSE_CURTO: 1.3 } }),
  J('mudanca_flanco', 'Mudança de flanco', ['pelas_alas', 'futebol_total'], 0.6, 6, true, { accoes: { EXT: { DAR_LARGURA: 2 } }, opcoes: { MUDANCA_FLANCO: 2.5 } }),
  // Futebol Total
  J('central_sobe', 'Central que sobe', ['futebol_total'], 0.6, 10, true, { accoes: { MDC: { EQUILIBRIO_DEFENSIVO: 2 }, MC: { OFERECER_APOIO: 1.4 } }, opcoes: { CONDUZIR: 2.5 } }),
  J('rotacao_ala', 'Rotação na ala', ['futebol_total'], 0.6, 6, true, { accoes: { LAT: { DAR_LARGURA: 2, SOBREPOSICAO: 1.6 }, MC: { ATACAR_PROFUNDIDADE: 1.6 } }, opcoes: { PASSE_CURTO: 1.3, CONDUZIR: 1.2 } }),
  J('falso9_invasao', 'Falso 9 e invasão', ['futebol_total', 'tiki_taka'], 0.6, 5, true, { accoes: { PL: { APOIO_FRONTAL: 2 }, EXT: { ATACAR_PROFUNDIDADE: 2.4 } }, opcoes: { PASSE_PROGRESSIVO: 1.8 }, receptores: { EXT: 1.6 } }),
  // Bloco Médio-Baixo
  J('fechar_saltar', 'Fechar o meio e saltar', ['bloco_medio_baixo'], 0.8, 5, false, { accoes: { MC: { PRESSIONAR: 2, FECHAR_LINHA_PASSE: 1.6 }, MDC: { PRESSIONAR: 1.6, COBRIR: 1.6 } } }),
  J('saida_3_passes', 'Saída em 3 passes', ['bloco_medio_baixo'], 0.8, 8, true, { accoes: { EXT: { DAR_LARGURA: 2, ATACAR_PROFUNDIDADE: 1.5 } }, opcoes: { PASSE_PROGRESSIVO: 1.4, CONDUZIR: 1.3, PASSE_LONGO: 0.7 }, receptores: { EXT: 1.8, MC: 1.3 } }),
  J('empurrar_fora', 'Empurrar para fora', ['bloco_medio_baixo', 'catenaccio'], 0.7, 6, false, { accoes: { MC: { FECHAR_LINHA_PASSE: 2 }, EXT: { PRESSIONAR: 1.4 } } }),
];

/** Apresentação por lances (secção 2.2, modelo FM). Tempos em s de jogo. */
export const LANCES = {
  /** Um lance começa no início da sequência, no máximo `antes_max` s antes do momento-chave, e acaba `depois` s depois
   *  (num golo, `depois_golo`). Uma bola parada mostra-se desde `antes_bola_parada` s antes do toque. */
  antes_max: 13, antes_min: 6, depois: 3, depois_golo: 5, antes_bola_parada: 8,
  /** Jogo corrido: pelo menos 1 sequência de construção a cada `corrido_janela_s` (entre as com mais passes, ≥ `corrido_passes`),
   *  mostrada até `corrido_max_s`. */
  corrido_janela_s: 360, corrido_passes: 5, corrido_max_s: 20,
  /** Fracção mínima do tempo mostrado em jogo corrido (com margem sobre os 20% da secção 2.2). */
  corrido_min: 0.22,
  /** Pontuação de importância. */
  pontos: { golo: 100, penalti: 90, vermelho: 85, remate_perigoso: 60, defesa_dificil: 55, contra_ataque: 50, livre_directo: 45, remate_enquadrado: 35, canto: 30, cruzamento_perigoso: 30, amarelo: 25, corte_area: 20 },
  /** Remate perigoso (prioridade alta): xG ≥ isto; defesa difícil: remate com xG ≥ isto defendido. */
  xg_alto: 0.15, xg_defesa: 0.08,
  /** Contra-ataque: recuperação antes de x (referencial de quem ataca) e remate/cruzamento até s segundos depois. */
  contra_x: 50, contra_s: 12,
  /** Avanço rápido entre lances (fixo, não depende da velocidade escolhida) e replay dos golos (s antes do golo, a 0,5×). */
  avanco_rapido: 16, replay_s: 6, replay_vel: 0.5,
  /** "Só relato" entre lances (nível Lances-chave): segundos por intervalo. */
  relato_s: 4.5,
  /** Orçamento do nível "Alargados" (min a 1×, incluindo o avanço rápido entre lances) e a tolerância. */
  orcamento_min: 15, tolerancia_min: 1,
};
