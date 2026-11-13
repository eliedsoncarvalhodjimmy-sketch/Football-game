// Controlador do clube (Prompt 3): cada clube é controlado pela IA ou pelo utilizador.
// A economia chama o controlador para as decisões; o controlo manual (UI) chega no Prompt 5,
// que só tem de implementar esta interface (ex.: devolvendo as escolhas feitas no ecrã).
import { FINANCAS_INICIAIS as F, CONTRATOS as K } from '../config/economia.ts';
import { INFRA, OBRAS_IA, TIPOS_INFRA, CUSTO_INFRA_RIQUEZA, type TipoInfra } from '../config/infraestruturas.ts';
import { indiceRiqueza } from '../economia/contratos.ts';
import type { World } from '../engine/world.ts';
import type { Economia } from '../economia/motorEconomico.ts';
import { N_INFRA } from './store.ts';

export interface Orcamentos {
  salarios: number;
  transferencias: number;
  infra: number;
  staff: number;
}

export interface PedidoRenovacao {
  jogador: number;
  salario: number;
  /** Ordem do jogador no plantel por OVR (0 = melhor). */
  ordem: number;
  tamanhoPlantel: number;
  idade: number;
}

export interface ClubController {
  readonly tipo: 'ia' | 'utilizador';
  /** Pré-época: orçamentos da época, dada a receita prevista. */
  orcamentos(w: World, e: Economia, c: number, receitaPrevista: number): Orcamentos;
  /** Fim de contrato: renova ao salário de mercado (true) ou deixa sair (false). */
  renovar(w: World, e: Economia, c: number, p: PedidoRenovacao, folhaActual: number): boolean;
  /** Mensal: obra a lançar (tipo) ou null. */
  obra(w: World, e: Economia, c: number, dia: number): TipoInfra | null;
}

/** Custo e prazo da obra de um tipo a partir do nível actual. */
export function custoObra(tipo: TipoInfra, nivel: number, indice = 100): { custo: number; semanas: number } {
  const t = INFRA[tipo];
  return { custo: factorCustoInfra(indice) * t.base * Math.pow(t.crescimento, nivel), semanas: t.prazo_base + t.prazo_por_nivel * nivel };
}

export function factorCustoInfra(indice: number): number {
  return Math.max(CUSTO_INFRA_RIQUEZA.minimo, Math.pow(indice / 100, CUSTO_INFRA_RIQUEZA.expoente));
}

export class ControladorIA implements ClubController {
  readonly tipo = 'ia' as const;

  orcamentos(w: World, e: Economia, c: number, receita: number): Orcamentos {
    const s = e.clubes;
    const limite = e.limiteFairPlay(c);
    const reserva = (F.reserva_meses / 12) * receita;
    return {
      salarios: Math.min(limite, F.massa_salarial_alvo) * receita,
      transferencias: Math.max(0, (s.caixa[c] - reserva) * F.transferencias_fraccao_caixa),
      infra: F.orcamento_infra * receita,
      staff: e.custoStaffPrevisto(c, receita),
    };
  }

  renovar(w: World, e: Economia, c: number, p: PedidoRenovacao, folha: number): boolean {
    if (p.idade > K.idade_maxima_renovacao) return false;
    if (p.ordem < K.renovar_sempre_melhores || p.tamanhoPlantel <= K.plantel_minimo) return true;
    return folha + p.salario <= e.clubes.orcSalarios[c];
  }

  obra(w: World, e: Economia, c: number, dia: number): TipoInfra | null {
    const s = e.clubes;
    let emCurso = 0;
    for (let k = 0; k < N_INFRA; k++) if (s.obraFim[c * N_INFRA + k] > dia) emCurso++;
    if (emCurso >= OBRAS_IA.simultaneas) return null;
    const receita = Math.max(1, s.receitaPrevista[c]);
    const reserva = (F.reserva_meses / 12) * receita;
    const tecto = Math.min(10, Math.floor(OBRAS_IA.folga_reputacao + (9 * w.reputacao[c]) / 100));
    let melhor: TipoInfra | null = null, mv = 0;
    TIPOS_INFRA.forEach((tipo, k) => {
      const nivel = s.infra[c * N_INFRA + k];
      if (nivel >= tecto || s.obraFim[c * N_INFRA + k] > dia) return;
      const { custo } = custoObra(tipo, nivel, indiceRiqueza(w, c));
      // Só com folga: caixa depois da obra acima da reserva, e custo dentro de 1,5 orçamentos anuais de infra.
      if (s.caixa[c] - custo < reserva || custo > 1.5 * Math.max(s.orcInfra[c], 1)) return;
      // Pontuação = ganho esperado × ambição / custo; a ambição (dono) entra no Bloco B (por agora a reputação).
      const v = (OBRAS_IA.ganho[tipo] * (0.5 + w.reputacao[c] / 100) * (tecto - nivel)) / custo;
      if (v > mv) { mv = v; melhor = tipo; }
    });
    return melhor;
  }
}

export const IA = new ControladorIA();
