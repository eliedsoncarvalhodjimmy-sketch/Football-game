// Prompt 6, Bloco A: direitos futuros (venda futura e recompra a preço fixo), liquidação única e garantia de pagamento.
// Os casos do utilizador: Real Madrid 10 M€ com 20% e venda a 50 M€; segunda venda sem pagamento; recompra exercida e
// recusada; dois beneficiários a 50% e um terceiro cortado; parcelas; venda forçada; opção de compra; clube sem liga.
import { describe, expect, it, beforeAll } from 'vitest';
import { mundo } from './helpers.ts';
import { diaInicioMundo, type World } from '../src/engine/world.ts';
import { Rng } from '../src/core/rng.ts';
import type { Mercado, Negocio } from '../src/mercado/mercado.ts';
import type { TermosUtilizador } from '../src/mercado/mercadoUtilizador.ts';

let w: World, m: Mercado;
const dia0 = diaInicioMundo() + 10;
beforeAll(async () => { w = await mundo(); m = w.mercado!; m.direitos.verificar = true; }, 60000);

/** Clube de uma liga pela posição na reputação (0 = o maior). */
const clube = (liga: string, k: number) => [...w.ligaPorId(liga).clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a])[k];
const jovem = (c: number) => m.plantel(c).filter((j) => w.jogadores!.idade(j, dia0) <= 21).sort((a, b) => w.jogadores!.ovrNat(b) - w.jogadores!.ovrNat(a))[0];
/** Recebido por um clube (rubrica de transferências) mais o que ainda lhe chega em parcelas. */
const recebido = (c: number) => w.economia!.clubes.conta(c, 'transferencias') + m.parcelas.filter((p) => p.recebedor === c).reduce((a, p) => a + p.valor, 0);
const VISTA: TermosUtilizador = { parcelas: 'vista', vendaFutura: 0, troca: null, premio: 0, agente: 0, anos: 3, clausula: 0, bonus: null };
let seq = 9e6;
/** Uma venda concluída (sem sorteios: à vista, ou com os termos dados). */
function vender(j: number, de: number, para: number, preco: number, dia: number, extra: Partial<Negocio> = {}): Negocio {
  const n: Negocio = { id: ++seq, tipo: 'transferencia', jogador: j, vendedor: de, comprador: para, estado: 'registo', oferta: preco, pedido: preco, maximo: preco, salario: w.jogadores!.salario[j], estatuto: 'rotacao', dia, inicio: dia, rondas: [], util: VISTA, ...extra };
  m.concluir(n, Rng.de(1, 'teste-direitos', n.id));
  return n;
}

