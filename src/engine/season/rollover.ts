// Passagem de época: classificações finais, subidas e descidas (incluindo
// play-offs, barragens e clubes exteriores), vagas continentais da época
// seguinte e actualização da reputação. Só corre depois de TODAS as
// competições terminarem.
import { Rng, hash32 } from '../../core/rng.ts';
import { REPUTACAO } from '../../config/reputacao.ts';
import { GERACAO } from '../../config/geracao.ts';
import type { World } from '../world.ts';
import type { Temporada } from './temporada.ts';
import { atribuirVagas, type EntradaLiga } from './qualify.ts';
import { coeficientesUEFA } from './coeficiente.ts';
import { bandaReputacao, gerarClube, clamp } from '../../gen/mundoFicticio.ts';
import { empacotarJogos, textoResultado, type Movimento, type RegistoEpoca, type RegistoContinental } from '../history.ts';
import { FaseLigaUEFA } from '../competitions/leaguePhase.ts';
import type { RegrasLiga } from '../../data/types.ts';
import type { MataMata } from '../competitions/matamata.ts';

function curva(u: number): number {
  const { a, p } = GERACAO.reputacao;
  return (1 - a) * (1 - u) + a * Math.pow(1 - u, p);
}

/** Alvo de reputação pela posição final, com reversão à média da banda da liga. */
function alvoPosicao(regras: RegrasLiga, pos: number, n: number): number {
  const [tecto, piso] = bandaReputacao(regras);
  const u = n === 1 ? 0 : (pos - 1) / (n - 1);
  let media = 0;
  for (let i = 0; i < n; i++) media += curva(n === 1 ? 0 : i / (n - 1));
  media /= n;
  const lambda = REPUTACAO.reversao_media;
  return piso + (tecto - piso) * ((1 - lambda) * curva(u) + lambda * media);
}

/** Pontos por jogo nas últimas `epocas` épocas nesta liga (inclui a actual). */
function mediaPontos(clube: number, liga: string, epocas: number, actual: { pts: number; pj: number }, hist: RegistoEpoca[]): number {
  let pts = actual.pts, pj = actual.pj;
  for (const r of hist.slice(-(epocas - 1))) {
    const l = r.tabelas[liga]?.find((x) => x.clube === clube);
    if (l) { pts += l.pts; pj += l.pj; }
  }
  return pj ? pts / pj : 0;
}

const resMM = (m: MataMata) => ({ vencedor: m.vencedorFinal!, finalista: m.finalista!, final: textoResultado(m.jogoFinal, m.jogoFinal?.neutro === true) });

