// Evolução mensal dos jogadores (Fase 2, Bloco A). Valores em pontos de OVR por mês.
//   crescimento = taxa(idade) × (potencial − OVR) × minutos × treinador × personalidade + ruído
//   declínio    = −declinio(idade ajustada) × (1 − protecção pelo profissionalismo) + ruído
// Pico entre os 25 e os 29 anos; declínio por volta dos 33; guarda-redes envelhecem 3 anos mais tarde.
// Ninguém ultrapassa o potencial.
export const EVOLUCAO = {
  /** Fracção da distância ao potencial ganha por mês, por idade. */
  taxa_crescimento: (a: number) => (a < 21 ? 0.018 : a < 24 ? 0.021 : a < 27 ? 0.018 : a < 29 ? 0.01 : 0),
  /** Perda de OVR por mês, por idade (idade dos GR reduzida em `atraso_gr`). */
  declinio: (a: number) => (a < 30 ? 0 : a < 32 ? 0.06 : a < 33 ? 0.12 : a < 35 ? 0.22 : a < 37 ? 0.34 : 0.5),
  atraso_gr: 3,
  /** Profissionalismo 20 reduz o declínio em 40%; 1 aumenta-o em 20%. */
  protecao_prof: (prof: number) => 1.2 - (prof - 1) / 19 * 0.6,
  /** Minutos: 0 minutos → 0,6; titular habitual → 1,2. `parte` = fracção dos minutos possíveis no mês. */
  factor_minutos: (parte: number) => 0.6 + 0.6 * Math.min(1, Math.max(0, parte)),
  /** Treinador: desenvolvimento de jovens 20 → +25%; 1 → −25% (a partir dos 10). */
  factor_treinador: (desenvolvimento: number) => 1 + ((desenvolvimento - 10) / 10) * 0.25,
  /** Profissionalismo e ambição (média) 20 → +20%; 1 → −20%. */
  factor_personalidade: (prof: number, amb: number) => 1 + (((prof + amb) / 2 - 10.5) / 9.5) * 0.2,
  ruido: 0.12,
  /** Sem dados de minutos (antes do Bloco B): parte estimada pela ordem no plantel. */
  parte_minutos_padrao: { titular: 0.85, suplente: 0.3 },
  /** Atributos que mais caem com a idade (físicos) e que ainda podem subir (mentais). */
  declinio_fisico: ['ace', 'vel', 'agi', 'res', 'imp', 'equ'],
  mentais_tardios: ['dec', 'ant', 'pos', 'cmp', 'lid', 'con'],
  /** Aposentação (por época): probabilidade por idade; obrigatória aos 40. */
  prob_aposentacao: (a: number, gr: boolean) => {
    const x = gr ? a - 2 : a;
    return x < 33 ? 0 : x < 35 ? 0.12 : x < 37 ? 0.35 : x < 38 ? 0.6 : 1;
  },
};
