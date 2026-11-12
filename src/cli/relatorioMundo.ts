// Relatórios markdown do mundo gerado (Paragem 2).
import type { World } from '../engine/world.ts';
import type { Jogo } from '../engine/calendar/types.ts';
import type { ProblemaCalendario } from '../engine/calendar/verificar.ts';
import { isoData } from '../engine/calendar/datas.ts';
import { CALENDARIO } from '../config/calendario.ts';

const mediana = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const r0 = (x: number) => Math.round(x);
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

function movimentos(w: World, li: number): string {
  const r = w.ligas[li].regras;
  const s: string[] = [];
  if (r.formato.playoff_campeao) s.push(`PO campeão ${r.formato.playoff_campeao.equipas}`);
  if (r.subidas.directas) s.push(`↑${r.subidas.directas}`);
  if (r.subidas.playoff) s.push(`PO ${r.subidas.playoff.de}.º–${r.subidas.playoff.ate}.º${r.subidas.playoff.destino === 'barragem' ? '→barr.' : '↑'}`);
  if (r.descidas.directas) s.push(`↓${r.descidas.directas}${r.descidas.exterior ? ' ext.' : ''}`);
  if (r.descidas.barragem) s.push(`barr. ${r.descidas.barragem.posicao}.º`);
  return s.join(', ') || '—';
}

export function relatorioMundo(w: World, cal: Map<string, Jogo[]>, problemas: ProblemaCalendario[], tempos: Record<string, number>): string {
  const L: string[] = [];
  L.push('# Mundo fictício — resumo por liga');
  L.push('');
  L.push(`> **DADOS DE TESTE.** Todos os clubes têm nomes inventados (origem \`teste\`). Semente ${w.semente}, época ${w.epoca}/${String(w.epoca + 1).slice(2)}.`);
  L.push('');
  L.push(`- Clubes: **${w.activos()}** em **${w.ligas.length}** ligas de **${w.pacotes.length}** pacotes.`);
  L.push(`- Jogos de liga na época: **${[...cal.values()].reduce((s, j) => s + j.length, 0)}**.`);
  L.push(`- Verificação do calendário de ligas: **${problemas.length === 0 ? 'sem conflitos' : problemas.length + ' problemas'}** (mesmo dia, > 2 jogos/semana, > 3 seguidos em casa/fora).`);
  L.push(`- Tempos em Node: carregar pacotes ${r0(tempos.carregar)} ms, gerar mundo ${r0(tempos.gerar)} ms, calendário ${r0(tempos.calendario)} ms.`);
  L.push('');
  L.push('Colunas: rep. = reputação (1–100); "≥80 / 50–79 / <50" = nº de clubes por faixa; atq/def = força média; jornadas a meio da semana = jornadas fora do fim-de-semana.');
  L.push('');
  L.push('| Pacote | Liga | Nív. | Eq. | Movimentos | Rep. máx | Rep. med. | Rep. mín | ≥80 / 50–79 / <50 | Atq/Def méd. | Lotação méd. | Jorn. | Meio sem. | 1.ª jornada | Última |');
  L.push('|---|---|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---|---|');
  for (const p of w.pacotes) {
    for (const li of p.ligas) {
      const l = w.ligas[li];
      const reps = l.clubes.map((c) => w.reputacao[c]);
      const forca = l.clubes.reduce((s, c) => s + (w.ataque[c] + w.defesa[c]) / 2, 0) / l.clubes.length;
      const cap = l.clubes.reduce((s, c) => s + w.clubes[c].capacidade, 0) / l.clubes.length;
      const js = cal.get(l.regras.id)!;
      const rondas = new Map<number, Jogo>();
      for (const j of js) if (!rondas.has(j.ronda)) rondas.set(j.ronda, j);
      const meio = [...rondas.values()].filter((j) => j.ranhura === 'meio').length;
      const primeira = rondas.get(1)!;
      const ultima = rondas.get(rondas.size)!;
      const f = [reps.filter((x) => x >= 80).length, reps.filter((x) => x >= 50 && x < 80).length, reps.filter((x) => x < 50).length].join(' / ');
      L.push(`| ${p.manifest.nome} | ${l.regras.nome} | ${l.regras.nivel} | ${l.clubes.length} | ${movimentos(w, li)} | ${Math.max(...reps)} | ${mediana(reps)} | ${Math.min(...reps)} | ${f} | ${forca.toFixed(1)} | ${r0(cap).toLocaleString('pt-PT')} | ${rondas.size} | ${meio} | ${isoData(w.epoca, primeira.semana, 5)} | ${isoData(w.epoca, ultima.semana, ultima.ranhura === 'fds' ? 5 : 1)} |`);
    }
  }
  L.push('');
  L.push('## Distribuição mundial da reputação');
  L.push('');
  L.push('| Faixa | Clubes |');
  L.push('|---|---:|');
  for (let b = 90; b >= 0; b -= 10) {
    const n = w.clubes.filter((_, i) => w.liga[i] >= 0 && w.reputacao[i] >= b && w.reputacao[i] < b + 10).length;
    L.push(`| ${b}–${b + 9} | ${n} ${'█'.repeat(Math.round(n / 8))} |`);
  }
  L.push('');
  L.push('## Os 25 clubes de maior reputação');
  L.push('');
  L.push('| # | Clube | País | Liga | Rep. | Atq | Def |');
  L.push('|---:|---|---|---|---:|---:|---:|');
  const top = w.clubes.map((c, i) => i).filter((i) => w.liga[i] >= 0).sort((a, b) => w.reputacao[b] - w.reputacao[a]).slice(0, 25);
  top.forEach((i, k) => L.push(`| ${k + 1} | ${w.clubes[i].nome} | ${w.clubes[i].pais} | ${w.ligas[w.liga[i]].regras.nome} | ${w.reputacao[i]} | ${w.ataque[i].toFixed(0)} | ${w.defesa[i].toFixed(0)} |`));
  L.push('');
  L.push('## Modelo de calendário "ago_mai" (todas as ligas)');
  L.push('');
  const m = CALENDARIO.modelos.ago_mai;
  const c = m.continentais;
  const uso = (s: number) => {
    const u: string[] = [];
    if (m.paragens_selecoes.includes(s)) u.push('**selecções**');
    if (c.fase_liga.includes(s)) u.push(`UEFA fase de liga J${c.fase_liga.indexOf(s) + 1}`);
    if (c.playoff.includes(s)) u.push('UEFA play-off');
    if (c.oitavos.includes(s)) u.push('UEFA oitavos');
    if (c.quartos.includes(s)) u.push('UEFA quartos');
    if (c.meias.includes(s)) u.push('UEFA meias');
    if (c.grupos.includes(s)) u.push(`Lib./Ásia grupos J${c.grupos.indexOf(s) + 1}`);
    if (c.quartos_grupos.includes(s)) u.push('Lib./Ásia quartos');
    if (c.meias_grupos.includes(s)) u.push('Lib./Ásia meias');
    if (c.final === s) u.push('finais continentais');
    if (m.taca.includes(s)) u.push('taça (ronda)');
    if (m.final_taca === s) u.push('final da taça (fds)');
    if (m.playoffs.includes(s)) u.push('play-offs/barragens (fds)');
    return u.join(', ');
  };
  L.push('| Semana | Segunda | Meio da semana / fds |');
  L.push('|---:|---|---|');
  for (let s = 0; s < CALENDARIO.semanas_por_epoca; s++) {
    const liga = s >= m.primeira_semana && s <= m.ultima_semana && !m.paragens_selecoes.includes(s) ? 'liga (fds)' : '';
    const t = [liga, uso(s)].filter(Boolean).join('; ');
    if (t) L.push(`| ${s} | ${isoData(w.epoca, s, 0)} | ${t} |`);
  }
  if (problemas.length) {
    L.push('');
    L.push('## Problemas de calendário');
    for (const p of problemas.slice(0, 50)) L.push(`- ${p.tipo}: ${p.msg}`);
  }
  return L.join('\n') + '\n';
}

