// npm run simulate-match -- [--casa ID --fora ID | --exemplo equilibrado|desigual] [--detailed] [--seed N] [--neutro] [--out ficheiro.md]
// Simula um jogo entre dois clubes do mundo. Com --detailed corre o modo detalhado (posses e duelos)
// e escreve o relato em texto e as estatísticas finais; sem ele, o modo rápido (resultado e notas).
import { writeFileSync } from 'node:fs';
import { LocalFileSource } from '../data/LocalFileSource.ts';
import { carregarDados } from '../data/load.ts';
import { construirMundo, diaInicioMundo, type World } from '../engine/world.ts';
import { prepararLado, golosRapido, type Lado } from '../match/rapido.ts';
import { jogoDetalhado, type Evento, type ResultadoDetalhado } from '../match/detalhado.ts';
import { PAPEIS } from '../config/papeis.ts';
import { NOME_RATING, RATINGS } from '../config/ratings.ts';
import { Rng } from '../core/rng.ts';
import { MUNDO } from '../config/mundo.ts';
import { args, RAIZ_PACKS } from './args.ts';

export function escolherExemplo(w: World, tipo: string): [number, number] {
  const l = w.ligaPorId('ENG1');
  const ord = [...l.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]);
  return tipo === 'desigual' ? [ord[0], ord[ord.length - 1]] : [ord[3], ord[4]];
}

function nomeJ(w: World, j?: number): string {
  return j === undefined ? '?' : w.jogadores!.nomes[j];
}

function linhaEvento(w: World, e: Evento, nomes: [string, string], placar: [number, number]): string | null {
  const eq = nomes[e.equipa];
  const j = nomeJ(w, e.jogador);
  switch (e.tipo) {
    case 'golo': {
      placar[e.equipa]++;
      const como = e.info === 'penalti' ? ' de penálti' : e.info === 'canto' ? ' de cabeça, na sequência de um canto' : e.info === 'livre' ? ' de livre directo' : e.info === 'longe' ? ' num remate de fora da área' : '';
      const ass = e.outro !== undefined && e.info !== 'penalti' ? ` Assistência de ${nomeJ(w, e.outro)}.` : '';
      return `**${e.min}' GOLO do ${eq}!** ${j} marca${como}. ${nomes[0]} ${placar[0]}–${placar[1]} ${nomes[1]}.${ass}`;
    }
    case 'remate':
      if ((e.xg ?? 0) < 0.07 && e.info !== 'penalti') return null;
      const tipo = e.info === 'grande' ? 'Grande ocasião' : e.info === 'longe' ? 'Remate de longe' : e.info === 'canto' ? 'Cabeceamento após canto' : e.info === 'livre' ? 'Livre directo' : e.info === 'penalti' ? 'Penálti batido' : 'Ocasião';
      return `${e.min}' ${tipo} do ${eq}: ${j}${e.outro !== undefined ? ` (servido por ${nomeJ(w, e.outro)})` : ''}, xG ${e.xg?.toFixed(2)}.`;
    case 'cartao':
      return `${e.min}' Cartão ${e.info} para ${j} (${eq}).`;
    case 'penalti':
      return `${e.min}' Penálti para o ${eq}! Falta de ${nomeJ(w, e.outro)} sobre ${j}.`;
    case 'substituicao':
      return `${e.min}' Substituição no ${eq}: entra ${j}, sai ${nomeJ(w, e.outro)}.`;
    case 'passe':
      return e.info === 'tabelinha com o falso 9' ? `${e.min}' Tabelinha de ${j} com ${nomeJ(w, e.outro)}, o falso 9 do ${eq}.` : null;
    case 'intervalo':
      return `— Intervalo: ${nomes[0]} ${placar[0]}–${placar[1]} ${nomes[1]} —`;
    case 'fim':
      return `— Fim do jogo: ${nomes[0]} ${placar[0]}–${placar[1]} ${nomes[1]} —`;
    default:
      return null;
  }
}

