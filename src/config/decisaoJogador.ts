// Decisão do jogador (Prompt 4, Bloco A): aceita ou recusa por pontuação; descontentamento.
export const DECISAO = {
  /** Pesos da pontuação (mudança face a ficar). */
  salario: 1.2,
  projecto: 0.8,
  prestigio: 1.0,
  minutos: 0.9,
  ligacao: 0.6,
  agente: 0.3,
  /** Aceita se pontuação > limiar (+ ruído). */
  limiar: 0.15,
  ruido: 0.25,
  /** Ambição (oculto 1–20): pesa o prestígio e o projecto; profissionalismo pesa a ligação e reduz o descontentamento. */
  ambicao: 0.06,
  profissionalismo: 0.04,
  /** Descontentamento (0–100): sobe com falta de minutos (abaixo do prometido), promessas quebradas e ambição falhada; acima de x pede para sair. */
  falta_minutos: 6,
  pede_saida: 70,
  moral_por_descontentamento: 0.05,
};
