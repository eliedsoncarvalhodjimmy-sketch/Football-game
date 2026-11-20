// Motor 2D táctico — Fase 3 (docs/tactics/MOTOR_2D.md, secção 13): decisão completa do portador, acções sem bola com
// coordenação, fases e transições, pressão, desarmes, faltas, linha defensiva, bola no ar, remates e guarda-redes.
// Critério da fase: "dá para ver construção, ataque, perda, transição e defesa organizada".
import { describe, expect, it } from 'vitest';
import { Motor2D } from '../src/engine/match2d/Motor2D.ts';
import { gerarEquipa2D } from '../src/engine/match2d/equipas.ts';
import { alvoBloco } from '../src/engine/match2d/bloco.ts';
import { avaliarPortador, escolher, xgEstimado } from '../src/engine/match2d/portador.ts';
import { ESTILOS_2D } from '../src/config/match2d/estilos.ts';
import { DUELO, SEM_BOLA, TRANSICAO, ESTADO_JOGO } from '../src/config/match2d/fase3.ts';
import { dist } from '../src/engine/match2d/referencial.ts';
import type { IdEstilo } from '../src/config/estilos.ts';

const motor = (semente: string, ea: IdEstilo, eb: IdEstilo, fa = '4-3-3', fb = '4-4-2') =>
  new Motor2D({ semente, equipas: [{ nome: 'A', formacao: fa, estilo: ea, jogadores: gerarEquipa2D('a', 70, fa) }, { nome: 'B', formacao: fb, estilo: eb, jogadores: gerarEquipa2D('b', 68, fb) }] });

/** Corre um jogo e recolhe o que se viu: opções do portador, acções sem bola, fases, coordenação. */
function observar(m: Motor2D, ticks: number) {
  const s = m.estado, opcoes = new Set<string>(), accoes = new Set<string>(), fases = new Set<string>();
  let pressoesAcima = 0, profundidadeAcima = 0, desarmesLonge = 0, amostrasAtaque = 0, equilibrioOk = 0;
  for (let k = 0; k < ticks; k++) {
    const dono = s.bola.dono ? s.jogadores.find((j) => j.id === s.bola.dono) : null;
    const nDesarmes = s.estat.desarmes[0] + s.estat.desarmes[1];
    m.passo();
    if (s.estat.desarmes[0] + s.estat.desarmes[1] > nDesarmes && dono) {
      const ev = s.eventos.filter((x) => x.tipo === 'desarme').pop()!;
      const d = s.jogadores.find((j) => j.id === ev.jogador)!;
      if (dist(d.p, dono.p) > DUELO.desarme_m + 1.5) desarmesLonge++;
    }
    for (const x of s.eventos.filter((y) => y.tick === s.tick)) { if (x.subtipo) opcoes.add(x.subtipo.replace('_AR', '')); if (x.tipo === 'remate') opcoes.add('REMATAR'); if (x.tipo === 'drible') opcoes.add('DRIBLAR'); }
    if (s.conducao) opcoes.add(s.conducao.tipo);
    for (const j of s.jogadores) accoes.add(j.accao);
    for (const q of s.equipas) fases.add(q.fase);
    for (const e of [0, 1] as const) {
      const P = ESTILOS_2D[s.equipas[e].estilo], meus = s.jogadores.filter((j) => j.equipa === e);
      if (meus.filter((j) => j.accao === 'PRESSIONAR').length > P.pressionantes[1] + 1) pressoesAcima++;
      // Fase 4: em transição (atacar já) e a perder o limite sobe (secção 8: contra-ataque).
      const q = s.equipas[e], maxProf = (q.fase === 'TRANS_DEF_ATQ' ? Math.min(TRANSICAO.profundidade_max, P.jogadoresAtaque[0]) : SEM_BOLA.profundidade_max) + (q.mentalidade > 0.5 ? ESTADO_JOGO.profundidade_extra : 0);
      if (meus.filter((j) => j.accao === 'ATACAR_PROFUNDIDADE').length > Math.max(maxProf, SEM_BOLA.profundidade_max) + 1) profundidadeAcima++;
      // Equilíbrio defensivo: a atacar no meio-campo adversário, quantos ficam bem atrás da bola.
      const bx = e === 0 ? s.bola.p.x : 105 - s.bola.p.x;
      if (s.posse === e && s.equipas[e].fase.startsWith('ATQ') && bx > 70) {
        amostrasAtaque++;
        const atras = meus.filter((j) => j.chave !== 'GR' && (e === 0 ? j.p.x : 105 - j.p.x) < bx - 15).length;
        if (atras >= Math.min(P.equilibrioMinimo, 4)) equilibrioOk++;
      }
    }
  }
  return { opcoes, accoes, fases, pressoesAcima, profundidadeAcima, desarmesLonge, equilibrio: amostrasAtaque ? equilibrioOk / amostrasAtaque : 1 };
}

