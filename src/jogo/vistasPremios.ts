// Prompt 8, Bloco D: dados dos prémios para a interface (a UI vem depois). Finalistas com a decomposição, o júri e os
// votos; a ordem da cerimónia (config CERIMONIA); os selos do jogador para a ficha. O histórico real (premiosReais) e o do
// jogo (premiosJogo) ficam separados: aqui só se lê o do jogo, e cada linha diz a fonte.
import { CERIMONIA, PRESTIGIO } from '../config/premios.ts';
import { POSICOES } from '../config/papeis.ts';
import { PREMIOS_HISTORICO } from '../config/historico.ts';
import { GRUPO } from '../premios/premios.ts';
import type { World } from '../engine/world.ts';

export interface FinalistaVista {
  lugar: number; idx: number; jogador: string; clube: string; pos: string; grupo: string; pais: string;
  pontos: number; primeiros: number;
  comp: { desempenho: number; colectivo: number; classe: number; fama: number; aura: number; total: number; visibilidade?: number } | null;
}
export interface VistaVotacao {
  premio: string; nome: string; ano: number; fonte: 'jogo';
  finalistas: FinalistaVista[];
  votacao: { boletins: number; unanime: boolean; margem: number; porPais: { pais: string; pontos: number }[] } | null;
  /** Ordem da cerimónia: do último ao 4.º com intervalo curto; o top 3 com suspense. */
  cerimonia: { lugar: number; idx: number; espera_ms: number }[];
}

/** A votação de um prémio do jogo num ano (null se esse ano não foi atribuído pelo jogo). */
export function vistaVotacao(w: World, premio: keyof typeof PREMIOS_HISTORICO, ano: number): VistaVotacao | null {
  const p = w.historico?.premiosJogo.find((x) => x.premio === premio && x.ano === ano);
  if (!p) return null;
  const st = w.jogadores!;
  const finalistas = (p.finalistas ?? []).map((f, i) => {
    const pos = POSICOES[st.posNat[f.idx]];
    return { lugar: i + 1, idx: f.idx, jogador: f.jogador, clube: f.clube, pos, grupo: GRUPO[pos], pais: st.paises[st.pais[f.idx]], pontos: f.pontos, primeiros: f.primeiros ?? 0, comp: f.comp ?? null };
  });
  const cerimonia = [...finalistas].reverse().map((f) => ({ lugar: f.lugar, idx: f.idx, espera_ms: f.lugar <= 3 ? CERIMONIA.suspense_ms : CERIMONIA.intervalo_ms }));
  const v = p.votacao;
  return {
    premio, nome: PREMIOS_HISTORICO[premio].nome, ano, fonte: 'jogo', finalistas, cerimonia,
    votacao: v ? { boletins: v.boletins, unanime: v.unanime, margem: v.margem, porPais: Object.entries(v.porPais).map(([pais, pontos]) => ({ pais, pontos })).sort((a, b) => b.pontos - a.pontos) } : null,
  };
}

export interface SelosJogador {
  prestigio: number; marcaPreco: number; salario: number; conhecidoDeTodos: boolean;
  selos: { premio: string; nome: string; ano: number; lugar: 'vencedor' | 'top3' | 'finalista' }[];
  contagem: Record<string, { vencedor: number; top3: number; finalista: number }>;
}

/** Selos do jogador para a ficha (prémios do jogo e reais recentes ligados ao jogador), com o prestígio no dia. */
export function selosJogador(w: World, j: number, dia: number): SelosJogador {
  const p = w.prestigio;
  const xs = p?.selos.get(j) ?? [];
  return {
    prestigio: Math.round(p?.valor(j, dia) ?? 0),
    marcaPreco: Math.round(((p?.marca(j, dia) ?? 1) - 1) * 1000) / 10,
    salario: Math.round(((p?.salario(j, dia) ?? 1) - 1) * 1000) / 10,
    conhecidoDeTodos: (p?.conhecimentoMinimo(j, dia) ?? 0) >= PRESTIGIO.conhecimento_minimo,
    selos: [...xs].sort((a, b) => b.ano - a.ano).map((s) => ({ premio: s.premio, nome: PREMIOS_HISTORICO[s.premio as keyof typeof PREMIOS_HISTORICO]?.nome ?? s.premio, ano: s.ano, lugar: s.lugar })),
    contagem: p?.contagem(j) ?? {},
  };
}
