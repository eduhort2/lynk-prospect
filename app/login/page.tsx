"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/logo";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "recover";

export default function LoginPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
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
        if (password.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() },
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
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid bg-[size:36px_36px] opacity-70" />
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        <Logo className="relative z-10" />

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary-light">
            <Sparkles className="h-3.5 w-3.5" /> Operação comercial inteligente
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-tight">
            Transforme prospecção em um processo previsível.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-500">
            Leads, agenda, pipeline e produção de landing pages conectados no mesmo produto da LYNK.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3">
          {["CRM centralizado", "Pipeline visual", "Arquitetura escalável"].map((item, index) => (
            <div key={item} className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4">
              <span className="mb-5 block text-xs text-primary-light">0{index + 1}</span>
              <p className="text-xs text-zinc-400">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md animate-float-in">
          <Logo className="mb-12 lg:hidden" />
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-primary-light">Acesso seguro</p>
            <h2 className="text-3xl font-semibold tracking-tight">
              {mode === "login" ? "Bem-vindo de volta" : mode === "signup" ? "Criar primeiro acesso" : "Recuperar senha"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {mode === "recover" ? "Enviaremos um link seguro para o seu e-mail." : "Use os dados cadastrados no Supabase Auth."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" ? (
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" required />
              </div>
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
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="pl-10 pr-10" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
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
