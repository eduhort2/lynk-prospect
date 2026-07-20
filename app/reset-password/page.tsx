"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/ui/password-strength";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { isStrongPassword, passwordError } from "@/lib/validations/password";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = passwordError(password);
    if (validationError) return toast.error("A senha não atende aos requisitos", { description: validationError });
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
            <p className="mt-2 text-sm text-muted">Crie uma senha segura para proteger sua conta.</p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="pr-10" autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
                <PasswordStrength password={password} />
              </div>
              <div><Label htmlFor="confirmation">Confirmar senha</Label><Input id="confirmation" type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /><p className={cn("mt-2 text-[11px]", confirmation && password === confirmation ? "text-primary-light" : "text-zinc-500")}>{confirmation ? password === confirmation ? "As senhas coincidem" : "As senhas ainda não coincidem" : "Digite novamente a senha"}</p></div>
              <Button type="submit" className="w-full" disabled={loading || !isStrongPassword(password) || password !== confirmation}>{loading ? "Atualizando..." : "Salvar nova senha"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
