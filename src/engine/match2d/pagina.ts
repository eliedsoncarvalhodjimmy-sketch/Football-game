// Ponto de entrada do ecrã de teste do motor 2D táctico (docs/prototipo/motor2d.html): expõe o motor em
// `globalThis.FutCEOMotor2D`. Empacotado com o esbuild (scripts/empacotar-motor2d.sh).
import { Motor2D } from './Motor2D.ts';
import { gerarEquipa2D, lugaresApp } from './equipas.ts';
import { Medidor } from './metricas.ts';
import { posicaoCaminho, CAMINHO_BOLA } from './caminho.ts';
import { lugarForma } from './bloco.ts';
import { FORMAS_2D } from '../../config/match2d/formacoes.ts';
import { ESTILOS_2D } from '../../config/match2d/estilos.ts';
import { VELOCIDADES_FASE1, TICK_S, CAMPO_2D } from '../../config/match2d/fisica.ts';
import { ESTILOS } from '../../config/estilos.ts';

(globalThis as unknown as Record<string, unknown>).FutCEOMotor2D = {
  Motor2D, gerarEquipa2D, lugaresApp, Medidor, posicaoCaminho, CAMINHO_BOLA, lugarForma, FORMAS_2D, ESTILOS_2D, VELOCIDADES_FASE1, TICK_S, CAMPO_2D,
  NOMES_ESTILOS: Object.fromEntries(ESTILOS.map((e) => [e.id, e.nome])),
};
