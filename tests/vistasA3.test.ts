// Prompt 5, A3: vistas do Mercado, Scouting e Academia; missão do olheiro de jovens e contratação a partir do relatório.
import { describe, expect, it } from 'vitest';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { Sessao } from '../src/jogo/sessao.ts';

const fonte = () => new LocalFileSource(new URL('../packs/', import.meta.url).pathname);

describe('vistas da A3', () => {
  it('mercado, ficha de jogador de outro clube (intervalos), scouting, missão e academia', async () => {
    const a = new Sessao(fonte());
    const paises = await a.novoMundo(2026);
    a.comecar(paises.find((p) => p.id === 'por')!.ligas[0].clubes[4].id, { nome: 'Teste', perfilDono: 'dono-banca' });
    a.avancar();
    const vm = a.vista({ ecra: 'mercado' });
    if (vm.ecra !== 'mercado') throw new Error();
    expect(vm.dados.janela.aberta).toBe(true);
    expect(vm.dados.conhecidos.length).toBeGreaterThan(10);
    expect(vm.dados.livres.length).toBeGreaterThan(30); // livres desde o início do mundo
    const outro = vm.dados.conhecidos[0];
    expect(outro.ovr[1]).toBeGreaterThanOrEqual(outro.ovr[0]);
    const vj = a.vista({ ecra: 'jogador', jogador: outro.id });
    if (vj.ecra !== 'jogador') throw new Error();
    expect(vj.dados.meu).toBe(false);
    expect(vj.dados.scouting!.conhecimento).toBeGreaterThan(0);
    expect(vj.dados.grupos[0].atributos[0].int).toBeDefined();
    // Shortlist: o conhecimento sobe com as semanas.
    a.comando({ tipo: 'shortlist', jogador: outro.id, marcar: true });
    const k0 = vj.dados.scouting!.conhecimento;
    a.avancar(); a.avancar();
    const vj2 = a.vista({ ecra: 'jogador', jogador: outro.id });
    if (vj2.ecra !== 'jogador') throw new Error();
    expect(vj2.dados.scouting!.conhecimento).toBeGreaterThanOrEqual(k0);
    // Negociação aberta: vista própria.
    a.comando({ tipo: 'negociar', jogador: outro.id, negocio: 'transferencia' });
    const id = a.w!.mercado!.util!.negs[0].id;
    const vn = a.vista({ ecra: 'negociacao', id });
    if (vn.ecra !== 'negociacao') throw new Error();
    expect(vn.dados.neg.pedido).toBeGreaterThan(0);
    expect(vn.dados.trocas.length).toBeGreaterThan(10);
    // Scouting: missão de 2 semanas; no regresso há relatório.
    const vs = a.vista({ ecra: 'scouting' });
    if (vs.ecra !== 'scouting') throw new Error();
    expect(vs.dados.paises.length).toBeGreaterThan(60);
    if (vs.dados.olheirosJovens > 0) {
      a.comando({ tipo: 'missao', pais: 'BRA', posicao: 'Avançados', semanas: 2 });
      for (let k = 0; k < 3; k++) a.avancar();
      const vs2 = a.vista({ ecra: 'scouting' });
      if (vs2.ecra !== 'scouting') throw new Error();
      const mi = vs2.dados.missoes[0];
      expect(mi.estado).toBe('concluída');
      expect(mi.relatorio.length).toBeGreaterThanOrEqual(2);
      const disp = mi.relatorio.find((x) => x.estado === 'disponivel');
      if (disp) { a.comando({ tipo: 'contratarJovem', jogador: disp.id }); expect(a.w!.jogadores!.clube[a.w!.jogadores!.idx(disp.id)!]).toBe(a.clube); }
    }
    const va = a.vista({ ecra: 'academia' });
    if (va.ecra !== 'academia') throw new Error();
    expect(va.dados.contagens.sub18).toBeGreaterThan(5);
    expect(va.dados.ligas.length).toBe(2);
    // Reconstrução com todos estes comandos.
    const r1 = a.resumo();
    const b = new Sessao(fonte());
    await b.carregar(JSON.parse(JSON.stringify(a.registo)));
    expect(b.resumo()).toEqual(r1);
  }, 180000);
});
