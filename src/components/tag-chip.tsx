import { tagTextColor } from "@/lib/tags";

export function TagChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: color, color: tagTextColor(color) }}
    >
      {name}
    </span>
  );
}
