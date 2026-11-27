// Prompt 11, Bloco 1: cena provisória (cores), só para verificar a linha de tempo e o relógio antes das imagens
// e dos desenhos finais (Blocos 2–4). Cada acto é uma barra; acende quando está activo.
import type { FuncaoCena } from '../tipos.ts';
import { prog } from '../utilitarios.ts';

const CORES: Record<string, string> = {
  fundo: '#1d4ed8', faixas: '#c2410c', marca: '#7c3aed', marcaSobe: '#7c3aed', fase: '#0ea5e9', painel: '#0ea5e9',
  home: '#16a34a', away: '#dc2626', vs: '#eab308', estadio: '#0891b2', trofeu: '#f59e0b', climax: '#ffffff', fade: '#000000',
};

export const cenaPlaceholder: FuncaoCena = ({ t, tl, dados, largura, altura, opacidadeSaida }, ctx) => {
  ctx.save();
  ctx.globalAlpha = opacidadeSaida;
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, largura, altura);
  const nomes = Object.keys(tl.actos);
  const h = altura / nomes.length;
  nomes.forEach((nome, i) => {
    const p = prog(t, tl.actos[nome]);
    const y = i * h;
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(0, y + 2, largura, h - 4);
    if (p > 0) { ctx.fillStyle = CORES[nome] ?? '#999'; ctx.globalAlpha = opacidadeSaida * (0.25 + 0.75 * p); ctx.fillRect(0, y + 2, largura * p, h - 4); ctx.globalAlpha = opacidadeSaida; }
    ctx.fillStyle = '#fff'; ctx.font = '600 13px system-ui'; ctx.textBaseline = 'middle';
    ctx.fillText(`${nome} [${tl.actos[nome][0]}–${tl.actos[nome][1]}s]`, 10, y + h / 2);
  });
  ctx.fillStyle = '#fff'; ctx.font = '700 20px system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${t.toFixed(1)} s`, largura - 12, 28);
  ctx.textAlign = 'left'; ctx.font = '600 14px system-ui';
  ctx.fillText(`${dados.casa.nome} vs ${dados.fora.nome} · ${dados.fase}`, 12, altura - 14);
  ctx.restore();
};
