// Histórico de cada competição e dos prémios, consultável a qualquer momento: as épocas reais (até 2025–26, dos PDFs do
// utilizador, em packs/*/historico/) seguidas das épocas que o jogo vai simulando (RegistoEpoca do simulador e prémios
// atribuídos no fim de cada época). Também dá contagens de títulos e "factos" para as notícias (primeiro título,
// fim de jejum, recordes).
import type { World } from '../engine/world.ts';
import type { RegistoEpoca } from '../engine/history.ts';
import { NOMES_EQUIVALENTES, PREMIOS_HISTORICO, FACTOS_HISTORICO as FH, INICIO_HISTORICO } from '../config/historico.ts';

export interface LinhaHistorico {
  /** "2025–26" (ou "1929" nas épocas de ano civil). */
  epoca: string;
  /** Ano de início (para ordenar). */
  ano: number;
  campeao: string;
  vice: string;
  terceiro: string;
  quarto: string;
  melhorMarcador: string;
  clubeMarcador: string;
  golos: number | null;
  treinador: string;
  /** Resultado da final (taças e competições europeias). */
  final: string;
  nota: string;
  fonte: 'real' | 'jogo';
  /** Índice do clube campeão no mundo do jogo (épocas do jogo, ou nome real que existe no mundo). */
  clube: number | null;
}

export interface LinhaPremio {
  ano: number;
  premio: keyof typeof PREMIOS_HISTORICO;
  jogador: string;
  clube: string;
  nota: string;
  fonte: 'real' | 'jogo';
  /** Índice do jogador no PlayerStore (só prémios do jogo). */
  idx: number | null;
  /** Classificação completa da votação (só prémios do jogo): finalistas por ordem. */
  finalistas?: { jogador: string; clube: string; pontos: number; idx: number; comp?: { desempenho: number; colectivo: number; classe: number; fama: number; aura: number; total: number }; primeiros?: number }[];
  /** Votação do júri (Prompt 8, Bloco B): boletins, unanimidade, margem e os pontos do vencedor por país dos jurados. */
  votacao?: { boletins: number; unanime: boolean; margem: number; porPais: Record<string, number> };
}

const semAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const CANONICO = new Map<string, string>();
for (const [c, as] of Object.entries(NOMES_EQUIVALENTES)) { CANONICO.set(semAcentos(c), c); for (const a of as) CANONICO.set(semAcentos(a), c); }
/** Nome canónico de um clube (para juntar "Madrid" e "Real Madrid", "Hamburgo" e "Hamburger SV", ...). */
export const nomeCanonico = (nome: string) => CANONICO.get(semAcentos(nome)) ?? nome;

/** Rótulo da época de um registo do jogo. */
export const rotuloEpoca = (r: Pick<RegistoEpoca, 'grupo' | 'epoca'>) => (r.grupo === 'ano_civil' ? String(r.epoca) : `${r.epoca}–${String((r.epoca + 1) % 100).padStart(2, '0')}`);

export class HistoricoMundo {
  /** Linhas reais por competição (ENG1, UCL, ...). */
  real = new Map<string, LinhaHistorico[]>();
  /** Prémios: reais + atribuídos pelo jogo. */
  premiosReais: LinhaPremio[] = [];
  premiosJogo: LinhaPremio[] = [];
  /** Clube do mundo por nome canónico (para ligar o histórico real ao jogo quando os nomes coincidem). */
  private porNome = new Map<string, number>();

  constructor(public w: World, ficheiros: Record<string, Record<string, string>[]>) {
    for (let c = 0; c < w.clubes.length; c++) {
      for (const n of [w.clubes[c].nome, w.clubes[c].nome_curto]) if (n) this.porNome.set(semAcentos(nomeCanonico(n)), c);
    }
    for (const [id, linhas] of Object.entries(ficheiros)) {
      if (id.startsWith('premio_')) {
        const premio = (Object.keys(PREMIOS_HISTORICO) as (keyof typeof PREMIOS_HISTORICO)[]).find((k) => PREMIOS_HISTORICO[k].ficheiro === id);
        if (!premio) continue;
        for (const l of linhas) this.premiosReais.push({ ano: Number(l.ano), premio, jogador: l.jogador ?? '', clube: l.clube ?? '', nota: [l.nota, l.vencedor_honorario ? `vencedor honorário: ${l.vencedor_honorario} (${l.clube_honorario})` : ''].filter(Boolean).join('; '), fonte: 'real', idx: null });
        continue;
      }
      this.real.set(id, linhas.map((l) => ({
        epoca: l.epoca, ano: parseInt(l.epoca, 10), campeao: l.campeao ?? '', vice: l.vice ?? '', terceiro: l.terceiro ?? '', quarto: l.quarto ?? '',
        melhorMarcador: l.melhor_marcador ?? '', clubeMarcador: l.clube_marcador ?? '', golos: l.golos ? Number(l.golos) : null,
        treinador: l.treinador_campeao ?? '', final: l.final ?? '', nota: [l.era, l.nota].filter(Boolean).join(' — '), fonte: 'real' as const,
        clube: l.campeao ? this.clubeDoNome(l.campeao) : null,
      })).sort((a, b) => a.ano - b.ano));
    }
  }

