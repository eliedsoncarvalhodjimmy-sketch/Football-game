// Prompt 8, Bloco C: o selo dos prémios na carreira. Módulo único, chamado pelo preço pedido, pelo salário, pela decisão do
// jogador, pelo scouting e pelas receitas comerciais. Um prémio muda a economia e a imagem do jogador, NUNCA os atributos,
// a moral ou o rendimento. Os selos vêm do histórico do jogo (e dos prémios reais recentes, se o vencedor existir no mundo
// com um nome único); a gravação é a repetição dos comandos, por isso nada disto cresce no save.
import { PRESTIGIO as PR, CALENDARIO_PREMIOS as CAL } from '../config/premios.ts';
import type { World } from '../engine/world.ts';
import type { LinhaPremio } from '../historico/historico.ts';

export type Lugar = 'vencedor' | 'top3' | 'finalista';
export interface Selo { premio: string; ano: number; lugar: Lugar; dia: number }

const LUGARES: Lugar[] = ['vencedor', 'top3', 'finalista'];

export class Prestigio {
  /** Selos por jogador (só os que têm algum). */
  selos = new Map<number, Selo[]>();

  constructor(public w: World) {}

  /** Dia da cerimónia de um ano. */
  static dia(ano: number) { return Math.floor(Date.UTC(ano, CAL.cerimonia.mes - 1, CAL.cerimonia.dia) / 864e5); }

  /** Regista os selos de um prémio do jogo (vencedor, top 3, restantes finalistas). */
  registar(p: LinhaPremio) {
    const dia = Prestigio.dia(p.ano);
    const fin = p.finalistas ?? (p.idx !== null ? [{ idx: p.idx }] : []);
    fin.forEach((f, i) => { if (f.idx >= 0) this.juntar(f.idx, { premio: p.premio, ano: p.ano, lugar: i === 0 ? 'vencedor' : i < 3 ? 'top3' : 'finalista', dia }); });
  }

  /** Prémios reais recentes: o vencedor recebe o selo se existir no mundo um só jogador com esse nome. */
  registarReais(linhas: LinhaPremio[], anoMundo: number) {
    const st = this.w.jogadores;
    if (!st) return;
    const recentes = linhas.filter((l) => l.jogador && l.ano >= anoMundo - PR.duracao_anos && l.ano <= anoMundo);
    if (!recentes.length) return;
    const porNome = new Map<string, number>();
    for (let j = 0; j < st.n; j++) { const n = st.nomes[j]; porNome.set(n, porNome.has(n) ? -1 : j); }
    for (const l of recentes) { const j = porNome.get(l.jogador); if (j !== undefined && j >= 0) this.juntar(j, { premio: l.premio, ano: l.ano, lugar: 'vencedor', dia: Prestigio.dia(l.ano) }); }
  }

  private juntar(j: number, s: Selo) {
    const xs = this.selos.get(j) ?? [];
    if (!xs.some((x) => x.premio === s.premio && x.ano === s.ano)) xs.push(s);
    this.selos.set(j, xs);
  }

  /** Decaimento de um selo no dia `dia` (1 na cerimónia; 0 antes dela ou depois da duração). */
  private decai(s: Selo, dia: number) {
    const t = (dia - s.dia) / 365;
    return t < 0 || t > PR.duracao_anos ? 0 : Math.pow(0.5, t / PR.meia_vida_anos);
  }

  /** Prestígio 0–100 do jogador. */
  valor(j: number, dia: number): number {
    const xs = this.selos.get(j);
    if (!xs) return 0;
    let s = 0;
    for (const x of xs) s += (PR.pontos[x.premio]?.[x.lugar] ?? 0) * this.decai(x, dia);
    return Math.min(100, s);
  }

  /** Factor de marca no preço pedido (≥ 1, até 1 + tecto). */
  marca(j: number, dia: number): number {
    const xs = this.selos.get(j);
    if (!xs) return 1;
    let s = 0;
    for (const x of xs) s += (PR.preco[x.premio]?.[x.lugar] ?? 0) * this.decai(x, dia);
    return 1 + Math.min(PR.preco_tecto, s);
  }

  /** Factor do pedido salarial. */
  salario(j: number, dia: number) { return 1 + (PR.salario_maximo * this.valor(j, dia)) / 100; }

  /** Factor da exigência de projecto (parcela de prestígio do clube na decisão do jogador). */
  exigencia(j: number, dia: number) { return 1 + (PR.exigencia_projecto * this.valor(j, dia)) / 100; }

  /** Conhecimento mínimo de qualquer clube sobre o jogador (0 se não for vencedor nem top 3 recente). */
  conhecimentoMinimo(j: number, dia: number): number {
    const xs = this.selos.get(j);
    if (!xs) return 0;
    for (const x of xs) if (x.lugar !== 'finalista' && dia >= x.dia && dia - x.dia <= PR.visibilidade_anos * 365) return PR.conhecimento_minimo;
    return 0;
  }

  /** Aumento das receitas comerciais (fracção do patrocínio) por clube, pela soma do prestígio dos seus jogadores. */
  comercial(dia: number): Map<number, number> {
    const st = this.w.jogadores!, soma = new Map<number, number>();
    for (const j of this.selos.keys()) { const c = st.clube[j]; if (c < 0) continue; const v = this.valor(j, dia); if (v > 0) soma.set(c, (soma.get(c) ?? 0) + v); }
    for (const [c, v] of soma) soma.set(c, Math.min(PR.comercial.tecto, PR.comercial.por_ponto * v));
    return soma;
  }

  /** Contagem de prémios do jogador (todos os anos, sem decaimento): Hall of Fame. */
  contagem(j: number): Record<string, Record<Lugar, number>> {
    const out: Record<string, Record<Lugar, number>> = {};
    for (const x of this.selos.get(j) ?? []) { const r = (out[x.premio] ??= { vencedor: 0, top3: 0, finalista: 0 }); r[x.lugar]++; }
    return out;
  }

  /** Reputação de entrada de um ex-craque no funil de treinadores e staff (sem prémios: null). */
  reputacaoLegado(j: number): number | null {
    const c = this.contagem(j), L = PR.legado;
    let r = L.base, algum = false;
    for (const [p, x] of Object.entries(c)) {
      if (x.vencedor) { r += ((L as unknown as Record<string, number>)[p] ?? 0) * x.vencedor; algum = true; }
      if (x.top3) { r += L.top3 * x.top3; algum = true; }
    }
    return algum ? Math.min(L.tecto, r) : null;
  }

  /** Hall of Fame: jogadores com algum prémio ganho, por número de vitórias (Bola de Ouro primeiro). */
  hallOfFame(): { idx: number; nome: string; contagem: Record<string, Record<Lugar, number>> }[] {
    const st = this.w.jogadores!;
    const out = [...this.selos.keys()].map((j) => ({ idx: j, nome: st.nomes[j], contagem: this.contagem(j) })).filter((x) => Object.values(x.contagem).some((c) => c.vencedor > 0));
    const v = (x: (typeof out)[number], p: string) => x.contagem[p]?.vencedor ?? 0;
    return out.sort((a, b) => v(b, 'melhor_do_mundo') - v(a, 'melhor_do_mundo') || v(b, 'golden_boy') + v(b, 'guarda_redes') - v(a, 'golden_boy') - v(a, 'guarda_redes') || a.idx - b.idx);
  }

  bytes() { let n = 0; for (const xs of this.selos.values()) n += 16 + xs.length * 24; return n; }
}

export { LUGARES };
