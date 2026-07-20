"use client";

import { ArrowRight, BarChart3, Eye, EyeOff, LockKeyhole, Mail, SearchCheck, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Logo } from "@/components/layout/logo";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isStrongPassword, passwordError } from "@/lib/validations/password";

type Mode = "login" | "signup" | "recover";

export default function LoginPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
    });
  }, [router, supabase]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) toast.error("Não foi possível concluir a autenticação", { description: error });
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      if (mode === "recover") {
        const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        toast.success("Link enviado", { description: "Confira sua caixa de entrada para redefinir a senha." });
        setMode("login");
        return;
      }

      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Informe seu nome completo");
        if (organizationName.trim().length < 2) throw new Error("Informe o nome da empresa");
        const validationError = passwordError(password);
        if (validationError) throw new Error(validationError);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim(), organization_name: organizationName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada", { description: "Confirme seu e-mail para liberar o acesso." });
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(mode === "signup" ? "Não foi possível criar a conta" : "Não foi possível entrar", {
        description: error instanceof Error ? error.message : "Revise os dados e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-black lg:grid-cols-[minmax(480px,1fr)_minmax(520px,.85fr)]">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#384A72]/20 blur-[130px]" />
      <section className="relative hidden border-r border-line bg-grid bg-[size:52px_52px] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <Logo />

        <div className="max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[.16em] text-primary">Operação comercial</p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-[-.035em]">Transforme prospecção em um processo previsível.</h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-500">Encontre oportunidades, organize sua equipe e acompanhe cada negociação em uma única plataforma.</p>
        </div>

        <div className="grid grid-cols-3 border-t border-line pt-8">
          <div><SearchCheck className="mb-3 h-4 w-4 text-primary" /><p className="text-xs text-zinc-400">Pesquisa de leads</p></div>
          <div><BarChart3 className="mb-3 h-4 w-4 text-primary" /><p className="text-xs text-zinc-400">Gestão do pipeline</p></div>
          <div><ShieldCheck className="mb-3 h-4 w-4 text-primary" /><p className="text-xs text-zinc-400">Dados por empresa</p></div>
        </div>
      </section>

      <section className="relative flex items-center justify-center p-5 sm:p-10 xl:p-16">
        <div className="w-full max-w-md animate-float-in">
          <Logo className="mb-12 lg:hidden" />
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">LYNK Prospect</p>
            <h2 className="text-3xl font-semibold tracking-tight">
              {mode === "login" ? "Bem-vindo de volta" : mode === "signup" ? "Criar primeiro acesso" : "Recuperar senha"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {mode === "recover" ? "Enviaremos um link seguro para o seu e-mail." : mode === "signup" ? "Crie o ambiente da sua empresa para começar." : "Acesse o ambiente da sua empresa."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" ? (
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="name">Nome completo</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" required /></div><div><Label htmlFor="organization">Empresa</Label><Input id="organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Nome da empresa" autoComplete="organization" required /></div></div>
            ) : null}

            <div>
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" className="pl-10" autoComplete="email" required />
              </div>
            </div>

            {mode !== "recover" ? (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" ? (
                    <button type="button" onClick={() => setMode("recover")} className="mb-1.5 text-xs text-primary-light hover:underline">Esqueci minha senha</button>
                  ) : null}
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="pl-10 pr-10" minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signup" ? <PasswordStrength password={password} /> : null}
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={loading || (mode === "signup" && !isStrongPassword(password))}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-600">
            {mode === "login" ? (
              <>Primeiro acesso? <button type="button" onClick={() => setMode("signup")} className="text-zinc-300 hover:text-white">Criar conta</button></>
            ) : (
              <>Já tem acesso? <button type="button" onClick={() => setMode("login")} className="text-zinc-300 hover:text-white">Voltar ao login</button></>
            )}
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-zinc-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Autenticação protegida pelo Supabase
          </div>
        </div>
      </section>
    </main>
  );
}
