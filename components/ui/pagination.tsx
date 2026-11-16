"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZES, type PageSize } from "@/features/leads/use-lead-pages";

export function PageSizeSelect({ value, onChange, label = "Por página" }: { value: PageSize; onChange: (value: PageSize) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500">
      <span className="whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as PageSize)}
        className="h-8 rounded-md border border-line bg-[#0D0E0C] px-2 text-xs text-zinc-200 outline-none focus:border-primary/60"
        aria-label={label}
      >
        {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </label>
  );
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, loading }: {
  page: number;
  pageSize: PageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  loading?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      <div className="flex items-center gap-1">
        <span className="mr-2 text-xs text-zinc-500" aria-live="polite">{from}–{to} de {total}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <span className="min-w-14 text-center text-xs text-zinc-400">{page} / {pages}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPageChange(page + 1)} disabled={page >= pages || loading} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
