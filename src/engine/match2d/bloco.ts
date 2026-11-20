// Camadas 2 e 3 (secções 4 e 5): o bloco da equipa e a âncora de cada jogador dentro dele.
import { FORMAS_2D, AJUSTE_PAPEL } from '../../config/match2d/formacoes.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { BLOCO } from '../../config/match2d/bloco.ts';
import { CAMPO_2D } from '../../config/match2d/fisica.ts';
import { clamp, paraEquipa, hyp } from './referencial.ts';
import { LINHA } from '../../config/match2d/fase3.ts';
import type { Bloco, Equipa, Estado2D, Jogador2D, V2 } from './tipos.ts';

export function forma(id: string) {
  const f = FORMAS_2D[id];
  if (!f || f.lugares.length !== 11) throw new Error(`Formação sem forma 2D: ${id}`);
  return f;
}

/** Lugar normalizado de um jogador, misturando as formas sem bola (0) e com bola (1) e aplicando o papel (só com bola). */
export function lugarForma(formacao: string, lugar: number, papel: string, mistura: number): V2 {
  const l = forma(formacao).lugares[lugar];
  const a = AJUSTE_PAPEL[papel] ?? {};
  const cx = l.comBola[0] + (a.x ?? 0), cy = l.comBola[1] + (a.dentro ? Math.sign(0.5 - l.comBola[1]) * a.dentro : 0);
  return { x: l.semBola[0] + (cx - l.semBola[0]) * mistura, y: l.semBola[1] + (cy - l.semBola[1]) * mistura };
}

/** Medidas de uma forma: x da linha defensiva (os centrais), x do mais adiantado e a largura (y mínimo e máximo), sem o GR. */
export function medidasForma(formacao: string, papeis: string[], mistura: number) {
  const f = forma(formacao);
  let xDef = 0, nDef = 0, xMed = 0, nMed = 0, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  f.lugares.forEach((l, k) => {
    if (l.chave === 'GR') return;
    const q = lugarForma(formacao, k, papeis[k] ?? '', mistura);
    if (l.chave.startsWith('DC')) { xDef += q.x; nDef++; }
    if (l.chave.startsWith('M')) { xMed += q.x; nMed++; }
    xMax = Math.max(xMax, q.x); yMin = Math.min(yMin, q.y); yMax = Math.max(yMax, q.y);
  });
  const xd = xDef / Math.max(1, nDef);
  return { xDef: xd, xMax, yMin, yMax, xMed: nMed ? xMed / nMed : (xd + xMax) / 2 };
}

/**
 * Alvo do bloco de uma equipa (secção 4.2), no referencial dela. A linha defensiva segue a bola; sem bola fica sempre
 * entre a bola e a baliza, com bola no máximo 10 m à frente da bola (saída de bola com os centrais abertos).
 */
export function alvoBloco(s: Estado2D, e: Equipa, papeis: string[]): Bloco {
  const eq = s.equipas[e], P = ESTILOS_2D[eq.estilo];
  const b = paraEquipa(e, s.bola.p);
  const comBola = eq.mistura >= 0.5;
  const base = comBola ? P.linhaComBola : P.linhaSemBola;
  let linha = base + (comBola ? BLOCO.seguir_bola_com : BLOCO.seguir_bola_sem) * (b.x - CAMPO_2D.comprimento / 2);
  if (!comBola) {
    // Secção 9.1: bola descoberta (portador sem ninguém perto, de frente para a nossa baliza) → a linha recua;
    // o adversário passou para trás → a linha sobe em bloco durante uns segundos.
    const c = s.bola.dono ? s.jogadores.find((o) => o.id === s.bola.dono) : null;
    if (c && c.equipa !== e) {
      const livre = !s.jogadores.some((o) => o.equipa === e && hyp(o.p.x - c.p.x, o.p.y - c.p.y) < LINHA.descoberta_livre_m);
      const deFrente = Math.cos(c.corpo - (e === 0 ? Math.PI : 0)) > 0.5;
      if (livre && deFrente) linha -= LINHA.descoberta_recua;
    }
    if (s.tick < eq.subirAte) linha += LINHA.passe_atras_sobe;
  }
  linha = Math.min(linha, base + BLOCO.linha_folga_max, comBola ? b.x + 10 : b.x - BLOCO.atras_bola_sem);
  const m = medidasForma(eq.formacao, papeis, comBola ? 1 : 0);
  let comprimento = comBola ? clamp((m.xMax - m.xDef) * CAMPO_2D.comprimento, BLOCO.comprimento_com[0], BLOCO.comprimento_com[1]) : P.comprimentoSemBola;
  // Sem bola: a linha de médios fica entre a bola e a baliza (só os avançados podem estar à frente da bola).
  if (!comBola) linha = Math.min(linha, b.x - BLOCO.medios_atras_bola_m - ((m.xMed - m.xDef) / Math.max(0.05, m.xMax - m.xDef)) * comprimento);
  linha = Math.max(BLOCO.linha_min, linha);
  comprimento = Math.min(comprimento, CAMPO_2D.comprimento - 3 - linha);
  const largura = comBola ? P.larguraComBola : P.larguraSemBola;
  const deslize = comBola ? BLOCO.deslize_com : P.deslize;
  const meia = largura / 2 + BLOCO.margem_y;
  const centroY = clamp(CAMPO_2D.largura / 2 + (b.y - CAMPO_2D.largura / 2) * deslize, meia, CAMPO_2D.largura - meia);
  return { linhaDefX: linha, comprimento, largura, centroY };
}

