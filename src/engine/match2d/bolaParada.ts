// Motor 2D táctico — bolas paradas (secção 11, "Bolas paradas (todos os estilos)") e cartões. Planeia cada canto, livre
// perigoso e penálti: quem marca, a variante, para onde vai cada jogador das duas equipas e o que acontece ao bater.
import { BOLA_PARADA as BP, PENALTI, CARTOES } from '../../config/match2d/fase5.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { aleatorio } from '../decision/rng.ts';
import { paraEquipa, paraAbsoluto, dist } from './referencial.ts';
import type { Estado2D, Jogador2D, V2, Equipa, Reposicao2D, PlanoBolaParada } from './tipos.ts';

const C = CAMPO_2D, MEIO = C.largura / 2;
const at = (j: Jogador2D, k: string) => (j.attrs as Record<string, number | undefined>)[k] ?? 10;
const outra = (e: Equipa): Equipa => (e === 0 ? 1 : 0);
const cabeceador = (j: Jogador2D) => at(j, 'cab') + 0.6 * at(j, 'imp') + 0.3 * at(j, 'for');

/** Dentro da grande área da equipa `e` (a área que ela defende)? */
export function naGrandeArea(e: Equipa, p: V2): boolean {
  const q = paraEquipa(e, p);
  return q.x < 16.5 && Math.abs(q.y - MEIO) < 20.16;
}

function escolherVariante(chave: string): string {
  const v = Object.entries(BP.variantes_canto), tot = v.reduce((a, [, w]) => a + w, 0);
  let r = aleatorio(chave) * tot;
  for (const [k, w] of v) { r -= w; if (r <= 0) return k; }
  return v[0][0];
}

/** Planeia a bola parada (ou devolve null para uma reposição normal). */
export function planear(s: Estado2D, r: Reposicao2D, semente: string): PlanoBolaParada | null {
  const a = r.equipa, d = outra(a);
  const loc = paraEquipa(a, r.local);
  const campo = (e: Equipa) => s.jogadores.filter((j) => j.equipa === e && j.chave !== 'GR');
  const chave = `${semente}|bp|${s.tick}`;
  if (r.tipo === 'penalti') return planoPenalti(s, a, chave);
  if (r.tipo === 'canto') return planoCruzamento(s, a, d, r.local, loc.y > MEIO ? 1 : -1, escolherVariante(chave + '|var'), campo, 'canto');
  if (r.tipo === 'livre') {
    const dGolo = Math.hypot(C.comprimento - loc.x, MEIO - loc.y);
    if (dGolo < BP.livre_directo_m && Math.abs(loc.y - MEIO) < BP.livre_directo_largura) return planoLivreDirecto(s, a, d, r.local, dGolo, campo);
    if (loc.x > BP.livre_cruzado_x) return planoCruzamento(s, a, d, r.local, loc.y > MEIO ? 1 : -1, (() => { const r = aleatorio(chave + '|lado'); return r < BP.livre_cruzado_curto ? 'curto' : r < (1 + BP.livre_cruzado_curto) / 2 ? 'primeiro_poste' : 'segundo_poste'; })(), campo, 'livre_cruzado');
  }
  return null;
}