  /** Clube do mundo com este nome (real), ou null. */
  clubeDoNome(nome: string): number | null { return this.porNome.get(semAcentos(nomeCanonico(nome))) ?? null; }

  /** Nomes do histórico real sem clube correspondente no mundo do jogo (relatório para quem importar dados reais). */
  semCorrespondencia(): string[] {
    const s = new Set<string>();
    for (const L of this.real.values()) for (const l of L) if (l.campeao && l.clube === null) s.add(nomeCanonico(l.campeao));
    return [...s].sort();
  }

  /** Competições com histórico (reais ou do jogo). */
  competicoes(registos: RegistoEpoca[]): string[] {
    const s = new Set(this.real.keys());
    for (const r of registos) { for (const k of Object.keys(r.campeoes)) s.add(k); for (const k of Object.keys(r.tacas)) s.add(k); for (const k of Object.keys(r.continentais)) s.add(k); }
    return [...s].sort();
  }

  /** Linhas do jogo de uma competição (liga, taça ou continental). */
  private doJogo(id: string, registos: RegistoEpoca[]): LinhaHistorico[] {
    const w = this.w, nome = (c: number | undefined) => (c === undefined || c < 0 ? '' : w.clubes[c]?.nome ?? '');
    const out: LinhaHistorico[] = [];
    for (const r of registos) {
      const base = { epoca: rotuloEpoca(r), ano: r.epoca, melhorMarcador: '', clubeMarcador: '', golos: null as number | null, treinador: '', final: '', nota: '', fonte: 'jogo' as const, terceiro: '', quarto: '' };
      if (r.campeoes[id] !== undefined) {
        const t = r.tabelas[id] ?? [];
        const campeao = r.campeoes[id];
        const outros = t.map((x) => x.clube).filter((c) => c !== campeao);
        const m = r.jogadores[id]?.[0];
        const po = r.playoffsCampeao[id];
        out.push({ ...base, campeao: nome(campeao), vice: po ? nome(po.finalista) : nome(outros[0]), terceiro: nome(outros[po ? 0 : 1]), quarto: nome(outros[po ? 1 : 2]),
          melhorMarcador: m?.nome ?? '', clubeMarcador: m ? nome(m.clube) : '', golos: m?.golos ?? null, final: po?.final ?? '', clube: campeao });
      } else if (r.tacas[id]) {
        const x = r.tacas[id];
        out.push({ ...base, campeao: nome(x.vencedor), vice: nome(x.finalista), final: x.final, clube: x.vencedor });
      } else if (r.continentais[id]) {
        const x = r.continentais[id];
        out.push({ ...base, campeao: nome(x.vencedor), vice: nome(x.finalista), final: x.final, clube: x.vencedor });
      }
    }
    return out;
  }

  /** Todas as épocas (incluindo as anteriores ao início oficial da competição): para contar títulos e escrever factos. */
  private completo(id: string, registos: RegistoEpoca[]): LinhaHistorico[] {
    const jogo = this.doJogo(id, registos);
    const epJogo = new Set(jogo.map((l) => l.epoca));
    return [...(this.real.get(id) ?? []).filter((l) => !epJogo.has(l.epoca)), ...jogo].sort((a, b) => a.ano - b.ano || (a.fonte === 'real' ? -1 : 1));
  }

  /** Ano a partir do qual a competição conta (ex.: Bundesliga 1963). */
  inicio(id: string): number { return INICIO_HISTORICO[id] ?? 0; }

  /** Histórico de uma competição: épocas reais desde o início oficial e depois as do jogo. */
  competicao(id: string, registos: RegistoEpoca[]): LinhaHistorico[] {
    const ini = this.inicio(id);
    return this.completo(id, registos).filter((l) => l.ano >= ini);
  }