/** Linha do fora de jogo para a equipa e (no referencial dela): o penúltimo adversário ou a bola, o que estiver mais à
 *  frente; nunca antes do meio-campo. */
export function linhaForaDeJogo(s: Estado2D, e: Equipa): number {
  let a = -Infinity, b = -Infinity; // os dois adversários mais perto da baliza adversária
  for (const o of s.jogadores) {
    if (o.equipa === e) continue;
    const xe = e === 0 ? o.p.x : CAMPO_2D.comprimento - o.p.x;
    if (xe > a) { b = a; a = xe; } else if (xe > b) b = xe;
  }
  return Math.max(b, paraEquipa(e, s.bola.p).x, CAMPO_2D.comprimento / 2);
}

/** Filtro suave do bloco: aproxima o bloco actual do alvo com a constante de tempo do config. */
const K_FILTRO = 1 - Math.exp(-0.1 / BLOCO.filtro_s);
export function filtrarBloco(b: Bloco, alvo: Bloco, dt: number): Bloco {
  const k = dt === 0.1 ? K_FILTRO : 1 - Math.exp(-dt / BLOCO.filtro_s);
  return { linhaDefX: b.linhaDefX + (alvo.linhaDefX - b.linhaDefX) * k, comprimento: b.comprimento + (alvo.comprimento - b.comprimento) * k,
    largura: b.largura + (alvo.largura - b.largura) * k, centroY: b.centroY + (alvo.centroY - b.centroY) * k };
}

/**
 * Âncora de um jogador (secção 4.3), no referencial da equipa:
 *   x = linhaDefX + (forma.x − forma.xDefesa) × comprimento ÷ comprimentoForma
 *   y = centroY + (forma.y − meio da forma) × largura ÷ larguraForma
 * (a largura é normalizada pela da forma, para o bloco ter de facto a largura do estilo). O GR fica entre a bola e o
 * centro da baliza, a 4–15 m da linha conforme a altura da linha defensiva; o líbero sai mais.
 */
export function ancora(s: Estado2D, j: Jogador2D, papeis: string[], medidas?: ReturnType<typeof medidasForma>, foraDeJogo?: number): V2 {
  const eq = s.equipas[j.equipa], b = eq.bloco;
  if (j.chave === 'GR') {
    const bola = paraEquipa(j.equipa, s.bola.p);
    const d = Math.max(BLOCO.gr_min, Math.min(clamp(BLOCO.gr_min + (b.linhaDefX - 16) * BLOCO.gr_por_linha + (j.papel === 'gr_lib' ? BLOCO.gr_libero_extra : 0), BLOCO.gr_min, BLOCO.gr_max), b.linhaDefX - BLOCO.gr_atras_linha));
    const y = CAMPO_2D.largura / 2 + clamp((bola.y - CAMPO_2D.largura / 2) * (d / Math.max(d, bola.x)), -CAMPO_2D.largura * BLOCO.gr_desvio_y, CAMPO_2D.largura * BLOCO.gr_desvio_y);
    return { x: d, y };
  }
  const m = medidas ?? medidasForma(eq.formacao, papeis, eq.mistura);
  const q = lugarForma(eq.formacao, j.lugar, j.papel, eq.mistura);
  // Com bola, a frente do bloco pára na linha do fora de jogo: o bloco encurta (as linhas aproximam-se em proporção),
  // e os avançados jogam encostados ao último defensor.
  let comp = b.comprimento;
  if (eq.mistura > 0) {
    const limite = (foraDeJogo ?? linhaForaDeJogo(s, j.equipa)) - BLOCO.fora_jogo_margem;
    const frente = b.linhaDefX + comp, alvo = Math.max(BLOCO.comprimento_min, limite - b.linhaDefX);
    if (frente > limite) comp = comp + (alvo - comp) * eq.mistura;
  }
  const x = b.linhaDefX + ((q.x - m.xDef) * comp) / Math.max(0.05, m.xMax - m.xDef);
  const y = b.centroY + ((q.y - (m.yMin + m.yMax) / 2) * b.largura) / Math.max(0.05, m.yMax - m.yMin);
  return { x: clamp(x, 1.5, CAMPO_2D.comprimento - 1.5), y: clamp(y, 1.5, CAMPO_2D.largura - 1.5) };
}
