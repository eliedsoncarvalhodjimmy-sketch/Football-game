// Staff (cargos do utilizador: data/staff/cargos.md e src/config/cargos.ts). Cada membro tem atributos 1–20 do seu cargo;
// "nivel" é a média (para salário e mercado). Efeitos limitados (neutros em 10). O treinador principal vive em coaches/.
import { CARGOS_STAFF } from './cargos.ts';

export const CARGOS = ['chefe_juvenil', 'treinador_sub21', 'treinador_sub18', 'chefe_recrutamento', 'olheiro', 'olheiro_jovens', 'treinador_assistente', 'coach', 'treinador_gr', 'preparador_fisico', 'fisioterapeuta', 'diretor_financeiro', 'diretor_comercial'] as const;
export type Cargo = (typeof CARGOS)[number];

export const NOME_CARGO = Object.fromEntries(CARGOS_STAFF.map((c) => [c.id, c.nome])) as Record<Cargo, string>;

export const STAFF = {
  /** Nível gerado ~ N(base + por_reputação × reputação/100, desvio); cada atributo ~ N(nível, desvio_atributo). */
  nivel_base: 4,
  nivel_por_reputacao: 12,
  desvio: 2.5,
  desvio_atributo: 2.2,
  /** Olheiros (aprovado): 1 por cada 2 níveis do Recrutamento, máximo 5. Olheiros de jovens: 0–3 pela reputação (1 por cada x). */
  olheiros_por_niveis: 2,
  olheiros_max: 5,
  olheiros_jovens_reputacao: 25,
  olheiros_jovens_max: 3,
  /** Salário anual = receita do clube × peso do cargo × (0,5 + nível/20), mínimo. */
  peso_salario: {
    chefe_juvenil: 0.002, treinador_sub21: 0.0015, treinador_sub18: 0.0012, chefe_recrutamento: 0.002, olheiro: 0.0008, olheiro_jovens: 0.0006,
    treinador_assistente: 0.004, coach: 0.0015, treinador_gr: 0.0015, preparador_fisico: 0.002, fisioterapeuta: 0.002, diretor_financeiro: 0.003, diretor_comercial: 0.003,
  } as Record<Cargo, number>,
  salario_minimo: 15_000,
  anos: [1, 4] as [number, number],
  livres: 2000,
  compensacao: 0.5,
  melhoria_minima: 3,
  prob_melhoria: 0.25,
  outros_fraccao: 0.03,
};

/** Efeitos (fracção por ponto acima/abaixo de 10; limites). */
export const EFEITOS_STAFF = {
  /** Assistente: cada atributo do treinador abaixo do atributo correspondente do assistente sobe x da diferença. */
  adjunto: 0.3,
  /** Treinador de GR (treino de guarda-redes): pontos de desenvolvimento por ponto acima de 10. */
  treinador_gr: 0.3,
  /** Preparador físico e fisioterapeuta (prevenção de lesões): taxa de lesões × (1 − x × (melhor − 10)). */
  preparador_fisico: 0.015,
  /** Fisioterapeuta (fisioterapia): dias de lesão × (1 − x × (nível − 10)). */
  medico: 0.015,
  /** Coach: na área "Táctica", soma à parcela do treinador (como o antigo analista); nas outras áreas, ao desenvolvimento dos atributos da área. */
  coach_tactica: 0.0015,
  coach_area_evolucao: 0.15,
  /** Olheiros: adaptabilidade acelera a familiaridade com ligas estrangeiras (× (0,7 + 0,6 × adapt/20)); quantidade = observações × (0,7 + 0,6 × q/20). */
  limite: 0.15,
};
