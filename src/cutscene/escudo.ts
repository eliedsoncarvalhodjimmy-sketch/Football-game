// Prompt 11, Bloco 2: escudo do clube na cutscene.
//  - Escudo real (fornecido pelo utilizador): usado tal como é — nunca redesenhado, recolorido, espelhado nem
//    variado (ao contrário dos rostos). Só a imagem, já preparada (WebP, fundo transparente) por
//    scripts/cutscene/gerar-escudos.ts.
//  - Sem imagem: escudo genérico (cor do clube + sigla), desenhado tal como estava no protótipo aprovado.
import { lum } from './utilitarios.ts';
import { fitText, fnt } from './efeitos.ts';

export interface ClubeEscudo { nome: string; sigla: string; cor: string }

/** Escudo genérico (protótipo `cutscene-realista/index.html`, função `escudo`): forma, gradiente, contorno, sigla
 *  e nome por baixo. `(x,y)` é o centro do escudo. */
export function desenharEscudoGenerico(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, club: ClubeEscudo, a: number, nomeMax: number) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  const w = S, h = S * 1.15;
  ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = S * 0.14; ctx.shadowOffsetY = S * 0.05;
  ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h * 0.1);
  ctx.quadraticCurveTo(w / 2, h * 0.38, 0, h / 2); ctx.quadraticCurveTo(-w / 2, h * 0.38, -w / 2, h * 0.1); ctx.closePath();
  ctx.fillStyle = club.cor; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.save(); ctx.clip();
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, 'rgba(255,255,255,.38)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)');
  ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(-w * 0.12, -h / 2, w * 0.24, h);
  ctx.restore();
  ctx.lineWidth = S * 0.05; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.fillStyle = lum(club.cor) > 0.62 ? '#101828' : '#ffffff';
  ctx.font = fnt(S * (club.sigla.length > 3 ? 0.26 : 0.32)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(club.sigla.toUpperCase(), 0, -h * 0.02);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6;
  fitText(ctx, club.nome.toUpperCase(), nomeMax, S * 0.16, 700); ctx.fillText(club.nome.toUpperCase(), x, y + S * 0.84); ctx.restore();
}

/** Escudo real: a imagem tal como é, centrada em (x,y), lado `S` (quadrado — as imagens já vêm com a forma e o
 *  fundo transparente). O nome do clube continua a escrever-se por baixo, como no genérico. */
export function desenharEscudoReal(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, S: number, club: ClubeEscudo, a: number, nomeMax: number) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(img, x - S / 2, y - S / 2, S, S); ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6;
  fitText(ctx, club.nome.toUpperCase(), nomeMax, S * 0.16, 700); ctx.fillText(club.nome.toUpperCase(), x, y + S * 0.84); ctx.restore();
}

/** Escolhe automaticamente: imagem real se existir e tiver carregado, senão o genérico. */
export function desenharEscudo(ctx: CanvasRenderingContext2D, img: CanvasImageSource | null, x: number, y: number, S: number, club: ClubeEscudo, a: number, nomeMax: number) {
  if (img) desenharEscudoReal(ctx, img, x, y, S, club, a, nomeMax);
  else desenharEscudoGenerico(ctx, x, y, S, club, a, nomeMax);
}
