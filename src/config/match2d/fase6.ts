// Motor 2D táctico — Fase 6 (docs/tactics/MOTOR_2D.md, secção 13): integração no jogo do utilizador.

/** O jogo do utilizador no modo detalhado (motor 2D). Os modificadores do modo rápido (moral, forma, treinador, forma
 *  da época) multiplicam os atributos com este peso; a equipa da casa tem uma vantagem (fracção dos atributos). */
export const JOGO_2D = {
  /** Liga o motor 2D aos jogos do clube do utilizador (os outros jogos continuam no modo rápido). */
  activo: true,
  peso_modificadores: 1,
  /** Força relativa: os atributos multiplicam por (2 × força / (força + força do adversário)) ^ amplificacao. */
  amplificacao: 0.8,
  vantagem_casa: 0.13,
  /** Os clubes reais marcam menos no motor 2D do que no modo rápido (atributos de finalização mais baixos do que nos
   *  plantéis de teste): estes atributos multiplicam por isto para as médias de golos baterem. */
  finalizacao: 1.25, atributos_finalizacao: ['fin', 'cmp', 'rld', 'cab'] as string[],
  atributo_max: 20,
};
