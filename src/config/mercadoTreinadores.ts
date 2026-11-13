// Mercado de treinadores (Prompt 3, Bloco C).
export const MERCADO_TREINADORES = {
  /** Treinadores livres no mundo (gerados; a reserva é reposta todos os anos). */
  livres: 1500,
  /** Reforma: a partir dos 65 anos, probabilidade anual a subir até 1 aos 70. */
  reforma_inicio: 65,
  reforma_fim: 70,
  /** Idade dos treinadores gerados (livres novos: mais novos). */
  idade: [38, 64] as [number, number],
  idade_novos: [34, 48] as [number, number],
  /** Reputação inicial = 0,65 × reputação do clube + 2 × (média dos atributos − 10) + ruído. */
  reputacao_clube: 0.65,
  reputacao_atributos: 2,
  reputacao_ruido: 6,
  /** Reputação depois de cada época: + k × (posição esperada − posição real) / nº de clubes × 20, + títulos; limitada a ±8 por época. */
  reputacao_desempenho: 0.6,
  reputacao_titulo: 4,
  reputacao_max_variacao: 8,
  /** Salário (€/ano) = fracção da receita do clube × (0,6 + 0,8 × reputação/100). */
  salario_fraccao_receita: 0.018,
  salario_minimo: 30_000,
  /** Contrato: anos (inteiro uniforme) e cláusula de rescisão = salário × anos restantes × x. */
  anos: [1, 4] as [number, number],
  clausula: 1.5,
  /** Bons treinadores recusam projectos fracos: P(aceita) = σ((reputação do clube + folga − reputação do treinador)/escala + (imagem do clube − 50)/25). */
  aceita_folga: 12,
  aceita_escala: 5,
  /** Clubes grandes podem ir buscar treinadores empregados em clubes mais pequenos (pagam a cláusula): só se a reputação do clube for ≥ x e a do outro clube ≤ clube − y. */
  roubar_reputacao: 70,
  roubar_diferenca: 12,
  /** Candidatos avaliados por vaga (amostra dos livres + empregados elegíveis). */
  candidatos: 150,
};

/** Confiança no treinador (0–100) e despedimentos. */
export const CONFIANCA = {
  inicial: 65,
  /** Mensal: + x × (posição esperada − posição actual) / nº de clubes × 10 (desempenho face à ordem de reputação, ajustada pelo objectivo). */
  por_desempenho: 1.6,
  /** Puxa para 60 devagar (meses bons e maus esquecem-se). */
  regresso: 0.1,
  /** Eventos: título, subida, título continental, descida. */
  titulo: 25,
  subida: 20,
  continental: 30,
  descida: -35,
  /** Abaixo disto (× paciência do dono e do arquétipo) o clube despede por resultados, com probabilidade mensal p, depois de N jornadas. */
  limiar: 28,
  limiar_maximo: 48,
  prob_despedir: 0.45,
  jornadas_minimas: 6,
  /** Um treinador novo não é despedido por resultados nos primeiros N dias. */
  carencia_dias: 120,
  /** Fim de contrato: renova se a confiança for ≥ x. */
  renova: 50,
  /** Dono novo: despede o treinador com probabilidade (interferência/20) × x, se a confiança for < 70. */
  dono_novo: 0.6,
};

/** Despedimentos: motivos e indemnizações. */
export const DESPEDIMENTO = {
  /** Por resultados: paga o contrato restante. */
  resultados: 1.0,
  /** Justa causa (indisciplina, escândalo, incumprimento grave): sem indemnização ou reduzida; justa causa fraca → litígio que o clube perde com probabilidade p (paga tudo + 20%). */
  justa_causa: 0.1,
  litigio_prob_fraca: 0.6,
  litigio_custo: 1.2,
  /** Probabilidade anual de um caso de justa causa (indisciplina/escândalo) por treinador, × (1,5 − disciplina/20). */
  justa_causa_anual: 0.02,
  /** Mútuo acordo: paga 30–70% do restante. */
  mutuo: [0.3, 0.7] as [number, number],
  /** Imagem do clube junto dos treinadores (0–100): − por despedimento (mais se for sem pagar), recupera devagar. */
  imagem_inicial: 60,
  imagem_por_despedimento: -6,
  imagem_justa_causa_fraca: -10,
  imagem_recuperacao: 3,
};

/** Choque de filosofia: o treinador cumpre em parte, a moral desce e pode pedir para sair ou entrar em conflito público. */
export const FILOSOFIA = {
  /** Compatibilidade = peso do perfil do treinador no arquétipo do clube; abaixo disto há choque. */
  choque_abaixo: 0.75,
  /** Moral do treinador (0–100): − por mês de choque, × (1,5 − adaptabilidade/20). */
  moral_por_mes: 4,
  /** Quanto cede (0–1) = 0,5 + (reputação do clube − autoridade do treinador × 5)/100. */
  /** Moral abaixo disto: pede para sair (mútuo acordo) ou conflito público (se a autoridade dele for alta). */
  moral_saida: 25,
  conflito_autoridade: 14,
  /** Conflito com o utilizador (interferência do Prompt 2) em crise: o treinador demite-se. */
  demite_se_conflito: true,
};
