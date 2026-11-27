// Prompt 11, Bloco 1: dados puros da cutscene (fase/mão a partir da chave do motor) e integridade das linhas de tempo.
// Corre em Node (sem canvas nem DOM): o motor em si (src/cutscene/motor.ts) precisa de um <canvas> a sério e só se
// verifica à mão em test-cutscene/ (sem Playwright nem jsdom neste projecto — ver o relatório).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parseChave, faseContinental, idCutsceneDaCompeticao } from '../src/cutscene/dados.ts';
import { TL_CHAMPIONS } from '../src/cutscene/timelines/champions.ts';
import { TL_EUROPA } from '../src/cutscene/timelines/europa.ts';
import { prog, clamp, easeOut, easeInOut } from '../src/cutscene/utilitarios.ts';
import { Relogio, type FonteTempo } from '../src/cutscene/relogio.ts';
import { normalizarNome } from '../src/cutscene/normalizar.ts';
import { combinarEscudos, type ClubeParaEscudo } from '../src/cutscene/combinarEscudos.ts';
import type { LinhaTempo } from '../src/cutscene/tipos.ts';

describe('dados da cutscene a partir da chave do motor (Prompt 11)', () => {
  it('parseChave: lê ano, competição, ronda, clubes e a mão (2 = 2.ª mão)', () => {
    expect(parseChave('2027|UCL_ko|1|3|9|1')).toEqual({ ano: 2027, comp: 'UCL_ko', ronda: 1, casa: 3, fora: 9, segundaMao: false });
    expect(parseChave('2027|UCL_ko|1|3|9|2')).toMatchObject({ segundaMao: true });
    expect(parseChave('qualquer coisa')).toBeNull();
    expect(parseChave('2027|UCL|x|3|9|1')).toBeNull(); // ronda não numérica: inválida, não rebenta
  });

  it('idCutsceneDaCompeticao: só UCL/UEL (com ou sem sufixo) dão champions/europa; o resto fica sem cutscene', () => {
    for (const c of ['UCL', 'UCL_PO', 'UCL_pe', 'UCL_ko']) expect(idCutsceneDaCompeticao(c)).toBe('champions');
    for (const c of ['UEL', 'UEL_PO', 'UEL_pe', 'UEL_ko']) expect(idCutsceneDaCompeticao(c)).toBe('europa');
    for (const c of ['UECL', 'CLI', 'ACLE', 'POR1']) expect(idCutsceneDaCompeticao(c)).toBeNull();
  });

  it('faseContinental: fase de liga, play-offs e eliminatórias (oitavos/quartos/meias/final), com a mão certa', () => {
    expect(faseContinental('UCL', 4, false)).toBe('Fase de liga · Jornada 4');
    expect(faseContinental('UCL_PO', 1, false)).toBe('Play-off de acesso · 1.ª mão');
    expect(faseContinental('UCL_PO', 1, true)).toBe('Play-off de acesso · 2.ª mão');
    expect(faseContinental('UCL_pe', 1, true)).toBe('Play-off · 2.ª mão');
    expect(faseContinental('UCL_ko', 1, false)).toBe('Oitavos de final · 1.ª mão');
    expect(faseContinental('UCL_ko', 2, true)).toBe('Quartos de final · 2.ª mão');
    expect(faseContinental('UCL_ko', 3, false)).toBe('Meias-finais · 1.ª mão');
    expect(faseContinental('UCL_ko', 4, false)).toBe('Final'); // jogo único: sem "mão"
    expect(faseContinental('UCL_ko', 4, true)).toBe('Final'); // mesmo que alguém passe segundaMao=true por engano
  });
});

describe('linhas de tempo (Champions e Liga Europa): coerentes, dentro de 0–38 s', () => {
  for (const [nome, tl] of [['Champions', TL_CHAMPIONS], ['Liga Europa', TL_EUROPA]] as [string, LinhaTempo][]) {
    it(`${nome}: todos os actos dentro de [0, dur]; início ≤ fim`, () => {
      for (const [acto, [a, b]] of Object.entries(tl.actos)) {
        expect(a, `${nome}/${acto} início`).toBeGreaterThanOrEqual(0);
        expect(b, `${nome}/${acto} fim`).toBeLessThanOrEqual(tl.dur);
        expect(a, `${nome}/${acto} início ≤ fim`).toBeLessThanOrEqual(b);
      }
    });
    it(`${nome}: tem os actos essenciais (marca, fase, home, away, estadio, climax, fade)`, () => {
      for (const acto of ['marca', 'fase', 'home', 'away', 'estadio', 'climax', 'fade']) expect(tl.actos).toHaveProperty(acto);
    });
  }
  it('Champions ≠ Liga Europa (linhas de tempo próprias, como pede o prompt)', () => {
    expect(TL_CHAMPIONS).not.toEqual(TL_EUROPA);
  });
});

describe('utilitários de animação', () => {
  it('prog: 0 antes do início, 1 depois do fim, 0 sem intervalo (acto em falta)', () => {
    expect(prog(0, [5, 10])).toBe(0);
    expect(prog(5, [5, 10])).toBe(0);
    expect(prog(7.5, [5, 10])).toBeCloseTo(0.5, 6);
    expect(prog(99, [5, 10])).toBe(1);
    expect(prog(7, undefined)).toBe(0);
  });
  it('clamp, easeOut e easeInOut ficam sempre entre 0 e 1 para entradas em 0–1', () => {
    for (const x of [0, 0.1, 0.5, 0.9, 1]) {
      expect(clamp(x)).toBeGreaterThanOrEqual(0); expect(clamp(x)).toBeLessThanOrEqual(1);
      expect(easeOut(x)).toBeGreaterThanOrEqual(0); expect(easeOut(x)).toBeLessThanOrEqual(1);
      expect(easeInOut(x)).toBeGreaterThanOrEqual(0); expect(easeInOut(x)).toBeLessThanOrEqual(1);
    }
    expect(easeOut(0)).toBeCloseTo(0, 6); expect(easeOut(1)).toBeCloseTo(1, 6);
  });
});

