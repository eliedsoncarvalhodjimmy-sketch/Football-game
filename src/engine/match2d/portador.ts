// Camada 5 (secção 7): decisão completa do portador. Cada opção — passe curto, progressivo, longo, mudança de flanco,
// cruzamento, conduzir, driblar, rematar, proteger, aliviar — recebe a pontuação da secção 7.2:
//   pontuação = pesoEstilo × (sucesso × valor − (1 − sucesso) × custo × aversãoRisco) + ruído(Decisões)
// com valor = V(destino) − V(origem) (mapa de ameaça; num remate, o xG), sucesso = previsão do portador (que erra a
// leitura pela Visão) e custo = ameaça do sítio da perda para o adversário. Escolhe por softmax de temperatura baixa
// entre as 3 melhores. A execução aplica o erro (técnica, distância, pressão) e a bola segue a física.
import { pesoJogadaOpcao } from './jogadas.ts';
import { PORTADOR, DUELO, REMATE, FORA_DE_JOGO, ESTADO_JOGO, pesoOpcaoEstilo, type OpcaoPortador } from '../../config/match2d/fase3.ts';
import { PASSE, DECISAO_PORTADOR, BOLA } from '../../config/match2d/bola.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { aleatorio } from '../decision/rng.ts';
import { preverTrajectoria, velocidadePasse, tempoChegada, lancamentoAereo } from './bola.ts';
import { ameaca, folgaPasse, normal, pressionado } from './passe.ts';
import { linhaForaDeJogo } from './bloco.ts';
import { paraEquipa, paraAbsoluto, dist, hyp } from './referencial.ts';
import type { Estado2D, Jogador2D, V2, Equipa } from './tipos.ts';

const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;
const C = CAMPO_2D;
const logistica = (x: number) => 1 / (1 + Math.exp(-x));
const dentro = (p: V2, m = 2): V2 => ({ x: Math.max(m, Math.min(C.comprimento - m, p.x)), y: Math.max(m, Math.min(C.largura - m, p.y)) });

export interface Escolha {
  tipo: OpcaoPortador; pontuacao: number; sucesso: number; valor: number;
  receptor?: Jogador2D; destino?: V2; aereo?: boolean; altura?: number; xg?: number; defensor?: Jogador2D; foraDeJogo?: boolean;
}

/** xG estimado (secção 7.2 usa-o como valor do remate): distância, ângulo da baliza, pressão e bloqueios. */
export function xgEstimado(s: Estado2D, j: Jogador2D, cabeca = false): number {
  const o = paraEquipa(j.equipa, j.p), gx = C.comprimento, gy = C.largura / 2;
  const d = hyp(gx - o.x, gy - o.y);
  const ang = Math.abs(Math.atan2(gy + REMATE.meia_baliza - o.y, gx - o.x) - Math.atan2(gy - REMATE.meia_baliza - o.y, gx - o.x));
  let xg = REMATE.xg_escala * Math.exp(-d / REMATE.xg_k) * Math.min(1.1, Math.pow(ang / 0.64, 0.55));
  const adv = s.jogadores.filter((q) => q.equipa !== j.equipa && q.chave !== 'GR');
  if (adv.some((q) => dist(q.p, j.p) < 2)) xg *= 1 - REMATE.xg_pressao;
  const baliza = paraAbsoluto(j.equipa, { x: gx, y: gy });
  const bloqueios = adv.filter((q) => dist(q.p, j.p) < d && distSeg(q.p, j.p, baliza) < 1).length;
  xg *= Math.pow(1 - REMATE.xg_bloqueio, bloqueios);
  if (cabeca) xg *= 0.6;
  return Math.max(0.005, Math.min(0.9, xg));
}

