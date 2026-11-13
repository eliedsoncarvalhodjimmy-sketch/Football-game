// Staff técnico e médico (Prompt 3, Bloco C). Nível 1–20; efeitos limitados (neutros no nível 10).
export const CARGOS = ['adjunto', 'treinador_gr', 'preparador_fisico', 'medico', 'chefe_scouts', 'scout', 'coordenador_academia', 'analista'] as const;
export type Cargo = (typeof CARGOS)[number];

export const NOME_CARGO: Record<Cargo, string> = {
  adjunto: 'Treinador adjunto', treinador_gr: 'Treinador de guarda-redes', preparador_fisico: 'Preparador físico', medico: 'Médico / fisioterapeuta',
  chefe_scouts: 'Chefe de scouts', scout: 'Scout', coordenador_academia: 'Coordenador da academia', analista: 'Analista',
};

export const STAFF = {
  /** Nível gerado ~ N(base + por_reputação × reputação/100, desvio). */
  nivel_base: 4,
  nivel_por_reputacao: 12,
  desvio: 2.5,
  /** Scouts por clube: 1 + reputação/20 (até 6). */
  scouts_por_reputacao: 20,
  scouts_max: 6,
  /** Analista só em clubes com reputação ≥ x. */
  analista_reputacao: 35,
  /** Salário anual = receita do clube × peso do cargo × (0,5 + nível/20), mínimo. */
  peso_salario: { adjunto: 0.004, treinador_gr: 0.0015, preparador_fisico: 0.002, medico: 0.002, chefe_scouts: 0.002, scout: 0.0008, coordenador_academia: 0.002, analista: 0.0015 } as Record<Cargo, number>,
  salario_minimo: 15_000,
  /** Contratos: anos. */
  anos: [1, 4] as [number, number],
  /** Staff livre gerado (reserva) e compensação paga ao clube de origem quando se contrata staff empregado (× salário anual). */
  livres: 2000,
  compensacao: 0.5,
  /** A IA tenta melhorar um cargo por época se o orçamento de staff tiver folga e houver alguém com mais x níveis. */
  melhoria_minima: 3,
  /** Probabilidade anual de a IA tentar melhorar um cargo. */
  prob_melhoria: 0.25,
  /** Outros custos de staff (pessoal não técnico, departamentos): fracção da receita. */
  outros_fraccao: 0.03,
};

/** Efeitos (fracção por nível acima/abaixo de 10; limites). */
export const EFEITOS_STAFF = {
  /** Adjunto: atenua as fraquezas do treinador — cada atributo do treinador abaixo do nível do adjunto sobe x da diferença. */
  adjunto: 0.3,
  /** Treinador de GR: soma ao "desenvolvimento" na evolução dos guarda-redes (pontos por nível acima de 10). */
  treinador_gr: 0.3,
  /** Preparador físico: taxa de lesões × (1 − x × (nível − 10)). */
  preparador_fisico: 0.015,
  /** Médico: dias de lesão × (1 − x × (nível − 10)). */
  medico: 0.015,
  /** Analista: soma à parcela "treinador" dos modificadores (fracção por nível acima de 10), dentro do limite do treinador. */
  analista: 0.0015,
  /** Limite de cada factor (fracção). */
  limite: 0.15,
};
