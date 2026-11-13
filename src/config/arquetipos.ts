// Personalidade e filosofia do clube (Prompt 3, Bloco C). Editável por clube em arquetipos.csv.
export const ARQUETIPOS = ['formador', 'comprador_estrelas', 'analitico', 'magnata_impaciente', 'tradicional', 'vendedor'] as const;
export type Arquetipo = (typeof ARQUETIPOS)[number];

export const NOME_ARQUETIPO: Record<Arquetipo, string> = {
  formador: 'Formador', comprador_estrelas: 'Comprador de estrelas', analitico: 'Analítico', magnata_impaciente: 'Magnata impaciente', tradicional: 'Tradicional', vendedor: 'Clube-vendedor',
};

export type ReaccaoCrise = 'cortar_salarios' | 'endividar_despedir' | 'vender_melhor' | 'aguentar' | 'vender_pico' | 'arriscar_ffp';

export interface ParametrosArquetipo {
  /** Somado à massa salarial alvo do dono (fracção da receita). */
  massa: number;
  /** Aceita passar o balizador do fair play (pesa o custo esperado: no regime actual só aviso). */
  arriscaFFP: boolean;
  /** Paciência com o treinador (multiplica a do dono). */
  paciencia: number;
  /** Perfis de treinador: peso na escolha (> 1 preferidos; < 0,75 incompatíveis: choque de filosofia; os não listados valem 1). */
  perfis: Partial<Record<string, number>>;
  /** Uso da academia 0–1 (o efeito entra no Prompt 4). */
  academia: number;
  /** Somado à política de dívida do dono (fracção da receita). */
  divida: number;
  /** Peso do orçamento de infraestruturas (× ambição do dono). */
  infra: number;
  crise: ReaccaoCrise;
}

export const PARAMETROS: Record<Arquetipo, ParametrosArquetipo> = {
  formador: { massa: -0.04, arriscaFFP: false, paciencia: 1.4, perfis: { formador: 2, ofensivo: 1.2, pressao_alta: 1.1, pragmatico: 0.6, contra_ataque: 0.9 }, academia: 0.9, divida: -0.1, infra: 1.2, crise: 'cortar_salarios' },
  comprador_estrelas: { massa: 0.05, arriscaFFP: true, paciencia: 0.8, perfis: { ofensivo: 1.6, gestor: 1.5, pressao_alta: 1.2, formador: 0.7, pragmatico: 0.9 }, academia: 0.2, divida: 0.2, infra: 1.0, crise: 'arriscar_ffp' },
  analitico: { massa: -0.02, arriscaFFP: false, paciencia: 1.1, perfis: { contra_ataque: 1.5, pressao_alta: 1.4, pragmatico: 1.3, gestor: 0.7 }, academia: 0.5, divida: 0, infra: 1.1, crise: 'vender_pico' },
  magnata_impaciente: { massa: 0.06, arriscaFFP: true, paciencia: 0.5, perfis: { gestor: 1.6, ofensivo: 1.3, pragmatico: 1.2, formador: 0.5 }, academia: 0.2, divida: 0.3, infra: 1.0, crise: 'endividar_despedir' },
  tradicional: { massa: 0, arriscaFFP: false, paciencia: 1.2, perfis: { pragmatico: 1.6, gestor: 1.5, contra_ataque: 1.4, pressao_alta: 0.8, ofensivo: 0.9 }, academia: 0.5, divida: 0, infra: 0.9, crise: 'aguentar' },
  vendedor: { massa: -0.05, arriscaFFP: false, paciencia: 1.0, perfis: { formador: 1.6, contra_ataque: 1.4, pragmatico: 1.1, gestor: 0.8 }, academia: 0.8, divida: -0.1, infra: 1.0, crise: 'vender_melhor' },
};

/** As preferências estão equilibradas entre filosofias (média ≈ 1,1–1,2 por perfil), para que o mercado de treinadores não torne o mundo
 *  mais ofensivo ou mais defensivo com os anos (isso mexia na calibração dos golos). */
/** Inércia: o arquétipo só muda se a pontuação nova passar a actual por esta margem, e no máximo uma vez em N anos (excepto eventos: mudança de dono). */
export const INERCIA = { margem: 0.45, anos: 4, ruido: 0.25 };

/** Limites anuais à variação dos orçamentos (fracção), excepto em eventos (dono novo, subida, descida, administração). */
export const LIMITE_ORCAMENTOS = 0.25;