describe('relógio mestre (Prompt 11, Bloco 1)', () => {
  it('usa o tempo do áudio quando a fonte o dá (≥ 0)', () => {
    const fonte: FonteTempo = { tempoCanal: () => 12.34 };
    const r = new Relogio(fonte);
    r.iniciar();
    expect(r.t()).toBeCloseTo(12.34, 6);
  });
  it('sem fonte, ou sem nada a tocar (null): usa performance.now() — a cutscene corre à mesma, com a mesma duração', () => {
    const semFonte = new Relogio(null);
    semFonte.iniciar();
    expect(semFonte.t()).toBeGreaterThanOrEqual(0);
    expect(semFonte.t()).toBeLessThan(1); // acabado de iniciar
    const fonteVazia: FonteTempo = { tempoCanal: () => null };
    const r2 = new Relogio(fonteVazia);
    r2.iniciar();
    expect(r2.t()).toBeGreaterThanOrEqual(0);
  });
});

describe('ligação de escudos a clubes por nome (Prompt 11, Bloco 2)', () => {
  it('normalizarNome: ignora acentos, maiúsculas e pontuação', () => {
    expect(normalizarNome('Sporting Clube de Portugal')).toBe('sportingclubedeportugal');
    expect(normalizarNome('Sport Lisboa e Benfica')).toBe('sportlisboaebenfica');
    expect(normalizarNome('São Paulo')).toBe(normalizarNome('Sao Paulo'));
    expect(normalizarNome('FC Porto')).toBe('fcporto');
  });

  const clubes: ClubeParaEscudo[] = [
    { id: 'por_porto', nome: 'FC Porto', nome_curto: 'Porto' },
    { id: 'por_benfica', nome: 'Sport Lisboa e Benfica', nome_curto: 'Benfica' },
    { id: 'eng_liverpool', nome: 'Liverpool FC', nome_curto: 'Liverpool' },
  ];

  it('combina por id, por nome ou por nome curto do ficheiro (sem extensão, normalizado)', () => {
    const { mapa, clubesSemImagem, ficheirosNaoUsados } = combinarEscudos(clubes, ['por_porto.png', 'Benfica.jpg', 'liverpoolfc.webp', 'desconhecido.png']);
    expect(mapa.get('por_porto')).toBe('por_porto.png');
    expect(mapa.get('por_benfica')).toBe('Benfica.jpg');
    expect(mapa.get('eng_liverpool')).toBe('liverpoolfc.webp');
    expect(clubesSemImagem).toEqual([]);
    expect(ficheirosNaoUsados).toEqual(['desconhecido.png']);
  });

  it('sem ficheiros (ou pasta vazia/inexistente): todos os clubes ficam sem imagem, sem rebentar', () => {
    const { mapa, clubesSemImagem, ficheirosNaoUsados } = combinarEscudos(clubes, []);
    expect(mapa.size).toBe(0);
    expect(clubesSemImagem).toEqual(clubes);
    expect(ficheirosNaoUsados).toEqual([]);
  });

  it('cada clube fica com um só ficheiro: o segundo ficheiro que combine com o mesmo clube não o substitui', () => {
    const { mapa, ficheirosNaoUsados } = combinarEscudos(clubes, ['por_porto.png', 'fcporto.jpg']);
    expect(mapa.get('por_porto')).toBe('por_porto.png');
    expect(ficheirosNaoUsados).toEqual(['fcporto.jpg']);
  });
});

describe('regras de ouro (Prompt 11)', () => {
  it('o motor de simulação (incluindo o 2D), o mercado, os prémios e os jogadores nunca importam de src/cutscene/', () => {
    const ficheiros = [...listarTs('src/engine'), ...listarTs('src/match'), ...listarTs('src/players'), ...listarTs('src/economia'), ...listarTs('src/mercado'), ...listarTs('src/premios')];
    for (const f of ficheiros) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from ['"].*\/cutscene\//);
  });
  it('só src/cutscene/motor.ts (e o invólucro em src/ui/cutscene.ts) tocam no <canvas>/DOM; a linha de tempo e os dados são puros', () => {
    for (const f of [...listarTs('src/cutscene/timelines'), 'src/cutscene/dados.ts', 'src/cutscene/utilitarios.ts', 'src/cutscene/tipos.ts', 'src/cutscene/relogio.ts', 'src/cutscene/normalizar.ts', 'src/cutscene/combinarEscudos.ts', 'src/cutscene/escudo.ts', 'src/cutscene/efeitos.ts']) {
      const txt = readFileSync(f, 'utf8');
      expect(txt, f).not.toMatch(/getContext\(/);
      expect(txt, f).not.toMatch(/document\./);
    }
  });
});

function listarTs(dir: string): string[] {
  const out: string[] = [];
  let entradas: import('node:fs').Dirent[];
  try { entradas = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entradas) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...listarTs(p));
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}
