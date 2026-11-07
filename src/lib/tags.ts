/** Cores disponíveis para etiquetas (dentro da identidade Smell). */
export const TAG_COLORS = [
  { value: "#710014", label: "Vinho" },
  { value: "#4C020B", label: "Vinho escuro" },
  { value: "#C4AA6F", label: "Dourado" },
  { value: "#2F6B3A", label: "Verde" },
  { value: "#1F4E79", label: "Azul" },
  { value: "#6B5558", label: "Cinza" },
];

/** Texto legível sobre a cor da etiqueta. */
export function tagTextColor(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.5 ? "#4C020B" : "#FFFFFF";
}

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
