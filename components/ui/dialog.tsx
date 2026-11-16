"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}

/**
 * Renderizado em portal no <body>. Antes ficava dentro de `.page-transition`, cuja
 * animação deixa um `transform` aplicado: isso faz o `position: fixed` se prender à
 * página (e não à tela) e coloca o cabeçalho por cima, cortando o formulário.
 */
export function Dialog({ open, onClose, title, description, children, size = "lg" }: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const widths = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[94dvh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-[#0b0b0b] p-4 sm:p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
