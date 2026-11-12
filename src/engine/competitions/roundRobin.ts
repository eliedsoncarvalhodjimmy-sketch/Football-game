// Tabela de Berger (método do círculo) com n voltas. Dentro de cada volta,
// nenhuma equipa joga mais de 2 vezes seguidas em casa ou fora; na passagem
// de volta pode haver 3. Nº ímpar de equipas: folga rotativa.

/** Rondas com pares [casa, fora] de índices locais 0..n-1. */
export function rondasBerger(n: number, voltas: number): [number, number][][] {
  const impar = n % 2 === 1;
  const m = impar ? n + 1 : n;
  const N = m - 1;
  const base: [number, number][][] = [];
  for (let r = 0; r < N; r++) {
    const rd: [number, number][] = [];
    rd.push(r % 2 === 0 ? [r, N] : [N, r]);
    for (let i = 1; i < m / 2; i++) {
      const a = (r + i) % N;
      const b = (r - i + N) % N;
      rd.push(i % 2 === 1 ? [a, b] : [b, a]);
    }
    // Com nº ímpar, a equipa "N" é a folga.
    base.push(impar ? rd.filter(([h, a]) => h !== N && a !== N) : rd);
  }
  const out: [number, number][][] = [];
  for (let v = 0; v < voltas; v++) {
    for (const rd of base) out.push(v % 2 === 0 ? rd.map((p) => [p[0], p[1]] as [number, number]) : rd.map(([h, a]) => [a, h] as [number, number]));
  }
  return out;
}
