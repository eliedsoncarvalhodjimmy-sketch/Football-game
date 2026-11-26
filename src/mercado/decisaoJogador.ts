// Decisão do jogador (Prompt 4, Bloco A): aceitar ou recusar uma mudança; descontentamento.
// O jogador conhece os seus próprios atributos ocultos (ambição, profissionalismo); os clubes não.
import { DECISAO as D } from '../config/decisaoJogador.ts';
import { GIGANTES } from '../config/negociacao.ts';
import { CONTRATO } from '../config/contratosJogador.ts';
import { IDADE_DECISAO } from '../config/scouting.ts';
import type { Rng } from '../core/rng.ts';
import type { World } from '../engine/world.ts';
import type { Mercado } from './mercado.ts';

export interface PropostaJogador {
  clube: number;
  salario: number;
  minutos: number; // fracção prometida
}

/** Pontuação de uma proposta face a ficar (> limiar → aceita). Devolve também as parcelas, para o relato. */
export function pontuarProposta(w: World, m: Mercado, j: number, p: PropostaJogador, dia: number): { total: number; parcelas: Record<string, number> } {
  const st = w.jogadores!, e = w.economia!;
  const actual = st.clube[j];
  const amb = st.oculto(j, 'amb'), prof = st.oculto(j, 'prof');
  const rep = (c: number) => (c >= 0 ? w.reputacao[c] : 0);
  const fd = (c: number) => (c >= 0 && w.liga[c] >= 0 ? w.ligas[w.liga[c]].regras.forca_desportiva : 0);
  const europa = (c: number) => (c >= 0 && w.liga[c] >= 0 && w.ligas[w.liga[c]].regras.nivel === 1 && rep(c) >= 70 ? 1 : 0);
  // Livre: compara com o último salário, que desce com os meses sem clube (até ao mínimo); sem histórico, metade da oferta.
  const ant = actual < 0 ? m.contratos.salarioAnterior.get(j) : undefined;
  const meses = actual < 0 ? Math.max(0, dia - m.contratos.livreDesde[j]) / 30 : 0;
  const salLivre = ant ? ant * Math.max(CONTRATO.livre_minimo, 1 - CONTRATO.livre_desconto_mes * meses) : 0.5 * p.salario;
  const salAct = Math.max(1, actual >= 0 ? st.salario[j] : salLivre);
  // Os mais velhos pesam mais o salário e menos o prestígio.
  const da = st.idade(j, dia) - IDADE_DECISAO.referencia;
  const fSal = Math.max(0.5, 1 + IDADE_DECISAO.salario_por_ano * da), fPre = Math.max(0.2, 1 - IDADE_DECISAO.prestigio_por_ano * da);
  const parcelas: Record<string, number> = {
    salario: fSal * D.salario * Math.log(Math.max(0.2, p.salario / salAct)),
    projecto: D.projecto * (1 + D.ambicao * (amb - 10)) * (((e.ia?.ambicao[p.clube] ?? 0.5) - (actual >= 0 ? e.ia?.ambicao[actual] ?? 0.5 : 0)) * 1.5),
    // Exigência de projecto: um jogador premiado pesa mais a grandeza do clube (Prompt 8, Bloco C).
    prestigio: fPre * D.prestigio * (w.prestigio?.exigencia(j, dia) ?? 1) * (1 + D.ambicao * (amb - 10)) * ((rep(p.clube) - rep(actual)) / 25 + (fd(p.clube) - fd(actual)) / 60 + 0.4 * (europa(p.clube) - europa(actual))),
    minutos: D.minutos * (p.minutos - minutosEsperados(w, m, j)),
    ligacao: -D.ligacao * (1 + D.profissionalismo * (prof - 10)) * (actual >= 0 ? Math.min(1.5, (dia - m.contratos.chegada[j]) / 1460) : 0),
    descontentamento: actual >= 0 ? m.contratos.descontentamento[j] / 100 : 0,
    agente: D.agente * 0.3,
    descida: descida(w, m, j, p, dia, salAct),
  };
  return { total: Object.values(parcelas).reduce((a, b) => a + b, 0), parcelas };
}

export function aceita(w: World, m: Mercado, j: number, p: PropostaJogador, dia: number, rng: Rng): boolean {
  return pontuarProposta(w, m, j, p, dia).total > D.limiar + rng.normal(0, D.ruido);
}

/** Um titular de um gigante recusa descer de reputação (Prompt 6, fecho): penalização pela diferença de reputação e pela
 *  importância do clube actual; não conta com salário enorme, em fim de carreira ou sem minutos (descontente). */
function descida(w: World, m: Mercado, j: number, p: PropostaJogador, dia: number, salAct: number): number {
  const st = w.jogadores!, G = GIGANTES, Dd = G.descida;
  const actual = st.clube[j];
  if (actual < 0 || w.reputacao[actual] < G.reputacao_min) return 0;
  const dif = w.reputacao[actual] - w.reputacao[p.clube];
  if (dif < Dd.diferenca) return 0;
  if (!m.planos.porClube.get(actual)?.lugar.get(j)?.titular) return 0;
  if (p.salario >= Dd.salario_enorme * salAct || st.idade(j, dia) >= Dd.idade_fim || m.contratos.descontentamento[j] >= Dd.descontente) return 0;
  const importancia = Math.min(1, (w.reputacao[actual] - G.reputacao_min) / (G.reputacao_max - G.reputacao_min));
  return -Dd.peso * (dif / 10) * (0.5 + 0.5 * importancia);
}

/** Fracção de minutos que o jogador espera no clube actual (pela ordem no plantel). */
export function minutosEsperados(w: World, m: Mercado, j: number): number {
  const st = w.jogadores!;
  const c = st.clube[j];
  if (c < 0) return 0;
  const est = m.contratos.nomeEstatuto(j);
  return CONTRATO.minutos_prometidos[est] ?? 0.3;
}

/** Salário que o jogador pede (renovação ou mudança): mercado × rendimento, com a estrutura do clube como referência. */
export function salarioPedido(w: World, j: number, base: number, dia: number): number {
  const st = w.jogadores!;
  const jogos = st.eJogos[j];
  const nota = jogos ? st.eNotas[j] / jogos / 10 : 6.6;
  const f = 1 + Math.min(CONTRATO.renovacao_maximo, Math.max(0, (nota - 6.8) * 10 * CONTRATO.renovacao_por_decima));
  // Prestígio dos prémios (Prompt 8, Bloco C): o pedido sobe 5 a 10% para os vencedores.
  return Math.round((base * f * (w.prestigio?.salario(j, dia) ?? 1)) / 1000) * 1000;
}

/** Descontentamento mensal: minutos abaixo do prometido sobem-no; a moral desce com ele; acima do limiar pede para sair. */
export function actualizarDescontentamento(w: World, m: Mercado, j: number, parteMinutos: number) {
  const st = w.jogadores!;
  const prometido = minutosEsperados(w, m, j);
  const prof = st.oculto(j, 'prof');
  let d = m.contratos.descontentamento[j];
  if (parteMinutos < prometido - 0.15) d += D.falta_minutos * (1.5 - prof / 20);
  else d -= 4;
  d = Math.max(0, Math.min(100, d));
  m.contratos.descontentamento[j] = d;
  if (d > 40) st.moral[j] = Math.max(1, st.moral[j] - Math.round(D.moral_por_descontentamento * (d - 40)));
  if (d >= D.pede_saida && m.contratos.listado[j] === 0) m.contratos.listado[j] = 2;
}
