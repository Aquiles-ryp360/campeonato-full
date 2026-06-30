"use client";

import type { Category } from "@/lib/types";

export function CategorySwitcher({
  categories,
  value,
  onChange
}: {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-10 rounded-md border border-white/20 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-lime"
      aria-label="Cambiar categoria"
    >
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
