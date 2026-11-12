// Uma época do mundo inteiro, semana a semana. Todas as ligas usam o mesmo
// modo de simulação; os jogos são independentes da ordem (RNG por jogo).
import { Rng } from '../../core/rng.ts';
import { CALENDARIO } from '../../config/calendario.ts';
import type { World, Qualificado } from '../world.ts';
import { planearTacas } from './tacas.ts';
import type { Competicao, JogoR } from '../competitions/base.ts';
import { CompLiga } from '../competitions/liga.ts';
import { MataMata, type RondaCfg } from '../competitions/matamata.ts';
import { Taca } from '../competitions/taca.ts';
import { FaseLigaUEFA, type Equipa } from '../competitions/leaguePhase.ts';
import { GruposEliminatorias } from '../competitions/groups.ts';
import { modelo } from '../calendar/scheduler.ts';
import { jogoRapido, prolongamento, penaltis } from '../match/quickSim.ts';

export interface Estatisticas {
  jogos: number;
  golos: number;
  casa: number;
  empates: number;
  fora: number;
  zero: number;
  cincoMais: number;
  seteMais: number;
}

export function novasEstatisticas(): Estatisticas {
  return { jogos: 0, golos: 0, casa: 0, empates: 0, fora: 0, zero: 0, cincoMais: 0, seteMais: 0 };
}

export class Temporada {
  ligas = new Map<string, CompLiga>();
  playoffsSubida = new Map<string, MataMata>();
  playoffsCampeao = new Map<string, MataMata>();
  /** Barragem indexada pela liga de cima. */
  barragens = new Map<string, MataMata>();
  tacas = new Map<string, Taca>();
  continentais = new Map<string, FaseLigaUEFA | GruposEliminatorias>();
  /** Play-offs de acesso UEFA (UCL_PO, UEL_PO). */
  acesso = new Map<string, MataMata>();
  /** Participantes finais de cada competição continental (depois dos play-offs de acesso). */
  participantes = new Map<string, Qualificado[]>();
  private fasesUEFACriadas = false;
  comps: Competicao[] = [];
  jogos: JogoR[] = [];
  /** Estatísticas dos jogos de liga (90 minutos), para a calibração. */
  estatLiga = novasEstatisticas();
  semana = 0;

