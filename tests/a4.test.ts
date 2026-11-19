// Prompt 5, A4: decisões do utilizador fora do mercado (renovação, staff, treinador, obra, orçamentos, bilhetes), vistas e
// a reconstrução da gravação com esses comandos.
import { describe, expect, it } from 'vitest';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { Sessao } from '../src/jogo/sessao.ts';
import { N_INFRA } from '../src/club/store.ts';

const fonte = () => new LocalFileSource(new URL('../packs/', import.meta.url).pathname);

describe('A4: decisões do Presidente', () => {
  it('renovar, staff, treinador, obra, orçamentos e bilhetes entram na gravação; as vistas abrem', async () => {
    const a = new Sessao(fonte());
    const paises = await a.novoMundo(2026);
    a.comecar(paises.find((p) => p.id === 'por')!.ligas[0].clubes[6].id, { nome: 'Teste', perfilDono: 'dono-banca' });
    a.avancar();
    const w = a.w!, st = w.jogadores!, c = a.clube, e = w.economia!;
    // Renovação: o jogador com o contrato mais curto.
    const ve = a.vista({ ecra: 'escritorio' });
    if (ve.ecra !== 'escritorio') throw new Error();
    const r = ve.dados.renovacoes[0];
    expect(r).toBeDefined();
    a.comando({ tipo: 'negociar', jogador: r.id, negocio: 'renovacao' });
    const n = w.mercado!.util!.negs.at(-1)!;
    expect(n.fase).toBe('jogador');
    a.comando({ tipo: 'propostaJogador', id: n.id, proposta: { papel: n.pede!.papel, anos: 3, salario: n.pede!.salario, premio: n.pede!.premio, agente: n.pede!.agente, clausula: 0, bonus: null } });
    expect(n.fase).toBe('concluida');
    const j = st.idx(r.id)!;
    expect(new Date(st.fimContrato[j] * 864e5).getUTCFullYear()).toBeGreaterThan(r.fim);
    // Staff: despedir um olheiro e contratar um livre do mesmo cargo.
    const vs = a.vista({ ecra: 'staff' });
    if (vs.ecra !== 'staff') throw new Error();
    const ol = vs.dados.departamentos.flatMap((d) => d.membros).find((m) => m.cargoId === 'olheiro')!;
    a.comando({ tipo: 'despedirStaff', membro: ol.id });
    const livre = vs.dados.livres.find((m) => m.cargoId === 'olheiro')!;
    a.comando({ tipo: 'contratarStaff', membro: livre.id });
    expect(e.staff.porClube[c].some((m) => m.id === livre.id)).toBe(true);
    // Treinador: despedir por mútuo acordo e escolher um livre que aceite.
    const cand = vs.dados.treinadoresLivres.find((t) => t.aceita >= 50);
    if (cand) { a.comando({ tipo: 'despedirTreinador', motivo: 'mutuo_acordo', novo: cand.id }); expect(w.motor!.treinadores[c].id).toBe(cand.id); }
    // Obra, orçamentos e bilhetes.
    const vi = a.vista({ ecra: 'infra' });
    if (vi.ecra !== 'infra') throw new Error();
    const ok = vi.dados.infra.find((x) => !x.pode);
    if (ok) { a.comando({ tipo: 'obra', infra: ok.tipo as 'treino' }); expect(e.clubes.obraFim[c * N_INFRA + ['estadio', 'treino', 'academia', 'medico', 'recrutamento'].indexOf(ok.tipo)]).toBeGreaterThan(a.sim!.segunda); }
    const vf = a.vista({ ecra: 'financas' });
    if (vf.ecra !== 'financas') throw new Error();
    a.comando({ tipo: 'orcamentos', transferencias: vf.dados.orcTransferencias + 100000 });
    a.comando({ tipo: 'precoBilhete', factor: 1.2 });
    const vf2 = a.vista({ ecra: 'financas' });
    if (vf2.ecra !== 'financas') throw new Error();
    expect(vf2.dados.adeptos.receitaJogo).toBeGreaterThan(vf2.dados.adeptos.receitaBase * 0.9);
    expect(vf2.dados.adeptos.ocupacao).toBeLessThanOrEqual(vf2.dados.adeptos.ocupacaoBase);
    for (let k = 0; k < 6; k++) a.avancar();
    const vc = a.vista({ ecra: 'competicoes' });
    if (vc.ecra !== 'competicoes') throw new Error();
    expect(vc.dados.tabela!.length).toBeGreaterThan(10);
    expect(vc.dados.calendario.length).toBeGreaterThan(3);
    expect(vc.dados.historico.length).toBeGreaterThan(10);
    expect(a.carreira!.jogos).toBeGreaterThan(0);
    // Reconstrução.
    const r1 = a.resumo();
    const b = new Sessao(fonte());
    await b.carregar(JSON.parse(JSON.stringify(a.registo)));
    const r2 = b.resumo();
    expect(r2).toEqual(r1);
    expect(b.carreira).toEqual(a.carreira);
  }, 240000);
});