export function relatorioClubes(w: World): string {
  const L: string[] = ['# Mundo fictício — clubes por liga', '', '> **DADOS DE TESTE.** Nomes, cidades, estádios e rivalidades inventados.', ''];
  for (const p of w.pacotes) {
    L.push(`## ${p.manifest.nome}`);
    for (const li of p.ligas) {
      const l = w.ligas[li];
      L.push('', `### ${l.regras.nome} (${l.clubes.length})`, '');
      L.push('| Clube | Sigla | País | Cidade | Rep. | Atq | Def | Estádio | Lotação | Cores | Rivais |');
      L.push('|---|---|---|---|---:|---:|---:|---|---:|---|---|');
      for (const i of [...l.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a])) {
        const c = w.clubes[i];
        const riv = c.rivais.map((r) => w.clubes[w.idx(r)].nome).join('; ');
        L.push(`| ${c.nome} | ${c.nome_curto} | ${c.pais} | ${c.cidade} | ${c.reputacao} | ${w.ataque[i].toFixed(0)} | ${w.defesa[i].toFixed(0)} | ${c.estadio} | ${c.capacidade.toLocaleString('pt-PT')} | ${c.cores.join(' ')} | ${riv} |`);
      }
    }
    L.push('');
  }
  return L.join('\n') + '\n';
}

/** Calendário completo de duas ligas de exemplo, para verificação à mão. */
export function relatorioCalendario(w: World, cal: Map<string, Jogo[]>, ligas = ['por_1', 'eng_2']): string {
  const L: string[] = ['# Calendários de exemplo', '', '> DADOS DE TESTE. Ligas com calendário completo: ' + ligas.join(', ') + '.', ''];
  for (const id of ligas) {
    const l = w.ligaPorId(id);
    const js = cal.get(id)!;
    L.push(`## ${l.regras.nome} (${w.pacotes.find((p) => p.manifest.id === l.pacote)!.manifest.nome})`, '');
    const porRonda = new Map<number, Jogo[]>();
    for (const j of js) porRonda.set(j.ronda, [...(porRonda.get(j.ronda) ?? []), j]);
    for (const [r, rd] of porRonda) {
      L.push(`**Jornada ${r}** — semana ${rd[0].semana} (${rd[0].ranhura === 'fds' ? 'fim-de-semana' : 'meio da semana'})`, '');
      for (const j of rd) L.push(`- ${isoData(w.epoca, j.semana, j.dia)} (${DIAS[j.dia]}): ${w.clubes[j.casa].nome} – ${w.clubes[j.fora].nome}`);
      L.push('');
    }
  }
  return L.join('\n') + '\n';
}
