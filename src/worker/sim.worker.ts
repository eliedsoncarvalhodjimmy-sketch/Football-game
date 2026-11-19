// Web Worker: o motor corre aqui, fora da thread da interface. Cada pedido tem um id; a resposta final repete-o
// (as mensagens de progresso também, para a barra do ecrã de carregamento).
import { GlobSource } from '../data/GlobSource.ts';
import { Sessao, type Etapa } from '../jogo/sessao.ts';
import type { Pedido, Resposta } from './protocolo.ts';

const sessao = new Sessao(new GlobSource());
const responder = (r: Resposta) => (self as unknown as Worker).postMessage(r);

self.onmessage = async (ev: MessageEvent<Pedido>) => {
  const p = ev.data;
  const prog = (etapa: Etapa, fraccao: number, texto: string) => responder({ id: p.id, tipo: 'progresso', etapa, fraccao, texto });
  const estado = () => responder({ id: p.id, tipo: 'estado', resumo: sessao.resumo(), registo: sessao.registo! });
  try {
    switch (p.tipo) {
      case 'preparar': await sessao.preparar(prog); responder({ id: p.id, tipo: 'ok' }); break;
      case 'novoMundo': responder({ id: p.id, tipo: 'paises', paises: await sessao.novoMundo(p.semente, prog) }); break;
      case 'comecar': sessao.comecar(p.clube, p.perfil); estado(); break;
      case 'carregar': await sessao.carregar(p.registo, prog); estado(); break;
      case 'avancar': for (let k = 0; k < p.semanas; k++) sessao.avancar(); estado(); break;
      case 'resumo': estado(); break;
      case 'comando': sessao.comando(p.comando); estado(); break;
      case 'vista': responder({ id: p.id, tipo: 'vista', vista: sessao.vista(p.pedido) }); break;
    }
  } catch (e) {
    responder({ id: p.id, tipo: 'erro', msg: (e as Error).message });
  }
};
