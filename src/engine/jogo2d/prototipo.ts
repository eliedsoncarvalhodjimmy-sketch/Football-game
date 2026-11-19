// Ponto de entrada para o protótipo (HTML): expõe a simulação 2D e a montagem das equipas em `globalThis.FutCEO2D`.
// É empacotado com o esbuild para um único script embutido em docs/prototipo/futceo-prototipo.html.
import { Simulacao2D } from './Simulacao2D.ts';
import { gerarAtributos, gerarEquipa, tactica, lugares } from '../decision/montarJogo.ts';
import { VERSAO_DECISAO, CAMPO } from '../../config/decisao.ts';

(globalThis as unknown as Record<string, unknown>).FutCEO2D = { Simulacao2D, gerarAtributos, gerarEquipa, tactica, lugares, VERSAO_DECISAO, CAMPO };
