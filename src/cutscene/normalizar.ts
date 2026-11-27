// Prompt 11, Bloco 2: normalização de nomes para ligar ficheiros de escudos a clubes (mesma ideia de
// `semAcentos`/`nomeCanonico` em src/historico/historico.ts, mas sem depender desse ficheiro — é só texto).
export const normalizarNome = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
