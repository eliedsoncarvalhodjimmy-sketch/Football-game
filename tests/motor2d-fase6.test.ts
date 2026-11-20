// Motor 2D táctico — Fase 6 (docs/tactics/MOTOR_2D.md, secção 13): integração. O jogo do clube do utilizador corre no
// motor 2D (modo detalhado) a partir do plantel real; o resultado entra na época (marcadores, cartões, minutos); a
// gravação guarda o resumo (carregar não volta a simular) e o ecrã do jogo recebe a configuração exacta.
// A comparação com o modo rápido (golos e resultados por diferença de força) corre com
// `npx tsx scripts/comparar-motor2d.ts 320` (demora uns minutos).
import { describe, expect, it } from 'vitest';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { Sessao } from '../src/jogo/sessao.ts';
import { prepararLados } from '../src/match/rapido.ts';
import { configJogo2D, factorForca, resumir } from '../src/match/jogo2d.ts';
import { FORMAS_2D } from '../src/config/match2d/formacoes.ts';
import { ESTILOS_2D } from '../src/config/match2d/estilos.ts';
import { Rng } from '../src/core/rng.ts';
import { diaInicioMundo } from '../src/engine/world.ts';
import type { Evento2D } from '../src/engine/match2d/tipos.ts';

const fonte = () => new LocalFileSource(new URL('../packs/', import.meta.url).pathname);

describe('motor 2D — Fase 6: integração no jogo do utilizador', () => {
  it('o resumo do registo: marcador, assistência (último passe de um colega), autogolo sem marcador, cartões e minutos', () => {
    const ev = (tick: number, tipo: Evento2D['tipo'], equipa: 0 | 1, jogador?: string, outro?: string, subtipo?: string): Evento2D => ({ tick, tipo, equipa, jogador, outro, x: 50, y: 34, ...(subtipo ? { subtipo } : {}) });
    const r = resumir([
      ev(100, 'passe', 0, 'j1', 'j2'), ev(110, 'recepcao', 0, 'j2'), ev(115, 'remate', 0, 'j2'), ev(118, 'golo', 0, 'j2'),
      ev(2000, 'recepcao', 1, 'j20'), ev(2010, 'golo', 0, 'j20'), // autogolo: o último toque foi de um jogador da equipa 1
      ev(3000, 'cartao', 1, 'j21', undefined, 'AMARELO'), ev(4000, 'cartao', 1, 'j21', undefined, 'SEGUNDO_AMARELO'), ev(4000, 'expulsao', 1, 'j21'),
    ], { golos: [2, 0], xg: [0.5, 0.1], remates: [1, 0] }, [[1, 2], [20, 21]]);
    expect(r.marcadores[0]).toEqual([2]);
    expect(r.assistencias[0]).toEqual([1]);
    expect(r.rematesPor[0]).toEqual([[2, 1]]);
    expect(r.amarelos[1]).toEqual([21, 21]);
    expect(r.vermelhos[1]).toEqual([21]);
    expect(r.minutos[1]).toEqual([[20, 90], [21, 7]]);
  });

  const s = new Sessao(fonte());

  it('equipas 2D a partir do plantel real: formação e estilo válidos, atributos 1–20, condição; a casa com vantagem', async () => {
    await s.novoMundo(2026);
    const w = s.w!, dia = diaInicioMundo() + 40;
    const liga = w.ligaPorId('POR1');
    const [a, b] = [liga.clubes[0], liga.clubes[1]];
    const [casa, fora] = prepararLados(w, a, b, dia, Rng.de(1, 'f6'));
    const cfg = configJogo2D(w, casa, fora, false, dia, 'f6');
    for (const q of cfg.equipas) {
      expect(q.jogadores).toHaveLength(11);
      expect(FORMAS_2D[q.formacao], q.formacao).toBeDefined();
      expect(ESTILOS_2D[q.estilo], q.estilo).toBeDefined();
      for (const j of q.jogadores) {
        for (const v of Object.values(j.attrs)) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(20); }
        expect(j.condicao).toBeGreaterThan(0.29);
      }
    }
    expect(cfg.equipas[0].jogadores[0].pos).toBe('GR');
    // Com a mesma força, a equipa da casa tem um factor maior.
    expect(factorForca(casa, casa, true, false)).toBeGreaterThan(factorForca(casa, casa, false, false));
  }, 120_000);

  it('na época: o jogo do utilizador corre no motor 2D, entra nas estatísticas e na gravação; carregar dá o mesmo', async () => {
    const por = (await s.paises()).find((p) => p.id === 'por')!;
    s.comecar(por.ligas[0].clubes[5].id, { nome: 'Teste', perfilDono: 'dono-banca' });
    let jogos = s.avancar();
    for (let k = 0; k < 10 && !s.ultimoJogo2D; k++) jogos = s.avancar();
    const u = s.ultimoJogo2D!;
    expect(u).not.toBeNull();
    const j = jogos.find((x) => x.detalhado)!;
    expect(j).toBeDefined();
    expect([j.r!.gc, j.r!.gf]).toEqual(u.resumo.golos);
    // Os marcadores do jogo 2D ficaram nas estatísticas dos jogadores.
    const st = s.w!.jogadores!;
    for (const m of [...u.resumo.marcadores[0], ...u.resumo.marcadores[1]]) expect(st.eGolos[m]).toBeGreaterThan(0);
    // Só os jogos do utilizador são detalhados.
    expect(jogos.filter((x) => x.detalhado).length).toBe(1);
    // Gravação: o resumo fica no registo; a vista do jogo tem a configuração exacta.
    expect(s.registo!.jogos2d![u.chave]).toEqual(u.resumo);
    const v = s.vistaJogo2D()!;
    expect(v.resultado).toEqual(u.resumo.golos);
    expect(v.config.equipas[0].jogadores).toHaveLength(11);
    // Carregar: mesmo resumo e mesma tabela, sem voltar a simular o jogo 2D (o resumo vem da gravação).
    const b = new Sessao(fonte());
    const reg = JSON.parse(JSON.stringify(s.registo));
    const t0 = Date.now();
    await b.carregar(reg);
    expect(b.resumo().tabela).toEqual(s.resumo().tabela);
    expect(b.registo!.jogos2d).toEqual(s.registo!.jogos2d);
    expect(Date.now() - t0).toBeLessThan(60_000);
  }, 300_000);
});