  constructor(public w: World) {
    const ep = w.epoca;
    const m = modelo('ago_mai');
    const fds = (s: number) => ({ semana: s, ranhura: 'fds' as const, dias: CALENDARIO.dias.fds });
    for (const p of w.pacotes) {
      const ligas = p.ligas.map((li) => {
        const l = w.ligas[li];
        const c = new CompLiga(l.regras, [...l.clubes], Rng.de(w.semente, 'calendario', l.regras.id, ep), `${w.semente}|${ep}|${l.regras.id}`);
        this.ligas.set(l.regras.id, c);
        return c;
      });
      ligas.forEach((c, i) => {
        const r = c.regras;
        const rng = Rng.de(w.semente, 'playoffs', r.id, ep);
        const rondasPO = (n: number): RondaCfg[] => {
          if (n > m.playoffs.length) throw new Error(`${r.id}: play-off com ${n} rondas não cabe no calendário`);
          return Array.from({ length: n }, (_, k) => ({ maos: 1, slots: [fds(m.playoffs[k])], neutra: k === n - 1 }));
        };
        const pc = r.formato.playoff_campeao;
        if (pc) {
          this.playoffsCampeao.set(r.id, new MataMata(`${r.id}_poc`, `${r.nome} (play-off de campeão)`, 'playoff',
            () => (c.terminada() ? c.classificacao().slice(0, pc.equipas).map((x) => x.clube) : null), rondasPO, rng));
        }
        const po = r.subidas.playoff;
        if (po) {
          this.playoffsSubida.set(r.id, new MataMata(`${r.id}_pos`, `${r.nome} (play-off de subida)`, 'playoff',
            () => (c.terminada() ? c.classificacao().slice(po.de - 1, po.ate).map((x) => x.clube) : null), rondasPO, rng));
        }
        const b = r.descidas.barragem;
        const baixo = ligas[i + 1];
        if (b && baixo) {
          const ultima = m.playoffs[m.playoffs.length - 1];
          this.barragens.set(r.id, new MataMata(`${r.id}_bar`, `Barragem ${r.nome} / ${baixo.regras.nome}`, 'barragem',
            () => {
              if (!c.terminada() || !baixo.terminada()) return null;
              let rival: number;
              if (b.adversario === 'playoff') {
                const p = this.playoffsSubida.get(baixo.regras.id)!;
                if (!p.terminada()) return null;
                rival = p.vencedorFinal!;
              } else rival = baixo.posicao(b.adversario);
              return [c.posicao(b.posicao), rival];
            },
            () => [{ maos: b.maos, slots: b.maos === 2 ? [{ semana: ultima, ranhura: 'meio', dias: [2] }, { semana: ultima, ranhura: 'fds', dias: [6] }] : [{ semana: ultima, ranhura: 'fds', dias: [6] }] }],
            rng));
        }
      });
      if (p.tacas.length) {
        const porLiga = new Map(ligas.map((c) => [c.regras.id, c.clubes]));
        const nivel = new Map<number, number>();
        ligas.forEach((c) => c.clubes.forEach((x) => nivel.set(x, c.regras.nivel)));
        const meioLiga = new Set(ligas.flatMap((c) => c.jogos.filter((j) => j.ranhura === 'meio').map((j) => j.semana)));
        const slots = planearTacas(p.tacas, porLiga, meioLiga, m);
        for (const t of p.tacas) {
          this.tacas.set(t.id, new Taca(t, porLiga, (x) => nivel.get(x)! * 1000 - w.reputacao[x], slots.get(t.id)!, Rng.de(w.semente, 'taca', t.id, ep)));
        }
      }
    }
    // Continentais com grupos (fora da UEFA): criadas já.
    for (const cfg of w.continental?.competicoes ?? []) {
      if (cfg.tipo !== 'grupos') continue;
      const q = w.qualificados.get(cfg.id) ?? [];
      if (q.length !== cfg.equipas) continue;
      this.participantes.set(cfg.id, q);
      const eq: Equipa[] = q.map((x) => ({ clube: x.clube, pais: x.pais, forca: w.reputacao[x.clube] }));
      this.continentais.set(cfg.id, new GruposEliminatorias(cfg, eq, m, Rng.de(w.semente, 'continental', cfg.id, ep)));
    }
    // Play-offs de acesso UEFA (Agosto, ida e volta); as fases de liga são sorteadas depois.
    for (const cfg of w.continental?.competicoes ?? []) {
      if (cfg.tipo !== 'fase_liga') continue;
      const q = w.qualificados.get(`${cfg.id}_PO`) ?? [];
      if (!q.length) continue;
      const ordem = q.map((x) => x.clube).sort((a, b) => this.forcaContinental(b) - this.forcaContinental(a));
      const dias = CALENDARIO.dias.continental[`${cfg.id}_PO`] ?? [2];
      const [s1, s2] = m.continentais.acesso;
      this.acesso.set(`${cfg.id}_PO`, new MataMata(`${cfg.id}_PO`, `${cfg.nome} (play-off de acesso)`, 'continental', () => ordem,
        () => [{ maos: 2, slots: [{ semana: s1, ranhura: 'meio', dias }, { semana: s2, ranhura: 'meio', dias }] }], Rng.de(w.semente, 'acesso', cfg.id, ep)));
    }
    this.comps = [...this.ligas.values(), ...this.playoffsCampeao.values(), ...this.playoffsSubida.values(), ...this.barragens.values(), ...this.tacas.values(), ...this.acesso.values(), ...this.continentais.values()];
  }

  /** Força usada nos potes e cabeças-de-série continentais. */
  private forcaContinental(x: number): number {
    return (this.w.ataque[x] + this.w.defesa[x]) / 2;
  }

