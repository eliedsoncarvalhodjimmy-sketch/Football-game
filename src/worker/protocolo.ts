// Mensagens entre a interface e o Web Worker (Prompt 5, Bloco A). A interface só lê vistas e envia comandos.
import type { Etapa, PaisEscolha, RegistoJogo, Resumo, Comando, PedidoVista, Vista } from '../jogo/sessao.ts';

export type Pedido =
  | { id: number; tipo: 'preparar' }
  | { id: number; tipo: 'novoMundo'; semente: number }
  | { id: number; tipo: 'comecar'; clube: string; perfil: RegistoJogo['perfil'] }
  | { id: number; tipo: 'carregar'; registo: RegistoJogo }
  | { id: number; tipo: 'avancar'; semanas: number }
  | { id: number; tipo: 'resumo' }
  | { id: number; tipo: 'comando'; comando: Comando }
  | { id: number; tipo: 'vista'; pedido: PedidoVista };

export type Resposta =
  | { id: number; tipo: 'progresso'; etapa: Etapa; fraccao: number; texto: string }
  | { id: number; tipo: 'paises'; paises: PaisEscolha[] }
  | { id: number; tipo: 'estado'; resumo: Resumo; registo: RegistoJogo }
  | { id: number; tipo: 'vista'; vista: Vista }
  | { id: number; tipo: 'ok' }
  | { id: number; tipo: 'erro'; msg: string };
