// Cliente do Web Worker: cada pedido devolve uma promessa; as mensagens de progresso vão para um callback.
import type { Pedido, Resposta } from '../worker/protocolo.ts';
import type { Etapa } from '../jogo/sessao.ts';

type SemId<T> = T extends unknown ? Omit<T, 'id'> : never;
export type Progresso = (etapa: Etapa, fraccao: number, texto: string) => void;

const worker = new Worker(new URL('../worker/sim.worker.ts', import.meta.url), { type: 'module' });
let seq = 0;
const pendentes = new Map<number, { ok: (r: Resposta) => void; erro: (e: Error) => void; prog?: Progresso }>();

worker.onmessage = (ev: MessageEvent<Resposta>) => {
  const r = ev.data, p = pendentes.get(r.id);
  if (!p) return;
  if (r.tipo === 'progresso') { p.prog?.(r.etapa, r.fraccao, r.texto); return; }
  pendentes.delete(r.id);
  if (r.tipo === 'erro') p.erro(new Error(r.msg)); else p.ok(r);
};

export function pedir<T extends Resposta['tipo']>(p: SemId<Pedido>, prog?: Progresso): Promise<Extract<Resposta, { tipo: T }>> {
  const id = ++seq;
  return new Promise((ok, erro) => {
    pendentes.set(id, { ok: ok as (r: Resposta) => void, erro, prog });
    worker.postMessage({ ...p, id } as Pedido);
  });
}