export function relatoDetalhado(w: World, casa: Lado, fora: Lado, r: ResultadoDetalhado): string[] {
  const nomes: [string, string] = [w.clubes[casa.clube].nome, w.clubes[fora.clube].nome];
  const L: string[] = [];
  L.push(`### ${nomes[0]} ${r.golos[0]}–${r.golos[1]} ${nomes[1]}`, '');
  for (const [k, lado] of [casa, fora].entries()) {
    const e = lado.escolha;
    const onze = e.onze.jogadores.map((j, s) => `${nomeJ(w, j)} (${PAPEIS[e.onze.papeis[s]].nome})`).join(', ');
    L.push(`**${nomes[k]}** — ${e.plano.formacao.id}${e.mudou ? ' (o treinador mudou de plano)' : ''}; força ataque ${lado.forcaAtaque.toFixed(1)}, defesa ${lado.forcaDefesa.toFixed(1)}; modificador ${(100 * lado.mod).toFixed(1)}%.`, '');
    L.push(`Onze: ${onze}.`, '');
  }
  L.push('| Rating | ' + nomes.join(' | ') + ' |', '|---|---|---|');
  for (const k of RATINGS) L.push(`| ${NOME_RATING[k]} | ${casa.ratings.r[k].toFixed(1)} | ${fora.ratings.r[k].toFixed(1)} |`);
  L.push('', '**Relato**', '');
  const placar: [number, number] = [0, 0];
  for (const e of r.eventos) {
    const t = linhaEvento(w, e, nomes, placar);
    if (t) L.push(`- ${t}`);
  }
  const [a, b] = r.estat;
  L.push('', '**Estatísticas finais**', '', '| | ' + nomes.join(' | ') + ' |', '|---|---|---|');
  const lin = (n: string, x: number | string, y: number | string) => L.push(`| ${n} | ${x} | ${y} |`);
  lin('Golos', r.golos[0], r.golos[1]);
  lin('Posse de bola', `${r.posse[0]}%`, `${r.posse[1]}%`);
  lin('Remates (à baliza)', `${a.remates} (${a.aBaliza})`, `${b.remates} (${b.aBaliza})`);
  lin('xG', a.xg.toFixed(2), b.xg.toFixed(2));
  lin('Grandes ocasiões', a.grandesOcasioes, b.grandesOcasioes);
  lin('Ataques', a.ataques, b.ataques);
  lin('Progressões ganhas / perdidas', `${a.progressoesGanhas} / ${a.progressoesPerdidas}`, `${b.progressoesGanhas} / ${b.progressoesPerdidas}`);
  lin('Cantos', a.cantos, b.cantos);
  lin('Faltas', a.faltas, b.faltas);
  lin('Amarelos / vermelhos', `${a.amarelos} / ${a.vermelhos}`, `${b.amarelos} / ${b.vermelhos}`);
  return L;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = args();
  const semente = Number(a.seed ?? MUNDO.semente_padrao);
  const w = construirMundo(await carregarDados(new LocalFileSource(RAIZ_PACKS)), { semente, modo: 'teste' });
  const dia = diaInicioMundo() + 40;
  let [c, f] = escolherExemplo(w, String(a.exemplo ?? 'equilibrado'));
  if (a.casa) c = w.clubes.findIndex((x) => x.id === a.casa);
  if (a.fora) f = w.clubes.findIndex((x) => x.id === a.fora);
  if (c < 0 || f < 0) throw new Error('Clube não encontrado (use o id do clube).');
  const rng = Rng.de(semente, 'simulate-match', c, f);
  const casa = prepararLado(w, c, dia, rng), fora = prepararLado(w, f, dia, rng);
  const neutro = !!a.neutro;
  let L: string[];
  if (a.detailed) L = relatoDetalhado(w, casa, fora, jogoDetalhado(w, casa, fora, neutro, rng));
  else {
    const o = golosRapido(w, casa, fora, neutro, rng);
    L = [`${w.clubes[c].nome} ${o.gc}–${o.gf} ${w.clubes[f].nome} (modo rápido; golos esperados ${o.xg[0].toFixed(2)}–${o.xg[1].toFixed(2)})`];
  }
  const txt = L.join('\n') + '\n';
  if (a.out) writeFileSync(String(a.out), txt);
  console.log(txt);
}
