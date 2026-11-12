// Coeficiente UEFA dentro do jogo (aproximação ao sistema da UEFA).
// Por clube: vitória 2 pontos, empate 1 (no play-off de acesso, metade);
// bónus por fase alcançada; a UECL vale metade. Coeficiente da associação =
// soma dos pontos dos seus clubes ÷ nº de clubes que entraram.
export const COEFICIENTE = {
  vitoria: 2,
  empate: 1,
  fator_acesso: 0.5,
  bonus_fase: { oitavos: 1, quartos: 2, meias: 3, final: 4, vencedor: 5 } as Record<string, number>,
  fator_competicao: { UCL: 1, UEL: 1, UECL: 0.5 } as Record<string, number>,
};