function planoCruzamento(s: Estado2D, a: Equipa, d: Equipa, local: V2, lado: number, variante: string, campo: (e: Equipa) => Jogador2D[], tipo: 'canto' | 'livre_cruzado'): PlanoBolaParada {
  const pos: Record<string, V2> = {};
  const atA = (x: number, y: number) => paraAbsoluto(a, { x, y: MEIO + lado * y });
  const meus = campo(a);
  const executor = [...meus].sort((x, y) => (at(y, 'cru') + at(y, 'bpa')) - (at(x, 'cru') + at(x, 'bpa')))[0];
  const resto = meus.filter((j) => j !== executor);
  // Atrás: os mais recuados (pela âncora) que não são dos melhores cabeceadores.
  const nArea = s.equipas[a].estilo === 'catenaccio' ? BP.na_area_catenaccio : BP.na_area;
  const porCabeca = [...resto].sort((x, y) => cabeceador(y) - cabeceador(x));
  const area = porCabeca.slice(0, nArea);
  const fora = resto.filter((j) => !area.includes(j)).sort((x, y) => paraEquipa(a, x.ancora).x - paraEquipa(a, y.ancora).x);
  const atras = fora.slice(0, BP.ficam_atras), entrada = fora.slice(BP.ficam_atras);
  // Zonas: a da variante fica com o melhor cabeceador (ou, na entrada da área, com o melhor rematador de longe).
  const Z = BP.zonas_ataque;
  const ordem = ['primeiro_poste', 'segundo_poste', 'centro', 'penalti', 'entrada_area'];
  let alvoId: string | undefined, alvo: V2 | undefined, curto: string | undefined;
  const zonasLivres = ordem.filter((z) => z !== 'entrada_area');
  if (variante === 'primeiro_poste' || variante === 'segundo_poste') {
    const [x, y] = Z[variante]; pos[area[0].id] = atA(x, y); alvoId = area[0].id; alvo = atA(x, y);
    zonasLivres.splice(zonasLivres.indexOf(variante), 1);
    area.slice(1).forEach((j, k) => { const [zx, zy] = Z[zonasLivres[k % zonasLivres.length]]; pos[j.id] = atA(zx - Math.floor(k / zonasLivres.length) * 2, zy); });
  } else {
    area.forEach((j, k) => { const [zx, zy] = Z[zonasLivres[k % zonasLivres.length]]; pos[j.id] = atA(zx - Math.floor(k / zonasLivres.length) * 2, zy); });
  }
  // Entrada da área e canto curto.
  const porRemate = [...entrada].sort((x, y) => at(y, 'rld') - at(x, 'rld'));
  porRemate.forEach((j, k) => { const [x, y] = Z.entrada_area; pos[j.id] = atA(x - (k % 2) * 3, y - k * 7); });
  if (variante === 'entrada_area' && porRemate[0]) { alvoId = porRemate[0].id; alvo = pos[alvoId]; }
  if (variante === 'curto' && tipo === 'canto') {
    const c = porRemate[0] ?? area[area.length - 1];
    const lq = paraEquipa(a, local);
    pos[c.id] = paraAbsoluto(a, { x: lq.x - BP.curto_m * 0.7, y: lq.y - Math.sign(lq.y - MEIO) * BP.curto_m * 0.7 });
    curto = c.id; alvoId = c.id; alvo = pos[c.id];
  }
  atras.forEach((j, k) => { pos[j.id] = atA(52, (k === 0 ? 10 : -10)); });
  // Defesa: mista (zona + homem nos melhores cabeceadores); Catenaccio: individual pura.
  const def = campo(d), atD = (x: number, y: number) => paraAbsoluto(d, { x, y: MEIO - lado * y });
  const individual = s.equipas[d].estilo === 'catenaccio';
  const frente = [...def].sort((x, y) => paraEquipa(d, y.ancora).x - paraEquipa(d, x.ancora).x).slice(0, individual ? 1 : BP.ficam_frente);
  frente.forEach((j, k) => { pos[j.id] = atD(38, k === 0 ? -6 : 8); });
  const livresD = def.filter((j) => !frente.includes(j)).sort((x, y) => (at(y, 'mar') + cabeceador(y)) - (at(x, 'mar') + cabeceador(x)));
  const alvosMarcar = porCabeca.slice(0, individual ? nArea : Math.min(3, nArea));
  const nZona = individual ? 0 : BP.zonas_defesa.length;
  // Os de zona são os que sobram depois dos marcadores; os marcadores ficam entre o atacante e a baliza.
  const marcadores = livresD.slice(0, alvosMarcar.length), zona = livresD.slice(alvosMarcar.length, alvosMarcar.length + nZona), sobras = livresD.slice(alvosMarcar.length + nZona);
  marcadores.forEach((j, k) => {
    const o = pos[alvosMarcar[k].id];
    const q = paraEquipa(d, o);
    pos[j.id] = paraAbsoluto(d, { x: Math.max(1, q.x - 1), y: q.y + (MEIO - q.y) * 0.1 });
  });
  zona.forEach((j, k) => { const [x, y] = BP.zonas_defesa[k]; pos[j.id] = atD(x, y); });
  sobras.forEach((j, k) => { pos[j.id] = atD(17 + (k % 2) * 3, (k - 1) * 7); });
  const gr = s.jogadores.find((j) => j.equipa === d && j.chave === 'GR');
  if (gr) pos[gr.id] = atD(0.8, -0.8);
  return { tipo, variante, executor: executor.id, alvo, receptor: alvoId, curto, posicoes: pos };
}