  /** Depois dos play-offs de acesso: sorteia as fases de liga da UEFA. */
  private criarFasesUEFA() {
    const w = this.w;
    const m = modelo('ago_mai');
    const esp = w.continental?.vagas.especiais;
    const marcar = (q: Qualificado[], ids: number[], via: string) => q.filter((x) => ids.includes(x.clube)).map((x) => ({ ...x, via: `${x.via}; ${via}` }));
    for (const cfg of w.continental?.competicoes ?? []) {
      if (cfg.tipo !== 'fase_liga') continue;
      let lista = [...(w.qualificados.get(cfg.id) ?? [])];
      const po = this.acesso.get(`${cfg.id}_PO`);
      if (po) lista.push(...marcar(w.qualificados.get(`${cfg.id}_PO`) ?? [], po.sobreviventes(), 'venceu o play-off de acesso'));
      for (const pp of esp?.perdedores_po ?? []) {
        if (pp.para !== cfg.id) continue;
        const outro = this.acesso.get(pp.de);
        if (!outro) continue;
        const venc = new Set(outro.sobreviventes());
        lista.push(...marcar(w.qualificados.get(pp.de) ?? [], (outro.participantes ?? []).filter((x) => !venc.has(x)), `perdeu o play-off de acesso à ${pp.de.replace('_PO', '')}`));
      }
      if (lista.length !== cfg.equipas) throw new Error(`${cfg.id}: ${lista.length} participantes para ${cfg.equipas} vagas`);
      this.participantes.set(cfg.id, lista);
      const eq: Equipa[] = lista.map((x) => ({ clube: x.clube, pais: x.pais, forca: this.forcaContinental(x.clube) }));
      const c = new FaseLigaUEFA(cfg, eq, m, Rng.de(w.semente, 'continental', cfg.id, w.epoca));
      this.continentais.set(cfg.id, c);
      this.comps.push(c);
    }
    this.fasesUEFACriadas = true;
  }

  private simular(j: JogoR) {
    const w = this.w;
    const rng = Rng.de(w.semente, 'jogo', w.epoca, j.comp, j.ronda, j.casa, j.fora, j.ida ? 2 : 1);
    const [gc, gf] = jogoRapido(w.ataque[j.casa], w.defesa[j.casa], w.ataque[j.fora], w.defesa[j.fora], !!j.neutro, rng);
    j.r = { gc, gf };
    if (j.decisivo) {
      let c = gc, f = gf;
      if (j.ida) { c += j.ida.r!.gf; f += j.ida.r!.gc; }
      if (c === f) {
        const [a, b] = prolongamento(w.ataque[j.casa], w.defesa[j.casa], w.ataque[j.fora], w.defesa[j.fora], !!j.neutro, rng);
        j.r.gc += a; j.r.gf += b; j.r.prol = true;
        if (a === b) j.r.pen = penaltis(w.reputacao[j.casa], w.reputacao[j.fora], rng);
      }
    }
  }

  /** Simula a semana actual de todas as competições. Devolve os jogos jogados. */
  simularSemana(): JogoR[] {
    const s = this.semana;
    if (!this.fasesUEFACriadas && s > Math.max(...modelo('ago_mai').continentais.acesso)) this.criarFasesUEFA();
    const jogados: JogoR[] = [];
    // Uma competição pode abrir a ronda seguinte quando a anterior termina na mesma semana
    // (ex.: ida e volta da barragem); repete até não haver jogos novos.
    for (;;) {
      const lote: { c: Competicao; j: JogoR }[] = [];
      for (const c of this.comps) for (const j of c.jogosDaSemana(s)) if (!j.r && (!j.ida || j.ida.r)) lote.push({ c, j });
      if (!lote.length) break;
      lote.sort((a, b) => a.j.dia - b.j.dia);
      for (const { c, j } of lote) {
        this.simular(j);
        c.registar(j);
        jogados.push(j);
        this.jogos.push(j);
        if (c instanceof CompLiga) this.contar(j);
      }
    }
    this.semana++;
    return jogados;
  }

  private contar(j: JogoR) {
    const e = this.estatLiga;
    const { gc, gf } = j.r!;
    e.jogos++;
    e.golos += gc + gf;
    if (gc > gf) e.casa++; else if (gc === gf) e.empates++; else e.fora++;
    if (gc + gf === 0) e.zero++;
    if (gc + gf >= 5) e.cincoMais++;
    if (gc + gf >= 7) e.seteMais++;
  }

  simularTudo() {
    while (this.semana < CALENDARIO.semanas_por_epoca) this.simularSemana();
    const abertas = this.comps.filter((c) => !c.terminada());
    if (abertas.length) throw new Error(`competições por terminar: ${abertas.map((c) => c.id).join(', ')}`);
  }
}