describe('direitos futuros (Prompt 6, Bloco A)', () => {
  it('exemplo Real Madrid: 10 M€ com 20%, venda a 50 M€ → 10 M€ para o Real, que perde o direito; a venda seguinte não lhe paga nada', () => {
    const real = clube('ESP1', 0), medio = clube('ITA1', 12), grande = clube('ENG1', 0), outro = clube('GER1', 3);
    const j = jovem(real);
    vender(j, real, medio, 10e6, dia0, { util: { ...VISTA, vendaFutura: 20 } });
    expect(m.direitos.de(j).map((d) => [d.tipo, d.clube, d.pct])).toEqual([['venda_futura', real, 0.2]]);
    const r0 = recebido(real), v0 = recebido(medio);
    const n = vender(j, medio, grande, 50e6, dia0 + 3 * 365);
    expect(recebido(real) - r0).toBeCloseTo(10e6, -2);
    expect(recebido(medio) - v0).toBeCloseTo(40e6, -2);
    expect(n.rondas.some((r) => r.texto.includes('que perde o direito'))).toBe(true);
    expect(m.direitos.de(j)).toEqual([]);
    // Segunda venda: o Real não volta a receber; e não pode voltar a ter venda futura sobre este jogador.
    const r1 = recebido(real);
    vender(j, grande, outro, 60e6, dia0 + 4 * 365);
    expect(recebido(real)).toBe(r1);
    expect(m.direitos.criar(j, 'venda_futura', real, 0.2, dia0 + 4 * 365, 60e6, 5)).toBeNull();
  });

  it('dois beneficiários somam 50% e um terceiro é cortado; na venda seguinte pagam os dois e extinguem-se', () => {
    const a = clube('POR1', 0), b = clube('POR1', 1), c = clube('POR1', 2), comp = clube('ENG1', 2), vend = clube('POR1', 5);
    const j = jovem(vend);
    expect(m.direitos.criar(j, 'venda_futura', a, 0.3, dia0, 1e6, 5)!.pct).toBeCloseTo(0.3);
    expect(m.direitos.criar(j, 'venda_futura', b, 0.25, dia0, 1e6, 5)!.pct).toBeCloseTo(0.2); // cortada ao que sobra
    expect(m.direitos.criar(j, 'venda_futura', c, 0.15, dia0, 1e6, 5)).toBeNull(); // nada sobra
    expect(m.direitos.vendaFuturaActiva(j)).toBeCloseTo(0.5);
    const ra = recebido(a), rb = recebido(b), rv = recebido(vend);
    vender(j, vend, comp, 20e6, dia0 + 100);
    expect(recebido(a) - ra).toBeCloseTo(6e6, -2);
    expect(recebido(b) - rb).toBeCloseTo(4e6, -2);
    expect(recebido(vend) - rv).toBeCloseTo(10e6, -2);
    expect(m.direitos.de(j)).toEqual([]);
  });

  it('venda em parcelas: o beneficiário recebe na mesma proporção e nas mesmas datas', () => {
    const vend = clube('NED1', 3), comp = clube('ESP1', 2), titular = clube('NED1', 0);
    const j = jovem(vend);
    m.direitos.criar(j, 'venda_futura', titular, 0.2, dia0, 1e6, 5);
    const n = vender(j, vend, comp, 30e6, dia0 + 200, { util: { ...VISTA, parcelas: 'trimestrais' } });
    const pT = m.parcelas.filter((p) => p.recebedor === titular && p.pagador === comp && p.dia > n.dia), pV = m.parcelas.filter((p) => p.recebedor === vend && p.pagador === comp && p.dia > n.dia);
    expect(pT.length).toBe(4);
    expect(pT.map((p) => p.dia)).toEqual(pV.map((p) => p.dia));
    for (let k = 0; k < 4; k++) expect(pT[k].valor / pV[k].valor).toBeCloseTo(0.2 / 0.8, 6);
  });

  it('venda forçada, opção de compra de empréstimo e clube sem liga: todas pagam pela mesma liquidação', () => {
    const vend = clube('FRA1', 6), comp = clube('FRA1', 0);
    // Titular sem liga: um clube qualquer posto temporariamente fora das ligas recebe na mesma.
    const semLiga = clube('BEL1', 8), liga = w.liga[semLiga];
    const j = jovem(vend);
    m.direitos.criar(j, 'venda_futura', semLiga, 0.15, dia0, 1e6, 5);
    w.liga[semLiga] = -1;
    m.contratos.listado[j] = 3; // venda forçada (administração)
    const r0 = recebido(semLiga);
    vender(j, vend, comp, 8e6, dia0 + 50);
    expect(recebido(semLiga) - r0).toBeCloseTo(1.2e6, -2);
    w.liga[semLiga] = liga;
    // Opção de compra de um empréstimo: o dono vende ao clube que o tinha emprestado (o mesmo caminho).
    const dono = clube('ITA1', 1), emp = clube('ITA1', 10), titular = clube('ITA1', 15);
    const k2 = jovem(dono);
    m.direitos.criar(k2, 'venda_futura', titular, 0.1, dia0, 1e6, 5);
    const r1 = recebido(titular);
    vender(k2, dono, emp, 5e6, dia0 + 60, { rondas: [{ dia: dia0 + 60, texto: 'exerce a opção de compra' }] });
    expect(recebido(titular) - r1).toBeCloseTo(0.5e6, -2);
  });

  it('o titular que compra o jogador não se paga a si próprio; os direitos caducam ao fim da validade', () => {
    const vend = clube('SCO1', 2), titular = clube('SCO1', 0);
    const j = jovem(vend);
    m.direitos.criar(j, 'venda_futura', titular, 0.2, dia0, 1e6, 5);
    const r0 = recebido(titular), v0 = recebido(vend);
    vender(j, vend, titular, 4e6, dia0 + 10);
    expect(recebido(vend) - v0).toBeCloseTo(4e6, -2); // o vendedor recebe tudo
    expect(recebido(titular)).toBe(r0);
    expect(m.direitos.de(j)).toEqual([]);
    const k = jovem(clube('SCO1', 4));
    m.direitos.criar(k, 'venda_futura', titular, 0.2, dia0, 1e6, 1);
    m.direitos.caducar(dia0 + 400);
    expect(m.direitos.de(k)).toEqual([]);
  });

  it('recompra: o titular é notificado quando o vendedor aceita; exerce ao preço fixo (o outro negócio cai) ou recusa (segue e o direito extingue-se)', () => {
    const st = w.jogadores!;
    // Um dia com a janela aberta.
    let dia = dia0; while (!m.janelaAberta(clube('ENG1', 0), dia) && dia < dia0 + 400) dia++;
    const casos = [{ preco: 1e5, exerce: true }, { preco: 5e8, exerce: false }];
    for (const { preco, exerce } of casos) {
      // Um clube pequeno com a recompra de um jogador forte (melhora-lhe o plantel) de um clube grande.
      const titular = clube('ENG1', exerce ? 19 : 18), vend = clube('ENG1', exerce ? 2 : 3), comp = clube('ESP1', 1);
      const j = [...m.plantel(vend)].filter((x) => !m.podeInscrever(x, titular)).sort((a, b) => st.ovrNat(b) - st.ovrNat(a))[0];
      w.economia!.clubes.caixa[titular] = Math.max(w.economia!.clubes.caixa[titular], 1e9);
      const d = m.direitos.criar(j, 'recompra', titular, preco, dia, preco, 2)!;
      expect(d.tipo).toBe('recompra');
      const n: Negocio = { id: ++seq, tipo: 'transferencia', jogador: j, vendedor: vend, comprador: comp, estado: 'oferta', oferta: 9e7, pedido: 0, maximo: 9e7, salario: 0, estatuto: 'rotacao', dia, inicio: dia, rondas: [], contra: 1 };
      m.negocios.push(n);
      const rng = Rng.de(2, 'recompra', n.id);
      m.ronda(n, rng);
      expect(n.estado).toBe('recompra');
      expect(n.rondas.some((r) => r.texto.includes('é notificado'))).toBe(true);
      m.ronda(n, rng);
      if (exerce) {
        expect(n.estado).toBe('falhou');
        expect(n.motivo).toContain('exerceu a recompra');
        const r = m.negocios.find((x) => x.deRecompra && x.jogador === j)!;
        expect(r.comprador).toBe(titular);
        expect(r.oferta).toBe(d.preco);
      } else {
        expect(n.estado).toBe('termos');
        expect(m.direitos.recompra(j, dia)).toBeNull();
      }
    }
    const tot = [...m.direitos.porEpoca.values()].reduce((a, c) => ({ e: a.e + c.recomprasExercidas, r: a.r + c.recomprasRecusadas }), { e: 0, r: 0 });
    expect(tot.e).toBeGreaterThanOrEqual(1);
    expect(tot.r).toBeGreaterThanOrEqual(1);
  });

  it('recompra também com notificação na cláusula de rescisão paga e na opção/obrigação de compra de empréstimo', () => {
    const st = w.jogadores!;
    let dia = dia0 + 500; while (!m.janelaAberta(clube('ENG1', 0), dia) && dia < dia0 + 900) dia++;
    // Cláusula de rescisão: o titular (que recusa: preço fixo muito alto) é notificado antes dos termos pessoais.
    const titular = clube('ENG1', 17), vend = clube('ENG1', 5), comp = clube('ESP1', 3);
    const j = [...m.plantel(vend)].filter((x) => st.posNat[x] !== 0).sort((a, b) => st.ovrNat(b) - st.ovrNat(a))[1];
    m.direitos.criar(j, 'recompra', titular, 5e8, dia, 5e8, 2);
    const n = m.abrir('clausula', j, comp, dia, 8e7, 8e7, Rng.de(4, 'cl'))!;
    expect(n.estado).toBe('recompra');
    expect(n.rondas.some((r) => r.texto.includes('é notificado'))).toBe(true);
    m.ronda(n, Rng.de(4, 'cl2'));
    expect(n.estado).toBe('termos');
    expect(m.direitos.recompra(j, dia)).toBeNull();
    // Opção/obrigação de compra de um empréstimo: o negócio espera a decisão; recusada, conclui-se na mesma.
    const dono = clube('ITA1', 2), emp = clube('ITA1', 11), tit2 = clube('ITA1', 16);
    const k = [...m.plantel(dono)].filter((x) => st.posNat[x] !== 0 && st.idade(x, dia) <= 23).sort((a, b) => st.ovrNat(b) - st.ovrNat(a))[0];
    (m as unknown as { mover: (j: number, de: number, para: number, d: number) => void }).mover(k, dono, emp, dia);
    m.contratos.emprestimo.set(k, { dono, ate: dia, salarioReceptor: 1, opcao: 3e6, obrigacao: true, minutos: 0 });
    w.economia!.clubes.caixa[emp] = Math.max(w.economia!.clubes.caixa[emp], 1e8);
    m.direitos.criar(k, 'recompra', tit2, 4e8, dia - 100, 4e8, 2);
    m.fimDeContratos({ pacotes: [{ ligas: [w.liga[emp]] }] } as never, dia);
    const op = m.negocios.find((x) => x.jogador === k && x.estado === 'recompra')!;
    expect(op).toBeDefined();
    expect(op.comprador).toBe(emp);
    m.ronda(op, Rng.de(5, 'op'));
    expect(op.estado).toBe('concluido');
    expect(st.clube[k]).toBe(emp);
  });

  it('a IA pede direitos quando faz sentido (grande que vende jovem com potencial a um clube menor) e nunca a um veterano sem potencial', async () => {
    const { planearDireitos } = await import('../src/mercado/direitos.ts');
    const st = w.jogadores!;
    const real = clube('ESP1', 0), pequeno = clube('ESP1', 17);
    const jovens = m.plantel(real).filter((j) => st.idade(j, dia0) <= 21 && st.pot[j] - st.ovrNat(j) >= 8);
    const velhos = m.plantel(real).filter((j) => st.idade(j, dia0) >= 31 && st.pot[j] <= st.ovrNat(j));
    const taxa = (js: number[]) => { let n = 0, t = 0; for (const j of js) for (let k = 0; k < 20; k++) { t++; if (planearDireitos(w, m.contratos, m.direitos, j, real, pequeno, 5e6, dia0, `t|${j}|${k}`).vendaFutura > 0) n++; } return t ? n / t : 0; };
    if (jovens.length) expect(taxa(jovens)).toBeGreaterThan(0.4);
    if (velhos.length) expect(taxa(velhos)).toBeLessThan(0.1);
    expect(m.direitos.erros).toEqual([]);
  });
});
