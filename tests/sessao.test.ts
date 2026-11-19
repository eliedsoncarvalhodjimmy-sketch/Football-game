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

  it('A2: vistas e comandos (sugestão ao treinador, promover jovem) entram no registo e a reconstrução dá o mesmo', async () => {
    const a = new Sessao(fonte());
    const paises = await a.novoMundo(2026);
    const clube = paises.find((p) => p.id === 'por')!.ligas[0].clubes[3];
    a.comecar(clube.id, { nome: 'Teste', perfilDono: 'dono-banca' });
    const pl = a.vista({ ecra: 'plantel' });
    if (pl.ecra !== 'plantel') throw new Error();
    expect(pl.dados.principal.length).toBeGreaterThan(18);
    expect(pl.dados.principal[0].rosto).toContain('<svg');
    expect(pl.dados.sub21.length + pl.dados.sub18.length).toBeGreaterThan(10);
    const jv = a.vista({ ecra: 'jogador', jogador: pl.dados.principal[0].id });
    if (jv.ecra !== 'jogador') throw new Error();
    expect(jv.dados.grupos.length).toBe(jv.dados.linha.pos === 'GR' ? 4 : 3);
    expect(jv.dados.papeis.length).toBeGreaterThan(0);
    const tv = a.vista({ ecra: 'tactica' });
    if (tv.ecra !== 'tactica') throw new Error();
    expect(tv.dados.caixas.length).toBe(11);
    expect(tv.dados.estilos.length).toBe(8);
    // A vista não muda o estado: o resumo a seguir é o mesmo de uma sessão que não a pediu.
    for (let k = 0; k < 3; k++) a.avancar();
    // Sugestão: outra formação e um onze com os 11 primeiros do plantel principal.
    const outra = tv.dados.formacoes.find((f) => f !== tv.dados.formacao)!;
    a.comando({ tipo: 'sugerir', formacao: outra, instrucoes: { pressao: 1 } });
    const jovem = pl.dados.sub21[0];
    a.comando({ tipo: 'promover', jogador: jovem.id });
    expect(() => a.comando({ tipo: 'promover', jogador: jovem.id })).toThrow();
    for (let k = 0; k < 4; k++) a.avancar();
    const r1 = a.resumo();
    expect(a.w!.motor!.ultimaDecisao).not.toBeNull();
    expect(a.registo!.comandos.map((c) => c.tipo)).toEqual(['sugerir', 'promover']);
    const b = new Sessao(fonte());
    await b.carregar(JSON.parse(JSON.stringify(a.registo)));
    expect(b.resumo()).toEqual(r1);
    const pb = b.vista({ ecra: 'plantel' });
    if (pb.ecra !== 'plantel') throw new Error();
    expect(pb.dados.principal.some((x) => x.id === jovem.id)).toBe(true);
  }, 180000);
});
