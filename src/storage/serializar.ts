// Serialização binária do histórico: cabeçalho JSON + blocos Int32 dos jogos.
// Usada para estimar e gravar o tamanho de cada época (gravação incremental).
import type { RegistoEpoca } from '../engine/history.ts';

export function serializarHistorico(regs: RegistoEpoca[]): Uint8Array {
  const blocos: Int32Array[] = [];
  const meta = regs.map((r) => {
    const { jogos, repAntes, repDepois, ...resto } = r;
    if (jogos) blocos.push(jogos.dados);
    return {
      ...resto,
      repAntes: repAntes.map((x) => Math.round(x * 10)),
      repDepois: repDepois.map((x) => Math.round(x * 10)),
      jogos: jogos ? { comps: jogos.comps, n: jogos.dados.length } : null,
    };
  });
  const cab = new TextEncoder().encode(JSON.stringify(meta));
  const total = 4 + cab.length + blocos.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total + ((4 - (total % 4)) % 4));
  new DataView(out.buffer).setUint32(0, cab.length, true);
  out.set(cab, 4);
  let pos = 4 + cab.length;
  for (const b of blocos) { out.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), pos); pos += b.byteLength; }
  return out;
}

export function desserializarHistorico(buf: Uint8Array): RegistoEpoca[] {
  const n = new DataView(buf.buffer, buf.byteOffset).getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + n))) as (Omit<RegistoEpoca, 'jogos' | 'repAntes' | 'repDepois'> & { repAntes: number[]; repDepois: number[]; jogos: { comps: string[]; n: number } | null })[];
  let pos = 4 + n;
  return meta.map((m) => {
    let jogos: RegistoEpoca['jogos'] = null;
    if (m.jogos) {
      const bytes = buf.slice(pos, pos + m.jogos.n * 4);
      jogos = { comps: m.jogos.comps, dados: new Int32Array(bytes.buffer) };
      pos += m.jogos.n * 4;
    }
    return { ...m, repAntes: m.repAntes.map((x) => x / 10), repDepois: m.repDepois.map((x) => x / 10), jogos };
  });
}
