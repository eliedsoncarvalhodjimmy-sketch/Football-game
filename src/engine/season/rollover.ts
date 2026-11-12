// Passagem de época: classificações finais, subidas e descidas (incluindo
// play-offs, barragens e clubes exteriores), vagas continentais da época
// seguinte e actualização da reputação. Só corre depois de TODAS as
// competições terminarem.
import { Rng, hash32 } from '../../core/rng.ts';
import { REPUTACAO } from '../../config/reputacao.ts';
import { GERACAO } from '../../config/geracao.ts';
import type { World } from '../world.ts';
import type { Temporada } from './temporada.ts';
import { atribuirVagas, type EntradaPais } from './qualify.ts';
import { bandaReputacao, gerarClube, clamp } from '../../gen/mundoFicticio.ts';
import { empacotarJogos, textoResultado, type Movimento, type RegistoEpoca, type RegistoContinental } from '../history.ts';
import { FaseLigaUEFA } from '../competitions/leaguePhase.ts';
import type { RegrasLiga } from '../../data/types.ts';
import type { MataMata } from '../competitions/matamata.ts';

function alvoPosicao(regras: RegrasLiga, pos: number, n: number): number {
  const [tecto, piso] = bandaReputacao(regras);
  const { a, p } = GERACAO.reputacao;
  const u = n === 1 ? 0 : (pos - 1) / (n - 1);
  return piso + (tecto - piso) * ((1 - a) * (1 - u) + a * Math.pow(1 - u, p));
}

const resMM = (m: MataMata) => ({ vencedor: m.vencedorFinal!, finalista: m.finalista!, final: textoResultado(m.jogoFinal) });

export function fecharEpoca(w: World, t: Temporada, guardarJogos = true): RegistoEpoca {
  if (t.comps.some((c) => !c.terminada())) throw new Error('passagem de época com competições por terminar');
  const ep = w.epoca;
  const reg: RegistoEpoca = {
    epoca: ep, tabelas: {}, campeoes: {}, playoffsCampeao: {}, playoffsSubida: {}, barragens: {}, movimentos: [],
    tacas: {}, continentais: {}, qualificadosProxima: {}, repAntes: Array.from(w.reputacao), repDepois: [],
    estatLiga: t.estatLiga, jogos: null, impressao: 0,
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
    reg.tacas[id] = { vencedor: tc.vencedorFinal!, finalista: tc.finalista!, final: textoResultado(tc.jogoFinal) };
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
      qualificados: w.qualificados.get(id) ?? [],
    };
    reg.continentais[id] = rc;
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
      for (let k = 0; k < r.descidas.directas; k++) desce(ordem[n - 1 - k], 'directa');
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
  const entradas = new Map<string, EntradaPais>();
  for (const p of w.pacotes) {
    if (!p.manifest.pais) continue;
    const id1 = w.ligas[p.ligas[0]].regras.id;
    const ordem = reg.tabelas[id1].map((l) => l.clube);
    const camp = reg.campeoes[id1];
    entradas.set(p.manifest.pais, { pais: p.manifest.pais, ordem: [camp, ...ordem.filter((x) => x !== camp)], vencedorTaca: reg.tacas[p.manifest.id]?.vencedor ?? null });
  }
  w.qualificados = atribuirVagas(w, entradas);
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
