// Web Worker: o motor corre aqui, fora da thread da interface.
import { GlobSource } from '../data/GlobSource.ts';
import { carregarDados } from '../data/load.ts';
import { construirMundo } from '../engine/world.ts';
import { calendarioLigas } from '../engine/calendar/epoca.ts';
import { verificarCalendario } from '../engine/calendar/verificar.ts';
import { isoData } from '../engine/calendar/datas.ts';
import type { Pedido, Resposta, ResumoLiga } from './protocolo.ts';

const responder = (r: Resposta) => (self as unknown as Worker).postMessage(r);

self.onmessage = async (ev: MessageEvent<Pedido>) => {
  try {
    if (ev.data.tipo !== 'gerar') return;
    const t0 = performance.now();
    const d = await carregarDados(new GlobSource());
    const w = construirMundo(d, { semente: ev.data.semente, modo: 'teste' });
    const cal = calendarioLigas(w);
    const todos = [...cal.values()].flat();
    const ligas: ResumoLiga[] = w.ligas.map((l) => {
      const js = cal.get(l.regras.id)!;
      const ult = js[js.length - 1];
      const reps = l.clubes.map((c) => w.reputacao[c]);
      return {
        id: l.regras.id, pais: w.pacotes.find((p) => p.manifest.id === l.pacote)!.manifest.nome, nome: l.regras.nome,
        nivel: l.regras.nivel, equipas: l.clubes.length, jornadas: ult.ronda, repMax: Math.max(...reps), repMin: Math.min(...reps),
        primeira: isoData(w.epoca, js[0].semana, js[0].dia), ultima: isoData(w.epoca, ult.semana, ult.dia),
        clubes: [...l.clubes].sort((a, b) => w.reputacao[b] - w.reputacao[a]).map((i) => {
          const c = w.clubes[i];
          return { nome: c.nome, sigla: c.nome_curto, cidade: c.cidade, rep: c.reputacao, atq: Math.round(w.ataque[i]), def: Math.round(w.defesa[i]), estadio: c.estadio, capacidade: c.capacidade, cores: c.cores };
        }),
      };
    });
    responder({ tipo: 'mundo', semente: ev.data.semente, clubes: w.activos(), jogos: todos.length, conflitos: verificarCalendario(todos).length, ms: performance.now() - t0, ligas });
  } catch (e) {
    responder({ tipo: 'erro', msg: (e as Error).message });
  }
};
