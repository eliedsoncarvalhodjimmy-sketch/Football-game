// VERSÃO v1 CONGELADA — não alterar (ver ../faceGenerator.ts).
// Camada SVG para React: as partes do rosto produzem texto SVG (rápido e reutilizável fora do React);
// este componente insere esse texto num <g>. O texto é sempre gerado por nós (cores validadas), nunca vem do utilizador.
export function SvgLayer({ markup }: { markup: string }) {
  return <g dangerouslySetInnerHTML={{ __html: markup }} />;
}
