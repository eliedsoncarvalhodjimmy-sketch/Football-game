// Prompt 5, A3: negociações do utilizador (clube → jogador → registo), ofertas recebidas e a reconstrução com os comandos.
import { describe, expect, it } from 'vitest';
import { LocalFileSource } from '../src/data/LocalFileSource.ts';
import { Sessao } from '../src/jogo/sessao.ts';
import { avaliarJogador } from '../src/mercado/mercadoUtilizador.ts';
import { NEG_JOGADOR } from '../src/config/negociacaoUtilizador.ts';

const fonte = () => new LocalFileSource(new URL('../packs/', import.meta.url).pathname);

describe('mercado do utilizador', () => {
  it('compra: recusa abaixo do pedido, acordo com o clube e com o jogador, registo; a gravação reconstrói o mesmo', async () => {
    const a = new Sessao(fonte());
    const paises = await a.novoMundo(2026);
    const clube = paises.find((p) => p.id === 'por')!.ligas[0].clubes[2];
    a.comecar(clube.id, { nome: 'Teste', perfilDono: 'dono-banca' });
    a.avancar(); // a janela de Verão abre em Julho
    const w = a.w!, st = w.jogadores!, m = w.mercado!, c = a.clube;
    // Alvo: o 5.º melhor de outro clube da mesma liga.
    const outro = w.ligas[w.liga[c]].clubes.find((x) => x !== c)!;
    const alvo = m.plantel(outro).sort((x, y) => st.ovrNat(y) - st.ovrNat(x))[4];
    a.comando({ tipo: 'negociar', jogador: st.ids[alvo], negocio: 'transferencia' });
    const n = m.util!.negs[0];
    expect(n.fase).toBe('clube');
    expect(n.pedido).toBeGreaterThan(0);
    const pedido0 = n.pedido;
    // Muito abaixo: recusa, tensão sobe, o pedido desce para a média (não abaixo do piso).
    a.comando({ tipo: 'propostaClube', id: n.id, valor: Math.round(pedido0 * 0.8), vendaFutura: 0, parcelas: 'vista', troca: null });
    expect(n.fase).toBe('clube');
    expect(n.tensao).toBeGreaterThan(35);
    expect(n.pedido).toBeLessThan(pedido0);
    expect(n.pedido).toBeGreaterThanOrEqual(n.piso);
    // 10% de venda futura baixa o que o clube exige 4%.
    a.comando({ tipo: 'propostaClube', id: n.id, valor: Math.ceil(n.pedido * 0.97), vendaFutura: 10, parcelas: 'vista', troca: null });
    expect(n.fase).toBe('jogador');
    expect(n.pede!.salario).toBeGreaterThan(0);
    // Jogador: abaixo do pedido recusa (e cede um pouco); ao pedido aceita.
    const pe = { ...n.pede! };
    const baixa = { papel: pe.papel, anos: 3, salario: Math.round(pe.salario * 0.6), premio: pe.premio, agente: pe.agente, clausula: 0, bonus: null };
    expect(avaliarJogador(pe, baixa, 1e6, 'MC').ok).toBe(false);
    a.comando({ tipo: 'propostaJogador', id: n.id, proposta: baixa });
    expect(n.fase).toBe('jogador');
    expect(n.pede!.salario).toBeLessThan(pe.salario);
    const boa = { papel: n.pede!.papel, anos: 3, salario: n.pede!.salario, premio: n.pede!.premio, agente: n.pede!.agente, clausula: 0, bonus: null };
    a.comando({ tipo: 'propostaJogador', id: n.id, proposta: boa });
    expect(n.fase).toBe('registo');
    for (let k = 0; k < 3; k++) a.avancar();
    expect(n.fase).toBe('concluida');
    expect(st.clube[alvo]).toBe(c);
    expect(st.salario[alvo]).toBe(boa.salario);
    expect(m.contratos.vendaFutura.get(alvo)?.pct).toBeCloseTo(0.1);
    expect(NEG_JOGADOR.estatuto[boa.papel]).toBeTruthy();
    // A IA não compra nem lista pelo utilizador; uma oferta recebida espera pela resposta.
    a.comando({ tipo: 'listar', jogador: st.ids[m.plantel(c)[20]], listado: true });
    for (let k = 0; k < 4; k++) a.avancar();
    const r1 = a.resumo();
    const b = new Sessao(fonte());
    await b.carregar(JSON.parse(JSON.stringify(a.registo)));
    expect(b.resumo()).toEqual(r1);
    expect(b.w!.jogadores!.clube[alvo]).toBe(b.clube);
  }, 180000);
});
