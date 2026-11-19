// Prompt 5, Bloco A1: sessão de jogo (worker) — novo jogo, escolha do clube, avançar, e reconstrução de uma gravação.
import { describe, expect, it } from 'vitest';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { Sessao } from '../src/jogo/sessao.ts';

const fonte = () => new LocalFileSource(new URL('../packs/', import.meta.url).pathname);

describe('sessão de jogo', () => {
  it('novo mundo → escolha do clube → avançar; a gravação (registo) reconstrói o mesmo jogo', async () => {
    const a = new Sessao(fonte());
    const etapas: string[] = [];
    const paises = await a.novoMundo(2026, (e) => etapas.push(e));
    expect(etapas).toContain('mundo');
    expect(etapas.at(-1)).toBe('pronto');
    const por = paises.find((p) => p.id === 'por')!;
    expect(por.ligas[0].clubes.length).toBeGreaterThan(10);
    const clube = por.ligas[0].clubes[5];
    a.comecar(clube.id, { nome: 'Teste', perfilDono: 'dono-banca' });
    expect(a.w!.economia!.controlador(a.clube).tipo).toBe('utilizador');
    expect(a.w!.motor!.clubeUtilizador).toBe(a.clube);
    for (let k = 0; k < 8; k++) a.avancar();
    const r1 = a.resumo();
    expect(r1.clube.nome).toBe(clube.nome);
    expect(r1.semanas).toBe(8);
    expect(r1.ultimos.length).toBeGreaterThan(0);
    expect(r1.tabela.some((x) => x.meu)).toBe(true);
    expect(r1.proximo).not.toBeNull();
    // Reconstrução a partir do registo (o que fica gravado): o mesmo resumo.
    const b = new Sessao(fonte());
    await b.carregar(JSON.parse(JSON.stringify(a.registo)));
    expect(b.resumo()).toEqual(r1);
  }, 120000);
});