function planoLivreDirecto(s: Estado2D, a: Equipa, d: Equipa, local: V2, dGolo: number, campo: (e: Equipa) => Jogador2D[]): PlanoBolaParada {
  const pos: Record<string, V2> = {};
  const executor = [...campo(a)].sort((x, y) => (at(y, 'bpa') + at(y, 'rld')) - (at(x, 'bpa') + at(x, 'rld')))[0];
  // Barreira: na linha bola → centro da baliza, a 9,15 m, encostada ao lado do primeiro poste.
  const n = dGolo < 20 ? 4 : dGolo < 25 ? 3 : 2;
  const golo = paraAbsoluto(a, { x: C.comprimento, y: MEIO });
  const ux = (golo.x - local.x) / dGolo, uy = (golo.y - local.y) / dGolo;
  const def = campo(d).sort((x, y) => dist(x.p, local) - dist(y.p, local));
  const barreira = def.slice(0, n);
  barreira.forEach((j, k) => { pos[j.id] = { x: local.x + ux * BP.barreira_m - uy * (k - (n - 1) / 2) * 0.6, y: local.y + uy * BP.barreira_m + ux * (k - (n - 1) / 2) * 0.6 }; });
  return { tipo: 'livre_directo', executor: executor.id, posicoes: pos, barreira: barreira.map((j) => j.id) };
}

function planoPenalti(s: Estado2D, a: Equipa, chave: string): PlanoBolaParada {
  const pos: Record<string, V2> = {};
  const marcador = (j: Jogador2D) => (at(j, 'fin') + at(j, 'cmp') + at(j, 'bpa')) / 3;
  const executor = s.jogadores.filter((j) => j.equipa === a && j.chave !== 'GR').sort((x, y) => marcador(y) - marcador(x))[0];
  const gr = s.jogadores.find((j) => j.equipa !== a && j.chave === 'GR');
  // Todos fora da área, atrás da linha da bola; o GR na linha.
  let k = 0;
  for (const j of s.jogadores) {
    if (j === executor || j === gr) continue;
    pos[j.id] = paraAbsoluto(a, { x: 84 - (k % 3) * 2, y: MEIO - 16 + (k * 3.3) % 32 });
    k++;
  }
  if (gr) pos[gr.id] = paraAbsoluto(a, { x: C.comprimento - 0.3, y: MEIO });
  const pGolo = Math.max(PENALTI.min, Math.min(PENALTI.max, PENALTI.base + PENALTI.ponto_marcador * (marcador(executor) - 10) - PENALTI.ponto_gr * (gr ? (at(gr, 'ref') + at(gr, 'uco')) / 2 - 10 : 0)));
  const r = aleatorio(chave + '|pen');
  const resultado = r < pGolo ? 'golo' : r < pGolo + (1 - pGolo) * PENALTI.fora ? 'fora' : 'defesa';
  return { tipo: 'penalti', executor: executor.id, posicoes: pos, resultado, lado: aleatorio(chave + '|lado') < 0.5 ? -1 : 1 };
}

/** Cartão por uma falta de `d` sobre `c`: nada, amarelo ou vermelho. */
export function cartao(s: Estado2D, d: Jogador2D, c: Jogador2D, chave: string, penalti: boolean): 'AMARELO' | 'VERMELHO' | null {
  const q = paraEquipa(c.equipa, c.p);
  const golo = paraAbsoluto(c.equipa, { x: C.comprimento, y: MEIO });
  // Ocasião clara: perto, central e sem outro defensor de campo mais perto da baliza do que o atacante.
  const outros = s.jogadores.filter((o) => o.equipa === d.equipa && o !== d && o.chave !== 'GR' && dist(o.p, golo) < dist(c.p, golo));
  const ocasiao = q.x > CARTOES.ocasiao_x && Math.abs(q.y - MEIO) < CARTOES.ocasiao_largura && outros.length === 0;
  const r = aleatorio(chave + '|cartao');
  if (ocasiao && !penalti && r < CARTOES.vermelho_ocasiao) return 'VERMELHO';
  if (r > 0.99 && aleatorio(chave + '|violento') < CARTOES.vermelho_violento * 100) return 'VERMELHO';
  const frente = Math.cos(c.corpo - (c.equipa === 0 ? 0 : Math.PI)) > 0.3;
  const promissor = (frente && q.x > CARTOES.promissor_x) || s.equipas[c.equipa].fase === 'TRANS_DEF_ATQ' || ocasiao;
  // Por trás: o defensor chega do lado da baliza do atacante (atrás dele).
  const porTras = paraEquipa(c.equipa, d.p).x < q.x - 0.5;
  const p = CARTOES.amarelo_base + (promissor ? CARTOES.amarelo_tactica : 0) + CARTOES.amarelo_agr * (at(d, 'agr') - 10) + (porTras ? CARTOES.amarelo_por_tras : 0);
  return aleatorio(chave + '|amarelo') < p * (d.amarelos ? CARTOES.com_amarelo : 1) ? 'AMARELO' : null;
}
