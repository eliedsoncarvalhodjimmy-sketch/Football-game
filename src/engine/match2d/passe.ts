// Camada 5 na Fase 2 (secções 7.2–7.4): o portador só faz passes curtos. Escolhe o colega com a melhor linha de passe,
// pesando o sucesso previsto (com erro de leitura pela Visão), o ganho de ameaça (mapa V) e o risco; executa com erro
// pela técnica, distância e pressão. O sucesso real não se sorteia: a bola viaja e quem lá chegar primeiro fica com ela.
import { PASSE, AMEACA, DECISAO_PORTADOR } from '../../config/match2d/bola.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { aleatorio } from '../decision/rng.ts';
import { preverTrajectoria, velocidadePasse, tempoChegada } from './bola.ts';
import { paraEquipa, dist } from './referencial.ts';
import type { Estado2D, Jogador2D, V2 } from './tipos.ts';

const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;
/** Normal aproximada (soma de 3 uniformes), determinística pela chave. */
export const normal = (chave: string) => (aleatorio(chave + '|1') + aleatorio(chave + '|2') + aleatorio(chave + '|3') - 1.5) * 2;

/** Mapa de ameaça V (secção 7.2), no referencial da equipa. */
export function ameaca(p: V2): number {
  const A = AMEACA, x = Math.max(0, Math.min(CAMPO_2D.comprimento, p.x)), dy = Math.abs(p.y - CAMPO_2D.largura / 2);
  let v = A.base + A.escala * Math.pow(x / CAMPO_2D.comprimento, A.expoente) * (1 - (A.largura * Math.min(dy, 34)) / 34);
  if (x > CAMPO_2D.comprimento - 16.5 && dy < 20.15) v += A.area;
  if (x > CAMPO_2D.comprimento - 5.5 && dy < 9.15) v += A.pequena_area;
  return v;
}

/** Pressão sobre o portador: um adversário a menos de x m. */
export const pressionado = (s: Estado2D, j: Jogador2D, m = DECISAO_PORTADOR.pressao_m) => s.jogadores.some((o) => o.equipa !== j.equipa && dist(o.p, j.p) < m);

/** Tempo de decisão do portador (s): tempoBaseEstilo × (1,3 − 0,02 × Decisões) × pressão. */
export function tempoDecisao(s: Estado2D, j: Jogador2D): number {
  return ESTILOS_2D[s.equipas[j.equipa].estilo].tempoBaseBola * (1.3 - 0.02 * at(j, 'dec')) * (pressionado(s, j) ? DECISAO_PORTADOR.pressao_factor : 1);
}

export interface OpcaoPasse { receptor: Jogador2D; destino: V2; v0: number; sucesso: number; pontuacao: number; folga: number }

/** Folga do passe: o menor (tempo do adversário − tempo da bola) ao longo da trajectória até ao receptor (s). */
function folgaPasse(s: Estado2D, de: V2, destino: V2, v0: number, equipa: 0 | 1): number {
  const d = dist(de, destino), u = { x: (destino.x - de.x) / d, y: (destino.y - de.y) / d };
  const traj = preverTrajectoria(de, { x: u.x * v0, y: u.y * v0 });
  let folga = Infinity;
  for (const q of traj) {
    if (dist(de, q.p) > d + 1) break;
    for (const o of s.jogadores) if (o.equipa !== equipa) folga = Math.min(folga, tempoChegada(o, q.p) - q.t);
  }
  return folga;
}

