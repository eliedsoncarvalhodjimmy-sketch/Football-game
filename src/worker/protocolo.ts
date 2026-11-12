// Mensagens entre a interface e o Web Worker da simulação.
export type Pedido = { tipo: 'gerar'; semente: number };

export interface LinhaClube {
  nome: string; sigla: string; cidade: string; rep: number; atq: number; def: number; estadio: string; capacidade: number; cores: [string, string];
}
export interface ResumoLiga {
  id: string; pais: string; nome: string; nivel: number; equipas: number; jornadas: number; repMax: number; repMin: number;
  primeira: string; ultima: string; clubes: LinhaClube[];
}
export type Resposta =
  | { tipo: 'mundo'; semente: number; clubes: number; jogos: number; conflitos: number; ms: number; ligas: ResumoLiga[] }
  | { tipo: 'erro'; msg: string };
