// Medidas objectivas do movimento (para os testes e para o ecrã de teste): tremor, inversões, distância à âncora,
// linha defensiva paralela, bloco real contra o alvo, colegas demasiado perto, velocidade e aceleração.
import { TICK_S } from '../../config/match2d/fisica.ts';
import { limitesFisicos } from './fisica.ts';
import { paraEquipa, difAngulo, dist } from './referencial.ts';
import type { Motor2D } from './Motor2D.ts';

export class Medidor {
  private dir = new Map<string, number>();
  private vel = new Map<string, number>();
  private rot = new Map<string, number>();
  ziguezagues = 0;
  n = 0; viragem = 0; nViragem = 0; inversoes = 0; distAncora = 0; perto5 = 0; nJog = 0;
  linhaDesvio = 0; nLinha = 0; erroComp = 0; erroLarg = 0; nBloco = 0; colados = 0; acima = 0; acelExcesso = 0;
  ritmo = { andar: 0, trote: 0, corrida: 0, sprint: 0 };

  registar(m: Motor2D) {
    const s = m.estado;
    this.n++;
    for (const j of s.jogadores) {
      const v = Math.hypot(j.v.x, j.v.y), L = limitesFisicos(j);
      if (v > L.velMax + 1e-6) this.acima++;
      const va = this.vel.get(j.id);
      if (va !== undefined && Math.abs(v - va) / TICK_S > L.desacel + 1e-6) this.acelExcesso++;
      this.vel.set(j.id, v);
      if (v > 0.5) {
        const a = Math.atan2(j.v.y, j.v.x), ant = this.dir.get(j.id);
        if (ant !== undefined) {
          const dd = difAngulo(a, ant), d = Math.abs(dd);
          this.viragem += d; this.nViragem++; if (d > (2 * Math.PI) / 3) this.inversoes++;
          // Ziguezague: a viragem muda de sentido entre dois ticks seguidos, ambas acima de 5°.
          const r = this.rot.get(j.id);
          if (r !== undefined && Math.abs(dd) > 0.087 && Math.abs(r) > 0.087 && Math.sign(dd) !== Math.sign(r)) this.ziguezagues++;
          this.rot.set(j.id, dd);
        }
        this.dir.set(j.id, a);
      } else { this.dir.delete(j.id); this.rot.delete(j.id); }
      if (j.chave !== 'GR') { const d = dist(j.p, j.ancora); this.distAncora += d; if (d < 5) this.perto5++; this.nJog++; }
      this.ritmo[j.intensidade]++;
    }
    for (const e of [0, 1] as const) {
      const eq = s.equipas[e], meus = s.jogadores.filter((j) => j.equipa === e);
      for (let a = 0; a < meus.length; a++) for (let b = a + 1; b < meus.length; b++) if (dist(meus[a].p, meus[b].p) < 2) this.colados++;
      if (eq.fase !== 'DEF_ORGANIZADA') continue;
      // Linha defensiva: desvio-padrão do x dos defensores (no referencial da equipa).
      const xs = meus.filter((j) => /^(DC|DD|DE|AD|AE)/.test(j.chave)).map((j) => paraEquipa(e, j.p).x);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      this.linhaDesvio += Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) / xs.length); this.nLinha++;
      const campo = meus.filter((j) => j.chave !== 'GR').map((j) => paraEquipa(e, j.p));
      const comp = Math.max(...campo.map((q) => q.x)) - Math.min(...campo.map((q) => q.x));
      const larg = Math.max(...campo.map((q) => q.y)) - Math.min(...campo.map((q) => q.y));
      this.erroComp += Math.abs(comp - eq.bloco.comprimento); this.erroLarg += Math.abs(larg - eq.bloco.largura); this.nBloco++;
    }
  }

  resumo() {
    const tr = Object.values(this.ritmo).reduce((a, b) => a + b, 0) || 1;
    const minutosJog = (this.n * TICK_S * 22) / 60;
    return {
      /** Mudança média de direcção (°/s) de quem se mexe. */
      tremorGrausS: this.nViragem ? ((this.viragem / this.nViragem) * 180) / Math.PI / TICK_S : 0,
      /** Inversões bruscas (> 120° num tick) por jogador-minuto. */
      inversoesPorJogMin: this.inversoes / Math.max(1e-9, minutosJog),
      /** Ziguezagues (viragem que troca de sentido de um tick para o seguinte, > 5°) por jogador-minuto. */
      ziguezaguesPorJogMin: this.ziguezagues / Math.max(1e-9, minutosJog),
      distAncoraM: this.distAncora / Math.max(1, this.nJog),
      pertoAncoraPct: (100 * this.perto5) / Math.max(1, this.nJog),
      linhaDesvioM: this.nLinha ? this.linhaDesvio / this.nLinha : 0,
      erroComprimentoM: this.nBloco ? this.erroComp / this.nBloco : 0,
      erroLarguraM: this.nBloco ? this.erroLarg / this.nBloco : 0,
      coladosPorMin: this.colados / Math.max(1e-9, (this.n * TICK_S) / 60),
      acimaVelMax: this.acima, acelExcesso: this.acelExcesso,
      ritmoPct: Object.fromEntries(Object.entries(this.ritmo).map(([k, v]) => [k, Math.round((100 * v) / tr)])) as Record<string, number>,
    };
  }
}