/** Avalia os passes curtos possíveis (melhor primeiro). */
export function avaliarPasses(s: Estado2D, j: Jogador2D): OpcaoPasse[] {
  const P = ESTILOS_2D[s.equipas[j.equipa].estilo];
  const meus = s.jogadores.filter((o) => o.equipa === j.equipa && o !== j);
  const perto = (max: number) => meus.filter((o) => { const d = dist(o.p, j.p); return d >= PASSE.min && d <= max; });
  let cands = perto(PASSE.curto_max);
  if (!cands.length) cands = perto(PASSE.curto_max_recurso);
  // Os 6 mais promissores: perto e com espaço.
  const espaco = (o: Jogador2D) => Math.min(...s.jogadores.filter((x) => x.equipa !== j.equipa).map((x) => dist(x.p, o.p)));
  cands = cands.map((o) => ({ o, h: espaco(o) - 0.3 * Math.abs(dist(o.p, j.p) - 13) })).sort((a, b) => b.h - a.h).slice(0, PASSE.candidatos).map((c) => c.o);
  const origem = paraEquipa(j.equipa, j.p), vOrigem = ameaca(origem);
  const aversao = origem.x < 35 ? P.aversaoRiscoProprioTerco : origem.x < 70 ? (P.aversaoRiscoProprioTerco + 0.5) / 2 : 0.5;
  const ruidoDec = DECISAO_PORTADOR.ruido_base * (21 - at(j, 'dec')) / 20, ruidoVis = PASSE.leitura_ruido_s * (21 - at(j, 'vis')) / 20;
  const out: OpcaoPasse[] = [];
  for (const r of cands) {
    const d = dist(j.p, r.p), v0 = velocidadePasse(d), tViagem = d / v0;
    // Ao pé do receptor, um pouco à frente se ele se estiver a mexer.
    const destino = { x: r.p.x + r.v.x * tViagem * 0.6, y: r.p.y + r.v.y * tViagem * 0.6 };
    const folgaReal = folgaPasse(s, j.p, destino, v0, j.equipa);
    const chave = `${j.id}|${s.tick}|${r.id}`;
    const folga = folgaReal + ruidoVis * normal(chave + '|leitura');
    const sucesso = 1 / (1 + Math.exp(-folga / PASSE.folga_escala_s));
    const dest = paraEquipa(j.equipa, destino);
    const valor = ameaca(dest) - vOrigem;
    // Custo de perder a bola onde o passe seria cortado: a ameaça desse ponto para o adversário.
    const custo = ameaca({ x: CAMPO_2D.comprimento - (origem.x + dest.x) / 2, y: CAMPO_2D.largura - (origem.y + dest.y) / 2 });
    const [dMin, dMax] = PASSE.distancia_ideal;
    const conforto = d < dMin ? -(dMin - d) / 10 : d > dMax ? -(d - dMax) / 15 : 0;
    const pontuacao = P.pesoPasseCurto * (sucesso * (1 + PASSE.peso_valor * valor) - (1 - sucesso) * custo * 10 * aversao)
      + conforto + (r.chave === 'GR' ? PASSE.peso_gr : 0) + ruidoDec * normal(chave + '|decisao');
    out.push({ receptor: r, destino, v0, sucesso, pontuacao, folga: folgaReal });
  }
  return out.sort((a, b) => b.pontuacao - a.pontuacao);
}

/** Execução (secção 7.4): erro no ângulo e na velocidade pela técnica, distância e pressão. Devolve a velocidade da bola. */
export function executarPasse(s: Estado2D, j: Jogador2D, o: OpcaoPasse): V2 {
  const d = dist(j.p, o.destino), q = (at(j, 'pas') + at(j, 'tec')) / 2;
  const sigma = (PASSE.erro_ang_base + PASSE.erro_ang_ponto * Math.max(0, 20 - q)) * (1 + d / 40) * (1 + (pressionado(s, j, PASSE.pressao_m) ? PASSE.pressao_factor : 0));
  const chave = `${j.id}|${s.tick}|exec`;
  const ang = Math.atan2(o.destino.y - s.bola.p.y, o.destino.x - s.bola.p.x) + sigma * normal(chave + '|ang');
  const v = o.v0 * (1 + PASSE.erro_vel * normal(chave + '|vel') * (1.3 - q / 20));
  return { x: Math.cos(ang) * v, y: Math.sin(ang) * v };
}
