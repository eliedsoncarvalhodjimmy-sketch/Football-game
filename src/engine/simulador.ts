// Ponto de entrada do motor: simula épocas completas e guarda o histórico.
import type { World } from './world.ts';
import { Temporada } from './season/temporada.ts';
import { fecharEpoca } from './season/rollover.ts';
import { podar, type RegistoEpoca } from './history.ts';

export class Simulador {
  historico: RegistoEpoca[] = [];
  temporada: Temporada;

  constructor(public w: World, private guardarJogos = true) {
    this.temporada = new Temporada(w);
  }

  /** Simula uma semana; no fim da semana 51 fecha a época e abre a seguinte. */
  simularSemana() {
    const j = this.temporada.simularSemana();
    if (this.temporada.semana >= 52) this.fechar();
    return j;
  }

  simularEpoca(): RegistoEpoca {
    this.temporada.simularTudo();
    return this.fechar();
  }

  private fechar(): RegistoEpoca {
    const reg = fecharEpoca(this.w, this.temporada, this.guardarJogos, this.historico);
    this.historico.push(reg);
    podar(this.historico, this.w.epoca);
    this.temporada = new Temporada(this.w);
    return reg;
  }
}