export function fecharEpoca(w: World, t: Temporada, guardarJogos = true, historico: RegistoEpoca[] = []): RegistoEpoca {
  if (t.comps.some((c) => !c.terminada())) throw new Error('passagem de época com competições por terminar');
  const ep = w.epoca;
  const reg: RegistoEpoca = {
    epoca: ep, tabelas: {}, campeoes: {}, playoffsCampeao: {}, playoffsSubida: {}, barragens: {}, movimentos: [],
    tacas: {}, continentais: {}, acesso: {}, coeficientes: {}, bonusProxima: [], detentoresProxima: {},
    qualificadosProxima: {}, repAntes: Array.from(w.reputacao), repDepois: [], estatLiga: t.estatLiga, jogos: null, impressao: 0,
  };
  const pac = empacotarJogos(t.jogos);
  let h = hash32(ep);
  for (let i = 0; i < pac.dados.length; i++) h = Math.imul(h ^ pac.dados[i], 0x01000193) >>> 0;
  reg.impressao = hash32(h, pac.comps.join(','));
  if (guardarJogos) reg.jogos = pac;
  const bonus = new Map<number, number>();
  const somar = (c: number, b: number) => bonus.set(c, (bonus.get(c) ?? 0) + b);

  // 1. Classificações, campeões, play-offs.
  for (const [id, c] of t.ligas) {
    reg.tabelas[id] = c.classificacao();
    const pc = t.playoffsCampeao.get(id);
    reg.campeoes[id] = pc ? pc.vencedorFinal! : c.posicao(1);
    if (pc) reg.playoffsCampeao[id] = resMM(pc);
    somar(reg.campeoes[id], REPUTACAO.bonus.campeao);
  }
  for (const [id, m] of t.playoffsSubida) reg.playoffsSubida[id] = { ...resMM(m), participantes: m.participantes! };
  for (const [id, m] of t.barragens) reg.barragens[id] = { ...resMM(m), participantes: m.participantes! };
  for (const [id, tc] of t.tacas) {
    reg.tacas[id] = { vencedor: tc.vencedorFinal!, finalista: tc.finalista!, final: textoResultado(tc.jogoFinal, tc.jogoFinal?.neutro === true) };
    somar(tc.vencedorFinal!, REPUTACAO.bonus.taca_vencedor);
    somar(tc.finalista!, REPUTACAO.bonus.taca_finalista);
  }
  for (const [id, cc] of t.continentais) {
    const ko = cc instanceof FaseLigaUEFA ? cc.final : cc.ko;
    const fases: Record<number, string> = {};
    for (const e of cc.equipas) {
      fases[e.clube] = cc.faseDe(e.clube);
      somar(e.clube, (REPUTACAO.continental_fase[fases[e.clube]] ?? 0) * (REPUTACAO.continental_prestigio[id] ?? 0.5));
    }
    const rc: RegistoContinental = {
      ...resMM(ko), fases,
      tabela: cc instanceof FaseLigaUEFA ? [cc.classificacao()] : cc.grupos.map((g) => cc.classificacao(g)),
      qualificados: t.participantes.get(id) ?? [],
    };
    reg.continentais[id] = rc;
  }
  for (const [id, m] of t.acesso) {
    const venc = m.sobreviventes();
    reg.acesso[id] = { participantes: m.participantes ?? [], vencedores: venc };
    for (const x of venc) somar(x, (REPUTACAO.continental_fase.playoff ?? 0) * (REPUTACAO.continental_prestigio[id.replace('_PO', '')] ?? 0.5));
  }
  // Coeficiente UEFA da época (por associação = liga que deu a vaga).
  reg.coeficientes = coeficientesUEFA(t);
  const bonusCfg = w.continental?.vagas.especiais?.bonus_ranking;
  reg.bonusProxima = Object.entries(reg.coeficientes).sort((a, b) => b[1] - a[1]).slice(0, bonusCfg?.paises ?? 0).map(([l]) => l);
  for (const d of w.continental?.vagas.especiais?.detentores ?? []) {
    const cc = t.continentais.get(d.de);
    const ko = cc instanceof FaseLigaUEFA ? cc.final : cc?.ko;
    if (ko?.vencedorFinal != null) reg.detentoresProxima[d.de] = ko.vencedorFinal;
  }

  // 2. Alvos de reputação (pela liga em que jogaram).
  const alvo = new Map<number, number>();
  for (const [id, c] of t.ligas) {
    const cl = c.classificacao();
    cl.forEach((l, i) => alvo.set(l.clube, alvoPosicao(c.regras, i + 1, cl.length)));
  }

  // 3. Movimentos entre divisões.
  const novaLiga = new Map<number, number>();
  const movs: Movimento[] = [];
  for (const p of w.pacotes) {
    const ligas = p.ligas.map((li) => t.ligas.get(w.ligas[li].regras.id)!);
    ligas.forEach((c, i) => { for (const x of c.clubes) novaLiga.set(x, p.ligas[i]); });
    ligas.forEach((c, i) => {
      const r = c.regras;
      const ordem = c.classificacao().map((l) => l.clube);
      const n = ordem.length;
      const baixo = ligas[i + 1];
      const desce = (x: number, via: Movimento['via']) => {
        if (baixo) { novaLiga.set(x, p.ligas[i + 1]); movs.push({ clube: x, de: r.id, para: baixo.regras.id, via }); somar(x, REPUTACAO.bonus.descida); }
        else { novaLiga.set(x, -1); movs.push({ clube: x, de: r.id, para: 'exterior', via: 'exterior' }); }
      };
      const sobe = (x: number, via: Movimento['via']) => {
        novaLiga.set(x, p.ligas[i - 1]);
        movs.push({ clube: x, de: r.id, para: ligas[i - 1].regras.id, via });
        somar(x, REPUTACAO.bonus.subida);
      };
      if (r.descida_media_epocas && r.descidas.directas > 0) {
        // Descida pela média de pontos das últimas N épocas na liga (ex.: Colômbia).
        const linhas = c.classificacao();
        const med = new Map(linhas.map((l) => [l.clube, mediaPontos(l.clube, r.id, r.descida_media_epocas!, l, historico)]));
        const pos = new Map(ordem.map((x, k) => [x, k]));
        const porMedia = [...ordem].sort((a, b) => med.get(a)! - med.get(b)! || pos.get(b)! - pos.get(a)!);
        for (let k = 0; k < r.descidas.directas; k++) desce(porMedia[k], 'directa');
      } else for (let k = 0; k < r.descidas.directas; k++) desce(ordem[n - 1 - k], 'directa');
      if (i > 0) {
        for (let k = 0; k < r.subidas.directas; k++) sobe(ordem[k], 'directa');
        const po = t.playoffsSubida.get(r.id);
        if (po && r.subidas.playoff?.destino === 'subida') sobe(po.vencedorFinal!, 'playoff');
      }
      const bar = t.barragens.get(r.id);
      if (bar) {
        const [cima, rival] = bar.participantes!;
        if (bar.vencedorFinal === rival) {
          desce(cima, 'barragem');
          novaLiga.set(rival, p.ligas[i]);
          movs.push({ clube: rival, de: baixo!.regras.id, para: r.id, via: 'barragem' });
          somar(rival, REPUTACAO.bonus.subida);
        }
      }
    });
  }
  reg.movimentos = movs;

  // 4. Vagas continentais da próxima época (com a liga já actualizada, para excluir quem saiu do jogo).
  for (const [x, l] of novaLiga) w.liga[x] = l;
  const entradas = new Map<string, EntradaLiga>();
  for (const p of w.pacotes) {
    const id1 = w.ligas[p.ligas[0]].regras.id;
    const tabela = reg.tabelas[id1].map((l) => l.clube);
    const camp = reg.campeoes[id1];
    const vencedoresTaca = new Map<string, number>();
    for (const tc of p.tacas) if (tc.vaga_vencedor && reg.tacas[tc.id]) vencedoresTaca.set(tc.vaga_vencedor, reg.tacas[tc.id].vencedor);
    entradas.set(id1, { liga: id1, ordem: [camp, ...tabela.filter((x) => x !== camp)], pos: new Map(tabela.map((x, i) => [x, i + 1])), campeao: camp, vencedoresTaca });
  }
  w.qualificados = atribuirVagas(w, entradas, { detentores: new Map(Object.entries(reg.detentoresProxima)), bonus: reg.bonusProxima });
  reg.qualificadosProxima = Object.fromEntries(w.qualificados);

  // 5. Reputação.
  for (const [x, a] of alvo) {
    const r = w.reputacao[x];
    const delta = clamp(REPUTACAO.alfa * (a + (bonus.get(x) ?? 0) - r), -REPUTACAO.max_variacao, REPUTACAO.max_variacao);
    w.reputacao[x] = clamp(Math.round((r + delta) * 10) / 10, 1, 100);
    w.clubes[x].reputacao = w.reputacao[x];
  }

  // 6. Listas das ligas e clubes do exterior.
  for (const l of w.ligas) l.clubes = [];
  for (const [x, l] of novaLiga) {
    if (l >= 0) { w.ligas[l].clubes.push(x); w.clubes[x].liga = w.ligas[l].regras.id; }
    else w.clubes[x].liga = 'exterior';
  }
  for (const p of w.pacotes) {
    const li = p.ligas[p.ligas.length - 1];
    const l = w.ligas[li];
    const falta = l.regras.formato.equipas - l.clubes.length;
    if (falta <= 0) continue;
    const rng = Rng.de(w.semente, 'exterior', p.manifest.id, ep);
    const [, piso] = bandaReputacao(l.regras);
    const novos = [];
    for (let k = 0; k < falta; k++) {
      const rep = clamp(Math.round(piso - GERACAO.exterior.desconto_reputacao + rng.normal(0, GERACAO.exterior.ruido)), 1, 100);
      const id = `${p.manifest.id}_x${ep}_${k + 1}`;
      novos.push(gerarClube(w.ctx, rng, p.manifest.perfil_nomes, p.manifest.pais!, l.regras.id, id, rep, w.modo));
    }
    const n0 = w.clubes.length;
    w.adicionarClubes(novos);
    for (let k = 0; k < novos.length; k++) movs.push({ clube: n0 + k, de: 'exterior', para: l.regras.id, via: 'exterior' });
  }
  reg.repDepois = Array.from(w.reputacao);

  // 7. Nova época.
  w.epoca = ep + 1;
  w.recalcularForca();
  return reg;
}
