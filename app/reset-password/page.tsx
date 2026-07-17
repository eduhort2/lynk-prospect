"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres");
    if (password !== confirmation) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("Não foi possível atualizar a senha", { description: error.message });
    toast.success("Senha atualizada com sucesso");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <Card>
          <CardContent className="p-7">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary-light"><KeyRound className="h-5 w-5" /></div>
            <h1 className="text-2xl font-semibold">Defina sua nova senha</h1>
            <p className="mt-2 text-sm text-muted">Use pelo menos seis caracteres.</p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
              <div><Label htmlFor="confirmation">Confirmar senha</Label><Input id="confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Atualizando..." : "Salvar nova senha"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
