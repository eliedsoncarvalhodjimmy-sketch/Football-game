"use client";

import { tagTextColor } from "@/lib/tags";
import type { Tag } from "@/lib/types";

/** Etiquetas como botões que se ligam e desligam. */
export function TagSelector({ tags, value, onChange }: { tags: Tag[]; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-vinho-escuro">Etiquetas</legend>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => {
          const on = value.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== t.id) : [...value, t.id])}
              className="min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors"
              style={on ? { backgroundColor: t.color, borderColor: t.color, color: tagTextColor(t.color) } : { borderColor: t.color, color: "#4C020B" }}
            >
              {on ? "✓ " : ""}{t.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
