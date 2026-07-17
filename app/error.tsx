"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold">Não foi possível carregar esta tela</h1>
        <p className="mt-2 text-sm text-muted">{error.message || "Ocorreu um erro inesperado. Tente novamente."}</p>
        <Button className="mt-6" onClick={reset}><RotateCcw className="h-4 w-4" /> Tentar novamente</Button>
      </div>
    </div>
  );
}