describe('motor 2D — Fase 3: decisão completa, acções sem bola e defesa', () => {
  const jogos = [motor('f3a', 'gegenpressen', 'bloco_medio_baixo'), motor('f3b', 'pelas_alas', 'catenaccio', '4-4-2', '5-3-2'), motor('f3c', 'futebol_total', 'jogo_direto', '4-3-3', '4-4-2')];
  const obs = jogos.map((m) => observar(m, 12000));
  const todas = <K extends 'opcoes' | 'accoes' | 'fases'>(k: K) => new Set(obs.flatMap((o) => [...o[k]]));

  it('o portador usa as 10 opções da secção 7.1', () => {
    const o = todas('opcoes');
    for (const t of ['PASSE_CURTO', 'PASSE_PROGRESSIVO', 'PASSE_LONGO', 'MUDANCA_FLANCO', 'CRUZAMENTO', 'CONDUZIR', 'DRIBLAR', 'REMATAR', 'PROTEGER', 'ALIVIAR']) expect(o, t).toContain(t);
  });

  it('as acções sem bola do catálogo aparecem (com e sem posse)', () => {
    const a = todas('accoes');
    for (const t of ['MANTER_POSICAO', 'OFERECER_APOIO', 'DAR_LARGURA', 'ATACAR_PROFUNDIDADE', 'APOIO_FRONTAL', 'OCUPAR_AREA', 'EQUILIBRIO_DEFENSIVO', 'PRESSIONAR', 'COBRIR', 'FECHAR_LINHA_PASSE', 'MARCAR', 'RECUPERAR']) expect(a, t).toContain(t);
  });

  it('vêem-se as fases: construção, criação, finalização, perda/transições, defesa organizada e bola parada', () => {
    const f = todas('fases');
    for (const t of ['ATQ_CONSTRUCAO', 'ATQ_CRIACAO', 'ATQ_FINALIZACAO', 'TRANS_ATQ_DEF', 'DEF_ORGANIZADA', 'TRANS_DEF_ATQ', 'BOLA_PARADA']) expect(f, t).toContain(t);
  });

  it('coordenação: pressionantes e profundidade dentro dos limites; equilíbrio defensivo atrás da bola', () => {
    for (const o of obs) {
      expect(o.pressoesAcima).toBeLessThan(60); // momentos (ticks) com um pressionante a mais do que o estilo permite (perigo na área: +1)
      expect(o.profundidadeAcima).toBeLessThan(60); // o compromisso (≥ 1 s) segura a desmarcação uns ticks depois de a transição acabar
      expect(o.equilibrio).toBeGreaterThan(0.7);
    }
  });

  it('desarmes só a curta distância; há golos, remates, defesas, faltas e foras de jogo ao longo dos jogos', () => {
    for (const o of obs) expect(o.desarmesLonge).toBe(0);
    const e = jogos.map((m) => m.estado.estat);
    const soma = (f: (x: typeof e[0]) => number) => e.reduce((a, x) => a + f(x), 0);
    expect(soma((x) => x.remates[0] + x.remates[1])).toBeGreaterThan(10);
    expect(soma((x) => x.desarmes[0] + x.desarmes[1])).toBeGreaterThan(10);
    expect(soma((x) => x.faltas[0] + x.faltas[1])).toBeGreaterThan(0);
    expect(jogos.some((m) => m.estado.eventos.some((x) => x.tipo === 'defesa') || m.estado.estat.aBaliza.some((n) => n > 0))).toBe(true);
  });

  it('a Gegenpressen recupera mais bolas no terço ofensivo do que o Bloco Médio-Baixo', () => {
    const e = jogos[0].estado.estat;
    expect(e.recuperacoesAltas[0]).toBeGreaterThan(e.recuperacoesAltas[1]);
  });

  it('linha defensiva: com a bola descoberta recua; depois de um passe para trás sobe (secção 9.1)', () => {
    const m = motor('linha', 'tiki_taka', 'bloco_medio_baixo');
    const s = m.estado;
    for (let k = 0; k < 50; k++) m.passo();
    // Portador da equipa 0 sozinho no meio-campo, de frente para a baliza da equipa 1.
    const p = s.jogadores.find((j) => j.equipa === 0 && j.chave === 'MCD')!;
    s.bola.dono = p.id; s.posse = 0; p.p = { x: 55, y: 34 }; p.corpo = 0; s.bola.p = { ...p.p };
    for (const j of s.jogadores) if (j.equipa === 1 && dist(j.p, p.p) < 8) j.p = { x: j.p.x + 10, y: j.p.y };
    const papeis = s.jogadores.filter((j) => j.equipa === 1).sort((a, b) => a.lugar - b.lugar).map((j) => j.papel);
    s.equipas[1].mistura = 0;
    const descoberta = alvoBloco(s, 1, papeis).linhaDefX;
    const def = s.jogadores.find((j) => j.equipa === 1 && j.chave.startsWith('MC'))!; def.p = { x: p.p.x + 2, y: p.p.y };
    const coberta = alvoBloco(s, 1, papeis).linhaDefX;
    expect(coberta - descoberta).toBeGreaterThan(3);
    s.equipas[1].subirAte = s.tick + 20;
    expect(alvoBloco(s, 1, papeis).linhaDefX).toBeGreaterThan(coberta);
  });

  it('o portador decide com a pontuação da secção 7.2 (determinística) e o xG cresce perto da baliza', () => {
    const m = motor('dec', 'tiki_taka', 'bloco_medio_baixo'), s = m.estado;
    for (let k = 0; k < 30; k++) m.passo();
    const j = s.jogadores.find((x) => x.id === s.bola.dono) ?? s.jogadores[2];
    const a = avaliarPortador(s, j, 'x'), b = avaliarPortador(s, j, 'x');
    expect(JSON.stringify(a.map((o) => [o.tipo, o.pontuacao]))).toBe(JSON.stringify(b.map((o) => [o.tipo, o.pontuacao])));
    expect(escolher(a, 'k')?.tipo).toBe(escolher(b, 'k')?.tipo);
    const at = s.jogadores.find((x) => x.equipa === 0 && x.chave === 'PL')!;
    at.p = { x: 95, y: 34 }; const perto = xgEstimado(s, at);
    at.p = { x: 75, y: 34 }; const longe = xgEstimado(s, at);
    expect(perto).toBeGreaterThan(longe * 3);
  });
});