  /** Títulos por clube (nome canónico), do mais titulado para o menos; com os anos. */
  /** `titulos` inclui os títulos anteriores ao início oficial da competição (não se apagam); `anteriores` diz quantos são. */
  titulos(id: string, registos: RegistoEpoca[]): { clube: string; titulos: number; anteriores: number; vices: number; epocas: string[] }[] {
    const m = new Map<string, { clube: string; titulos: number; anteriores: number; vices: number; epocas: string[] }>();
    const get = (n: string) => { const c = nomeCanonico(n); let x = m.get(c); if (!x) { x = { clube: c, titulos: 0, anteriores: 0, vices: 0, epocas: [] }; m.set(c, x); } return x; };
    const ini = this.inicio(id);
    for (const l of this.completo(id, registos)) {
      if (l.campeao) { const x = get(l.campeao); x.titulos++; if (l.ano < ini) x.anteriores++; x.epocas.push(l.epoca); }
      if (l.vice) get(l.vice).vices++;
    }
    return [...m.values()].sort((a, b) => b.titulos - a.titulos || b.vices - a.vices || a.clube.localeCompare(b.clube));
  }

  /** Factos para as notícias sobre o campeão de uma época (já registada no histórico). */
  factosTitulo(id: string, epoca: string, registos: RegistoEpoca[]): string[] {
    const L = this.completo(id, registos);
    const i = L.findIndex((l) => l.epoca === epoca);
    if (i < 0 || !L[i].campeao) return [];
    const nome = nomeCanonico(L[i].campeao);
    const antes = L.slice(0, i).filter((l) => l.campeao && nomeCanonico(l.campeao) === nome);
    const n = antes.length + 1;
    const out: string[] = [];
    if (n === 1) out.push(`${L[i].campeao} conquista o primeiro título da sua história.`);
    else {
      const ultimo = antes[antes.length - 1];
      const anos = L[i].ano - ultimo.ano;
      if (anos >= FH.jejum_minimo) out.push(`${L[i].campeao} volta a ser campeão ${anos} anos depois (último título em ${ultimo.epoca}).`);
      if (anos === 1) {
        let seguidos = 1;
        for (let k = i - 1; k >= 0 && L[k].campeao && nomeCanonico(L[k].campeao) === nome; k--) seguidos++;
        if (seguidos >= 2) out.push(`${L[i].campeao} soma ${seguidos} títulos seguidos.`);
      }
      if (FH.marcos.includes(n)) out.push(`É o ${n}.º título de ${L[i].campeao}.`);
    }
    // Recorde: passa a ser (ou iguala) o clube com mais títulos.
    const cont = new Map<string, number>();
    for (const l of L.slice(0, i + 1)) if (l.campeao) cont.set(nomeCanonico(l.campeao), (cont.get(nomeCanonico(l.campeao)) ?? 0) + 1);
    const max = Math.max(...cont.values());
    const lideres = [...cont].filter(([, v]) => v === max).map(([k]) => k);
    if (n === max && n > 1) {
      if (lideres.length === 1) {
        const antesMax = Math.max(0, ...[...cont].filter(([k]) => k !== nome).map(([, v]) => v));
        if (n === antesMax + 1 && antes.length === antesMax) out.push(`${L[i].campeao} passa a ser o clube com mais títulos (${n}).`);
      } else out.push(`${L[i].campeao} iguala ${lideres.filter((x) => x !== nome).join(' e ')} como o clube com mais títulos (${n}).`);
    }
    return out;
  }

  /** Regista os prémios atribuídos pelo jogo numa época. */
  registarPremio(p: LinhaPremio) { this.premiosJogo.push(p); }

  /** Histórico de um prémio (reais + jogo), por ano. */
  premios(premio: keyof typeof PREMIOS_HISTORICO): LinhaPremio[] {
    const jogo = this.premiosJogo.filter((p) => p.premio === premio);
    const anos = new Set(jogo.map((p) => p.ano));
    return [...this.premiosReais.filter((p) => p.premio === premio && !anos.has(p.ano)), ...jogo].sort((a, b) => a.ano - b.ano);
  }

  /** Vencedores com mais prémios (nome do jogador). */
  maisPremiados(premio: keyof typeof PREMIOS_HISTORICO): { jogador: string; vezes: number; anos: number[] }[] {
    const m = new Map<string, { jogador: string; vezes: number; anos: number[] }>();
    for (const p of this.premios(premio)) { if (!p.jogador) continue; const x = m.get(p.jogador) ?? { jogador: p.jogador, vezes: 0, anos: [] }; x.vezes++; x.anos.push(p.ano); m.set(p.jogador, x); }
    return [...m.values()].sort((a, b) => b.vezes - a.vezes || a.anos[0] - b.anos[0]);
  }

  bytes(): number {
    let n = 0;
    for (const L of this.real.values()) n += L.length * 160;
    return n + (this.premiosReais.length + this.premiosJogo.length) * 120 + this.premiosJogo.reduce((a, p) => a + (p.finalistas?.length ?? 0) * 48, 0);
  }
}
