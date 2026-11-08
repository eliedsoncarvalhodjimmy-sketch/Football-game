// UI-side client for the simulation worker (promise per request).

import type { Envelope, Reply, Request, ResponseFor } from './protocol';

export class WorkerClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(private worker: Worker) {
    worker.onmessage = (ev: MessageEvent<Reply>) => {
      const r = ev.data;
      const p = this.pending.get(r.id);
      if (!p) return;
      this.pending.delete(r.id);
      if (r.ok) p.resolve(r.result);
      else p.reject(new Error(r.error));
    };
  }

  request<R extends Request>(req: R): Promise<ResponseFor<R>> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, req } satisfies Envelope);
    });
  }
}