export function distSeg(p: V2, a: V2, b: V2): number {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy;
  let t = l2 > 0 ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return hyp(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

/** Folga de um passe pelo ar: só se joga a bola onde está abaixo da altura da cabeça (início e queda). */
function folgaAerea(s: Estado2D, de: V2, destino: V2, h: number, equipa: Equipa): number {
  const d = dist(de, destino), l = lancamentoAereo(d, h), u = { x: (destino.x - de.x) / d, y: (destino.y - de.y) / d };
  const traj = preverTrajectoria(de, { x: u.x * l.vh, y: u.y * l.vh }, 0, l.vz);
  let folga = Infinity;
  // Quem está ao alcance do percurso logo à saída do pé (o defensor encostado ao portador) corta-o já.
  if (traj.length) for (const o of s.jogadores) if (o.equipa !== equipa && distSeg(o.p, de, traj[0].p) <= BOLA.alcance) folga = Math.min(folga, -0.1);
  for (const q of traj) {
    if (dist(de, q.p) > d + 4) break;
    if (q.z > BOLA.z_cabeca) continue;
    for (const o of s.jogadores) if (o.equipa !== equipa) folga = Math.min(folga, tempoChegada(o, q.p, dist(o.p, q.p) > BOLA.alcance + 1.5) - q.t);
  }
  return folga;
}

/** Desvio do ângulo do passe (rad), pela técnica, distância e pressão (secção 7.4). */
export function sigmaPasse(s: Estado2D, j: Jogador2D, d: number, tipo: OpcaoPortador | string, aereo: boolean): number {
  const attr = j.chave === 'GR' ? (aereo || d > 30 ? at(j, 'pon') : at(j, 'jpe')) : tipo === 'CRUZAMENTO' ? at(j, 'cru') : aereo || d > 30 ? (at(j, 'plo') + at(j, 'tec')) / 2 : (at(j, 'pas') + at(j, 'tec')) / 2;
  const pressao = pressionado(s, j, PASSE.pressao_m) ? PASSE.pressao_factor : 0;
  return (PASSE.erro_ang_base + PASSE.erro_ang_ponto * Math.max(0, 20 - attr)) * (1 + d / 40) * (1 + pressao);
}

/** Função de erro (Abramowitz–Stegun 7.1.26). */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** Probabilidade de o passe cair ao alcance do receptor (desvio lateral = σ × d; tolerância maior pelo ar). */
function pAcertar(s: Estado2D, j: Jogador2D, d: number, tipo: OpcaoPortador, aereo: boolean): number {
  const lateral = Math.max(0.05, sigmaPasse(s, j, d, tipo, aereo) * d), tol = aereo ? PORTADOR.tolerancia_ar_m : PORTADOR.tolerancia_m;
  return erf(tol / (lateral * Math.SQRT2));
}

/** Tempo de viagem da bola até ao destino (rasteira ou pelo ar). */
function tempoBola(de: V2, destino: V2, aereo: boolean, h: number): number {
  const d = dist(de, destino);
  if (aereo) return lancamentoAereo(d, h).voo;
  const v0 = velocidadePasse(d), traj = preverTrajectoria(de, { x: ((destino.x - de.x) / d) * v0, y: ((destino.y - de.y) / d) * v0 });
  for (const q of traj) if (dist(de, q.p) >= d - 0.5) return q.t;
  return traj.length ? traj[traj.length - 1].t : d / v0;
}

/** Duelo (Prompt 2): probabilidade de o defensor ganhar. */
export function pDefensorGanha(def: number, ata: number): number {
  return Math.max(DUELO.min, Math.min(DUELO.max, 0.5 + (DUELO.K * (def - ata)) / 20));
}
/** Força do defensor num duelo; com o atacante `a`, vale mais se estiver entre ele e a baliza (lado da baliza). */
export const forcaDefesa = (d: Jogador2D, a?: Jogador2D) => {
  let f = 0.5 * at(d, 'des') + 0.3 * at(d, 'pos') + 0.2 * at(d, 'agr');
  if (a) { const baliza = { x: d.equipa === 0 ? 0 : C.comprimento, y: C.largura / 2 }; if (dist(d.p, baliza) < dist(a.p, baliza) - 0.5) f += DUELO.lado_baliza_bonus; }
  return f;
};
export const forcaDrible = (a: Jogador2D) => 0.5 * at(a, 'dri') + 0.25 * at(a, 'agi') + 0.25 * at(a, 'tec');

/** Todas as opções do portador, com a pontuação (melhor primeiro). */
export function avaliarPortador(s: Estado2D, j: Jogador2D, semente: string): Escolha[] {
  const e = j.equipa, P = ESTILOS_2D[s.equipas[e].estilo], K = PORTADOR.escala;
  const origem = paraEquipa(e, j.p), vOrig = ameaca(origem);
  const eqE = s.equipas[e], m = eqE.mentalidade, EJ = ESTADO_JOGO;
  // Mentalidade: a ganhar mais aversão ao risco e mais paciência; a perder o contrário.
  const aversao = (origem.x < 35 ? P.aversaoRiscoProprioTerco : origem.x < 70 ? (P.aversaoRiscoProprioTerco + 0.5) / 2 : 0.5) * (1 - m * EJ.aversao);
  // Paciência (decisão 191): o valor de manter a posse depende do estilo e cansa-se com os passes seguidos sem progredir;
  // na transição defesa→ataque com "atacar já" alto, não há paciência nenhuma.
  // A ganhar, só os estilos pacientes guardam a bola; um estilo directo ou defensivo fecha-se e joga longo.
  const pac = (P.paciencia ?? 1) * (1 - m * EJ.paciencia * Math.min(1, (P.paciencia ?? 1) ** 2));
  const transicao = eqE.fase === 'TRANS_DEF_ATQ';
  // A transição pesa pela parte do "atacar já" acima de 0,5 (forte no Contra-ataque, nula no Tiki-Taka).
  const atq = transicao ? Math.max(0, P.atacarJa - 0.5) * 2 : 0;
  const posse = transicao ? PORTADOR.valor_posse * (1 - atq) : PORTADOR.valor_posse * pac * Math.max(0.25 * Math.min(1, pac) ** 2, 1 - s.passesSeguidos / (PORTADOR.paciencia_passes * Math.max(0.2, pac)));
  // Quanto custa perder a posse também depende da paciência: um estilo directo não vê drama em perder a bola lá à frente.
  const perdaPosse = Math.min(1, pac);
  const chave = `${semente}|${j.id}|${s.tick}`;
  const ruido = (k: string) => DECISAO_PORTADOR.ruido_base * ((21 - at(j, 'dec')) / 20) * normal(`${chave}|${k}`);
  const leitura = (k: string) => PASSE.leitura_ruido_s * ((21 - at(j, 'vis')) / 20) * normal(`${chave}|${k}|ler`);
  const adv = s.jogadores.filter((o) => o.equipa !== e);
  const advCampo = adv.filter((o) => o.chave !== 'GR');
  const maisPerto = Math.min(...advCampo.map((o) => dist(o.p, j.p)));
  // Ao falhar perde-se também o que se tinha: a ameaça da posição de partida (V(origem)); no remate, o valor já a desconta.
  // O peso do estilo torna a opção mais (ou menos) atractiva: multiplica uma pontuação positiva e divide uma negativa
  // (multiplicar uma negativa por um peso pequeno tornava-a melhor — decisão 190).
  const comPeso = (v: number, w: number) => (v >= 0 ? v * w : v / w);
  // Na transição, as opções que ganham terreno valem (1 + atacarJá) vezes mais (contra-ataque).
  const pesoT = (tipo: OpcaoPortador, valor: number) => pesoOpcaoEstilo(P, tipo) * (transicao && valor > 0 && tipo !== 'PASSE_CURTO' && tipo !== 'PROTEGER' ? 1 + atq : 1);
  // Inclinação do estilo (decisão 191): além de multiplicar, o peso do estilo empurra as opções que ganham terreno — o
  // treinador do Jogo Directo manda bater longo mesmo quando a ameaça em jogo é pequena.
  const inclinacao = (tipo: OpcaoPortador, valor: number) => (valor > 0 ? K * PORTADOR.inclinacao_estilo * (pesoOpcaoEstilo(P, tipo) - 1) : 0);
  const pontuar = (tipo: OpcaoPortador, sucesso: number, valor: number, custo: number, k: string, longe = false) =>
    inclinacao(tipo, valor) + K * comPeso(sucesso * (valor + posse) - (1 - sucesso) * (custo * aversao + (tipo === 'REMATAR' ? 0 : (vOrig + posse) * perdaPosse)), tipo === 'REMATAR' ? pesoOpcaoEstilo(P, tipo, longe) : pesoT(tipo, valor)) + ruido(k);
  const out: Escolha[] = [];
  const fj = linhaForaDeJogo(s, e);

  // Passes (todos os tipos): colegas e, para quem ataca a profundidade, o espaço à frente dele.
  const zonaCruz = origem.x >= PORTADOR.cruzamento_x && Math.abs(origem.y - C.largura / 2) >= PORTADOR.cruzamento_corredor;
  // Da zona de cruzamento também se cruza para as zonas de finalização para onde os colegas vão (OCUPAR_AREA).
  const alvos: { r: Jogador2D; p: V2 }[] = [];
  for (const r of s.jogadores) {
    if (r.equipa !== e || r === j) continue;
    const d = dist(r.p, j.p);
    if (d < PASSE.min || d > PORTADOR.max_passe) continue;
    alvos.push({ r, p: r.p });
    if (r.accao === 'ATACAR_PROFUNDIDADE' && r.alvoAccao) alvos.push({ r, p: dentro(r.alvoAccao, 3) });
    if (zonaCruz && (r.accao === 'OCUPAR_AREA' || r.accao === 'ATACAR_PROFUNDIDADE') && r.alvoAccao) alvos.push({ r, p: { ...r.alvoAccao } });
  }
  // Os mais promissores (secção 14): espaço e ganho de ameaça.
  const espaco = (p: V2) => Math.min(...advCampo.map((o) => dist(o.p, p)));
  const cands = alvos.map((a) => ({ ...a, h: Math.min(espaco(a.p), 10) + 40 * (ameaca(paraEquipa(e, a.p)) - vOrig) })).sort((a, b) => b.h - a.h).slice(0, 8);
  for (const { r, p } of cands) {
    const rT = paraEquipa(e, r.p), dT = paraEquipa(e, p);
    // Fora de jogo (o portador lê-o com o erro da Visão): o receptor para lá da linha e à frente da bola.
    const fora = rT.x > fj + FORA_DE_JOGO.margem && rT.x > origem.x && rT.x > C.comprimento / 2;
    // O portador lê a linha com erro (Visão): às vezes passa a quem está ligeiramente em fora de jogo.
    if (fora && rT.x - fj > PORTADOR.erro_fora_m * Math.abs(normal(`${chave}|${r.id}|fj`)) * ((21 - at(j, 'vis')) / 20)) continue;
    const d = dist(j.p, p), dy = Math.abs(dT.y - origem.y), ganho = dT.x - origem.x;
    const naArea = dT.x > C.comprimento - 16.5 && Math.abs(dT.y - C.largura / 2) < 20.15;
    let tipo: OpcaoPortador, aereo = false, altura = 0;
    if (zonaCruz && naArea && d > 8) { tipo = 'CRUZAMENTO'; aereo = true; altura = PORTADOR.altura_cruzamento; }
    else if (dy >= PORTADOR.flanco_dy && d >= 25) { tipo = 'MUDANCA_FLANCO'; aereo = true; altura = PORTADOR.altura_flanco; }
    else if (d >= PORTADOR.longo_min) tipo = 'PASSE_LONGO';
    else if (ganho >= PORTADOR.progressivo_ganho) tipo = 'PASSE_PROGRESSIVO';
    else if (d <= PORTADOR.curto_max) tipo = 'PASSE_CURTO';
    else tipo = 'PASSE_LONGO';
    let folga: number;
    if (aereo) folga = folgaAerea(s, j.p, p, altura, e);
    else {
      folga = folgaPasse(s, j.p, p, velocidadePasse(d), e);
      // Passe longo pelo chão cortado: vai pelo ar.
      if (tipo === 'PASSE_LONGO' && folga < 0.3) { const fa = folgaAerea(s, j.p, p, PORTADOR.altura_longo, e); if (fa > folga) { folga = fa; aereo = true; altura = PORTADOR.altura_longo; } }
    }
    // O receptor tem de chegar ao destino a tempo (passes para o espaço): a folga é a pior das duas.
    const tBola = tempoBola(j.p, p, aereo, altura);
    folga = Math.min(folga, tBola + 0.3 - tempoChegada(r, p, false));
    let sucesso = logistica((folga + leitura(r.id)) / PASSE.folga_escala_s);
    // Erro de execução (o mesmo que se aplica ao chutar): a bola tem de cair ao alcance do receptor.
    sucesso *= pAcertar(s, j, d, tipo, aereo);
    if (aereo) {
      sucesso *= PORTADOR.recepcao_ar;
      // Bola pelo ar para um colega marcado é uma disputa aérea, não uma perda certa: se ele chega à queda, o sucesso é
      // pelo menos a probabilidade de ganhar o duelo (Cabeceamento, Impulsão, Força) ao defensor mais perto da queda.
      if (tempoChegada(r, p, false) <= tBola + 0.5) {
        const def = advCampo.reduce((a, o) => (dist(o.p, p) < dist(a.p, p) ? o : a));
        const ar = (x: Jogador2D) => 0.5 * at(x, 'cab') + 0.3 * at(x, 'imp') + 0.2 * at(x, 'for');
        const duelo = Math.max(0.15, Math.min(0.85, 0.5 + 0.04 * (ar(r) - ar(def)))) * PORTADOR.duelo_aereo_controlo;
        sucesso = Math.max(sucesso, duelo);
      }
    }
    const valor = ameaca(dT) - vOrig;
    const perda = aereo ? dT : { x: (origem.x + dT.x) / 2, y: (origem.y + dT.y) / 2 };
    const custo = ameaca({ x: C.comprimento - perda.x, y: C.largura - perda.y });
    const [dMin, dMax] = PASSE.distancia_ideal;
    const conforto = tipo === 'PASSE_CURTO' ? (d < dMin ? -(dMin - d) / 10 : 0) : 0;
    out.push({ tipo, pontuacao: pontuar(tipo, sucesso, valor, custo, r.id + tipo) + conforto + (r.chave === 'GR' ? PASSE.peso_gr : 0) + (d > dMax && tipo === 'PASSE_CURTO' ? -(d - dMax) / 15 : 0),
      sucesso, valor, receptor: r, destino: p, aereo, altura, foraDeJogo: fora });
  }

  // Conduzir: 5 direcções à volta da frente; a melhor pelo espaço e pelo ganho.
  if (maisPerto > 1.5) {
    let melhor: Escolha | null = null;
    for (const a of [0, 0.5, -0.5, 1, -1]) {
      const alvoT = { x: origem.x + Math.cos(a) * PORTADOR.conduzir_m, y: origem.y + Math.sin(a) * PORTADOR.conduzir_m };
      const alvo = dentro(paraAbsoluto(e, alvoT), 2.5);
      if (dist(alvo, j.p) < PORTADOR.conduzir_min_m) continue; // encostado à linha: não há para onde conduzir
      const esp = Math.min(...advCampo.map((o) => Math.min(dist(o.p, alvo), distSeg(o.p, j.p, alvo))));
      const sucesso = logistica((esp - 2.5) / 1.2) * (0.85 + (0.15 * (at(j, 'dri') + at(j, 'tec'))) / 40);
      const valor = ameaca(paraEquipa(e, alvo)) - vOrig;
      const custo = ameaca({ x: C.comprimento - origem.x, y: C.largura - origem.y });
      const pt = pontuar('CONDUZIR', sucesso, valor, custo, 'cond' + a);
      if (!melhor || pt > melhor.pontuacao) melhor = { tipo: 'CONDUZIR', pontuacao: pt, sucesso, valor, destino: alvo };
    }
    if (melhor) out.push(melhor);
  }

  // Driblar: um adversário à frente, a menos de 4,5 m.
  const frente = (o: Jogador2D) => { const q = paraEquipa(e, o.p); return q.x - origem.x > -0.5 && Math.abs(Math.atan2(q.y - origem.y, q.x - origem.x)) < 1.2; };
  const def = advCampo.filter((o) => dist(o.p, j.p) < PORTADOR.driblar_m && frente(o)).sort((a, b) => dist(a.p, j.p) - dist(b.p, j.p))[0];
  if (def) {
    const dq = paraEquipa(e, def.p), lado = dq.y > origem.y ? -1 : 1;
    const alvo = dentro(paraAbsoluto(e, { x: dq.x + PORTADOR.driblar_alem_m, y: dq.y + lado * 2 }), 2.5);
    const sucesso = 1 - pDefensorGanha(forcaDefesa(def, j), forcaDrible(j));
    const valor = ameaca(paraEquipa(e, alvo)) - vOrig + 0.01;
    const custo = ameaca({ x: C.comprimento - origem.x, y: C.largura - origem.y });
    out.push({ tipo: 'DRIBLAR', pontuacao: pontuar('DRIBLAR', sucesso, valor, custo, 'drib'), sucesso, valor, destino: alvo, defensor: def });
  }

  // Rematar.
  const dGolo = hyp(C.comprimento - origem.x, C.largura / 2 - origem.y);
  if (dGolo <= PORTADOR.remate_max_m) {
    const xg = xgEstimado(s, j);
    // Valor do remate (lógica do mapa de ameaça): xG − κ × V(origem); falhar custa a posse, como num passe (decisão 190).
    const valor = xg - PORTADOR.remate_desconto_v * vOrig;
    const pt = K * comPeso(valor - (1 - xg) * posse, pesoOpcaoEstilo(P, 'REMATAR', dGolo > 20) * (dGolo > 20 ? 1 + m * EJ.remate_longe : 1)) + ruido('rem');
    out.push({ tipo: 'REMATAR', pontuacao: pt, sucesso: xg, valor, xg });
  }

  // Proteger (pressionado): segura e espera apoio — por pouco tempo (no máximo 2 s seguidos).
  const aProteger = s.conducao?.tipo === 'PROTEGER' ? (s.tick - s.conducao.desde) * 0.1 : 0;
  if (maisPerto < 3 && aProteger < PORTADOR.proteger_max_s) {
    const o = [...advCampo].sort((a, b) => dist(a.p, j.p) - dist(b.p, j.p))[0];
    const sucesso = 1 - pDefensorGanha(forcaDefesa(o, j), 0.5 * at(j, 'for') + 0.3 * at(j, 'equ') + 0.2 * at(j, 'tec') + DUELO.proteger_bonus);
    const custo = ameaca({ x: C.comprimento - origem.x, y: C.largura - origem.y });
    out.push({ tipo: 'PROTEGER', pontuacao: pontuar('PROTEGER', sucesso, 0, custo, 'prot'), sucesso, valor: 0 });
  }

  // Aliviar: no próprio terço, pressionado — bola alta e longa para a frente, para o lado do portador.
  if (origem.x < PORTADOR.aliviar_x && maisPerto < PORTADOR.aliviar_pressao_m) {
    const alvoT = { x: Math.min(75, origem.x + 45), y: origem.y < C.largura / 2 ? 14 : 54 };
    const vLand = ameaca(alvoT), vAdv = ameaca({ x: C.comprimento - alvoT.x, y: C.largura - alvoT.y });
    const perigoAqui = ameaca({ x: C.comprimento - origem.x, y: C.largura - origem.y });
    const pt = K * comPeso(0.45 * vLand - 0.55 * vAdv + PORTADOR.aliviar_perigo * perigoAqui * aversao, pesoOpcaoEstilo(P, 'ALIVIAR')) + ruido('ali');
    out.push({ tipo: 'ALIVIAR', pontuacao: pt, sucesso: 0.45, valor: vLand - vOrig, destino: paraAbsoluto(e, alvoT), aereo: true, altura: PORTADOR.altura_alivio });
  }
  // Jogada-padrão activa (secção 11): sobe as opções e os receptores da jogada (como o peso do estilo).
  if (s.equipas[e].jogada) for (const o of out) { const w = pesoJogadaOpcao(s, e, o.tipo, o.receptor); if (w !== 1) o.pontuacao = comPeso(o.pontuacao, w); }
  return out.sort((a, b) => b.pontuacao - a.pontuacao);
}

/** Escolha: softmax de temperatura baixa só entre as 3 melhores (determinística pela chave). */
export function escolher(op: Escolha[], chave: string): Escolha | null {
  if (!op.length) return null;
  const top = op.slice(0, PORTADOR.softmax_top), m = top[0].pontuacao;
  const w = top.map((o) => Math.exp((o.pontuacao - m) / PORTADOR.temperatura)), soma = w.reduce((a, b) => a + b, 0);
  let r = aleatorio(chave) * soma;
  for (let k = 0; k < top.length; k++) { r -= w[k]; if (r <= 0) return top[k]; }
  return top[0];
}

/** Execução de um passe/cruzamento/alívio: velocidade da bola (horizontal e vertical) com o erro (secção 7.4). */
export function executarBola(s: Estado2D, j: Jogador2D, o: Escolha, semente: string): { v: V2; vz: number } {
  const destino = o.destino!, d = dist(s.bola.p, destino);
  // O guarda-redes passa com o Jogo com os pés (curto) e o Pontapé (longo).
  const attr = j.chave === 'GR' ? (o.aereo || d > 30 ? at(j, 'pon') : at(j, 'jpe')) : o.tipo === 'CRUZAMENTO' ? at(j, 'cru') : o.aereo || d > 30 ? (at(j, 'plo') + at(j, 'tec')) / 2 : (at(j, 'pas') + at(j, 'tec')) / 2;
  const pressao = pressionado(s, j, PASSE.pressao_m) ? PASSE.pressao_factor : 0;
  const sigma = (PASSE.erro_ang_base + PASSE.erro_ang_ponto * Math.max(0, 20 - attr)) * (1 + d / 40) * (1 + pressao);
  const chave = `${semente}|${j.id}|${s.tick}|exec`;
  const ang = Math.atan2(destino.y - s.bola.p.y, destino.x - s.bola.p.x) + sigma * normal(chave + '|ang');
  const fd = 1 + PASSE.erro_vel * normal(chave + '|vel') * (1.3 - attr / 20);
  if (o.aereo) {
    const l = lancamentoAereo(d * fd, o.altura ?? PORTADOR.altura_longo);
    return { v: { x: Math.cos(ang) * l.vh, y: Math.sin(ang) * l.vh }, vz: l.vz };
  }
  const v = velocidadePasse(d) * fd;
  return { v: { x: Math.cos(ang) * v, y: Math.sin(ang) * v }, vz: 0 };
}

/** Remate: aponta ao canto mais longe do guarda-redes, com erro (Finalização/Remate de longe, distância, pressão). */
export function executarRemate(s: Estado2D, j: Jogador2D, semente: string, cabeca = false): { v: V2; vz: number } {
  const e = j.equipa, o = paraEquipa(e, j.p), gr = s.jogadores.find((q) => q.equipa !== e && q.chave === 'GR');
  const grY = gr ? paraEquipa(e, gr.p).y : C.largura / 2;
  const alvoY = C.largura / 2 + (grY > C.largura / 2 ? -1 : 1) * (REMATE.meia_baliza - REMATE.margem_poste);
  const alvo = paraAbsoluto(e, { x: C.comprimento, y: alvoY });
  const d = dist(j.p, alvo), longe = d > 20;
  const attr = cabeca ? at(j, 'cab') : longe ? (at(j, 'rld') + at(j, 'tec')) / 2 : (at(j, 'fin') + at(j, 'cmp')) / 2;
  // Pressão: cada defensor encostado (< 2 m) e cada corpo na linha de remate obriga a rematar pior (área povoada).
  const adv = s.jogadores.filter((q) => q.equipa !== e && q.chave !== 'GR');
  const encostados = adv.filter((q) => dist(q.p, j.p) < 2).length;
  const naLinha = adv.filter((q) => dist(q.p, j.p) < d && distSeg(q.p, j.p, alvo) < 1.2).length;
  const pressao = Math.min(REMATE.pressao_max, REMATE.pressao * encostados + REMATE.pressao_linha * naLinha);
  const sigma = (REMATE.erro_base + REMATE.erro_ponto * Math.max(0, 20 - attr)) * (1 + d / REMATE.erro_dist_m) * (1 + pressao);
  const chave = `${semente}|${j.id}|${s.tick}|rem`;
  const ang = Math.atan2(alvo.y - s.bola.p.y, alvo.x - s.bola.p.x) + sigma * normal(chave + '|ang');
  const v = cabeca ? 13 : Math.min(REMATE.v_max, REMATE.v_base + REMATE.v_ponto * (longe ? at(j, 'rld') : at(j, 'fin')));
  const vz = cabeca ? 0.5 : REMATE.vz[0] + (REMATE.vz[1] - REMATE.vz[0] + (longe ? REMATE.vz_longe_extra : 0)) * aleatorio(chave + '|vz') * (longe ? 1 : 0.6) * (1 + pressao * 0.5);
  void o;
  return { v: { x: Math.cos(ang) * v, y: Math.sin(ang) * v }, vz };
}
