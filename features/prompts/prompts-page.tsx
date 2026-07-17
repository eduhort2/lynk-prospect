"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Clipboard, Clock3, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { promptSchema, type PromptFormValues } from "@/lib/validations/prompt";
import { formatDate } from "@/lib/utils";
import { buildLandingPagePrompt } from "./prompt-builder";
import { useDeletePrompt, usePromptHistory, useSavePrompt } from "./use-prompts";

export function PromptsPage() {
  const history = usePromptHistory();
  const savePrompt = useSavePrompt();
  const deletePrompt = useDeletePrompt();
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState<PromptFormValues | null>(null);
  const [copied, setCopied] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: { company_name: "", segment: "", city: "", differentiators: "", instagram: "", objective: "Gerar contatos e pedidos de orçamento" },
  });

  function generate(values: PromptFormValues) {
    setSource(values);
    setPrompt(buildLandingPagePrompt(values));
    setCopied(false);
    toast.success("Prompt gerado");
  }

  async function copy(value = prompt) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Prompt copiado");
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function save() {
    if (!source || !prompt) return;
    try {
      await savePrompt.mutateAsync({ company_name: source.company_name, segment: source.segment, city: source.city || null, objective: source.objective, prompt });
      toast.success("Prompt salvo no histórico");
    } catch (error) { toast.error("Não foi possível salvar", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  async function remove(id: string) {
    try { await deletePrompt.mutateAsync(id); toast.success("Prompt removido"); }
    catch (error) { toast.error("Não foi possível remover", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  return (
    <>
      <PageHeader eyebrow="Produção assistida" title="Criador de prompts" description="Transforme o briefing comercial em uma instrução completa e consistente para produção da landing page." />
      <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <Card><CardHeader><div><CardTitle>Briefing essencial</CardTitle><CardDescription>Use somente informações confirmadas pelo cliente.</CardDescription></div></CardHeader><CardContent><form onSubmit={handleSubmit(generate)} className="space-y-4">
          <div><Label htmlFor="prompt-company">Nome da empresa *</Label><Input id="prompt-company" placeholder="Ex.: General Gastronomia" {...register("company_name")} />{errors.company_name ? <p className="mt-1 text-xs text-red-400">{errors.company_name.message}</p> : null}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="prompt-segment">Segmento *</Label><Input id="prompt-segment" placeholder="Restaurante" {...register("segment")} />{errors.segment ? <p className="mt-1 text-xs text-red-400">{errors.segment.message}</p> : null}</div><div><Label htmlFor="prompt-city">Cidade</Label><Input id="prompt-city" placeholder="Curitiba - PR" {...register("city")} /></div></div>
          <div><Label htmlFor="prompt-instagram">Instagram</Label><Input id="prompt-instagram" placeholder="https://instagram.com/empresa" {...register("instagram")} /></div>
          <div><Label htmlFor="differentiators">Diferenciais confirmados *</Label><Textarea id="differentiators" placeholder="Liste os pontos validados com o cliente..." {...register("differentiators")} />{errors.differentiators ? <p className="mt-1 text-xs text-red-400">{errors.differentiators.message}</p> : null}</div>
          <div><Label htmlFor="objective">Objetivo *</Label><Textarea id="objective" className="min-h-20" {...register("objective")} />{errors.objective ? <p className="mt-1 text-xs text-red-400">{errors.objective.message}</p> : null}</div>
          <Button type="submit" size="lg" className="w-full"><Sparkles className="h-4 w-4" /> Gerar prompt completo</Button>
        </form></CardContent></Card>

        <Card className="min-h-[650px]"><CardHeader><div><CardTitle>Prompt de produção</CardTitle><CardDescription>Pronto para usar no Codex ou no fluxo futuro de IA.</CardDescription></div>{prompt ? <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => copy()}>{copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />} {copied ? "Copiado" : "Copiar"}</Button><Button size="sm" onClick={save} disabled={savePrompt.isPending}>{savePrompt.isPending ? "Salvando..." : "Salvar"}</Button></div> : null}</CardHeader><CardContent>{prompt ? <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-[530px] font-mono text-xs leading-relaxed" /> : <EmptyState icon={Sparkles} title="O prompt aparecerá aqui" description="Preencha o briefing ao lado para gerar uma instrução completa, editável e pronta para copiar." />}</CardContent></Card>
      </div>

      <Card className="mt-5"><CardHeader><div><CardTitle>Histórico</CardTitle><CardDescription>Últimos prompts salvos pela equipe.</CardDescription></div></CardHeader><CardContent className="space-y-2">{history.isLoading ? <p className="py-10 text-center text-sm text-muted">Carregando histórico...</p> : history.data?.length ? history.data.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-line bg-[#090909] p-3"><div className="rounded-lg bg-primary/10 p-2 text-primary-light"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-zinc-200">{item.company_name}</p><p className="mt-1 text-[10px] text-zinc-600">{item.segment} · {formatDate(item.created_at, true)}</p></div><Button variant="ghost" size="sm" onClick={() => copy(item.prompt)}><Clipboard className="h-3.5 w-3.5" /> Copiar</Button><Button variant="ghost" size="icon" className="text-red-300" onClick={() => remove(item.id)} disabled={deletePrompt.isPending} aria-label="Excluir prompt"><Trash2 className="h-3.5 w-3.5" /></Button></div>) : <p className="py-10 text-center text-sm text-zinc-600">Nenhum prompt salvo ainda.</p>}</CardContent></Card>
    </>
  );
}
