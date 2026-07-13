"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function DocumentFilterBar({
  categories,
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
}: {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari dokumen…"
          className="h-8 pl-8 text-sm"
          aria-label="Cari dokumen"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {["Semua", ...categories].map((c) => {
          const isActive = c === "Semua" ? !activeCategory : activeCategory === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onCategoryChange(c === "Semua" ? "" : c)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                isActive
                  ? "border-red-600 bg-red-50 text-red-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
