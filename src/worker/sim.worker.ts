/// <reference lib="webworker" />
// Simulation worker: owns the world so the UI thread never blocks.

import { openDatabase } from '../persistence/db';
import type { Envelope, Reply } from './protocol';
import { WorldService } from './service';

const service = new WorldService(() => openDatabase());
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (ev: MessageEvent<Envelope>) => {
  const { id, req } = ev.data;
  let reply: Reply;
  try {
    reply = { id, ok: true, result: await service.handle(req) };
  } catch (e) {
    reply = { id, ok: false, error: (e as Error).message ?? String(e) };
  }
  ctx.postMessage(reply);
};
