"use client";

import { Building2, CloudUpload, CreditCard, MapPinned, MessageCircle, Save, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { useMembers } from "@/features/auth/use-members";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { initials, slugify } from "@/lib/utils";
import { useOrganization } from "./organization-provider";

const roleLabel = { admin: "Administrador", manager: "Gestor", seller: "Comercial", developer: "Desenvolvedor" };

export function SettingsPage() {
  const { profile, organization, role } = useOrganization();
  const members = useMembers();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [orgName, setOrgName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const canManageOrg = role === "admin" || role === "manager";

  useEffect(() => { setName(profile?.name || ""); setAvatar(profile?.avatar || ""); }, [profile]);
  useEffect(() => { setOrgName(organization?.name || ""); }, [organization]);

  async function saveProfile() {
    if (!profile || name.trim().length < 2) return toast.error("Informe seu nome");
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ name: name.trim(), avatar: avatar.trim() || null }).eq("id", profile.id);
    setSavingProfile(false);
    if (error) return toast.error("Não foi possível salvar", { description: error.message });
    await queryClient.invalidateQueries({ queryKey: ["organization-context"] });
    toast.success("Perfil atualizado");
  }

  async function saveOrganization() {
    if (!organization || !canManageOrg || orgName.trim().length < 2) return;
    setSavingOrg(true);
    const { error } = await supabase.from("organizations").update({ name: orgName.trim(), slug: slugify(orgName) }).eq("id", organization.id);
    setSavingOrg(false);
    if (error) return toast.error("Não foi possível salvar a organização", { description: error.message });
    await queryClient.invalidateQueries({ queryKey: ["organization-context"] });
    toast.success("Organização atualizada");
  }

  return (
    <>
      <PageHeader eyebrow="Administração" title="Configurações" description="Gerencie seu perfil, a organização e acompanhe a preparação das integrações futuras." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><div><CardTitle>Seu perfil</CardTitle><CardDescription>Informações exibidas para a equipe.</CardDescription></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary-light">{initials(name)}</div></CardHeader><CardContent className="space-y-4"><div><Label>E-mail</Label><Input value={profile?.email || ""} disabled /></div><div><Label htmlFor="settings-name">Nome completo</Label><Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} /></div><div><Label htmlFor="settings-avatar">URL do avatar</Label><Input id="settings-avatar" value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://..." /></div><div className="flex items-center justify-between rounded-xl border border-line bg-[#090909] p-3"><div className="flex items-center gap-2 text-xs text-zinc-400"><ShieldCheck className="h-4 w-4 text-primary-light" /> Nível de acesso</div><Badge tone="blue">{role ? roleLabel[role] : "Carregando"}</Badge></div><Button onClick={saveProfile} disabled={savingProfile}><Save className="h-4 w-4" /> {savingProfile ? "Salvando..." : "Salvar perfil"}</Button></CardContent></Card>

        <Card><CardHeader><div><CardTitle>Organização</CardTitle><CardDescription>Ambiente multiempresa já preparado na base.</CardDescription></div><Building2 className="h-5 w-5 text-primary-light" /></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="org-name">Nome da organização</Label><Input id="org-name" value={orgName} onChange={(event) => setOrgName(event.target.value)} disabled={!canManageOrg} /></div><div><Label>Identificador</Label><Input value={organization?.slug || ""} disabled /></div><p className="text-xs leading-relaxed text-zinc-600">Somente administradores e gestores podem alterar os dados da organização.</p><Button onClick={saveOrganization} disabled={!canManageOrg || savingOrg}><Save className="h-4 w-4" /> {savingOrg ? "Salvando..." : "Salvar organização"}</Button></CardContent></Card>
      </div>

      <Card className="mt-5"><CardHeader><div><CardTitle>Equipe</CardTitle><CardDescription>Usuários vinculados à organização atual.</CardDescription></div><Badge tone="gray">{members.data?.length || 0} membros</Badge></CardHeader><CardContent><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{members.data?.map((member) => <div key={member.user_id} className="flex items-center gap-3 rounded-xl border border-line bg-[#090909] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.05] text-[10px] text-zinc-400">{initials(member.profile?.name)}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-zinc-200">{member.profile?.name || "Usuário"}</p><p className="truncate text-[10px] text-zinc-600">{member.profile?.email}</p></div><Badge tone="gray">{roleLabel[member.role]}</Badge></div>) || <p className="text-sm text-muted">Carregando membros...</p>}</div></CardContent></Card>

      <Card className="mt-5"><CardHeader><div><CardTitle>Plataforma e integrações</CardTitle><CardDescription>Serviços externos são configurados somente pelo ambiente seguro da LYNK.</CardDescription></div><Badge tone="green">v2.0</Badge></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ icon: CreditCard, name: "Stripe Billing", text: "Planos e assinaturas" }, { icon: MapPinned, name: "Google Places", text: "Pesquisa de empresas" }, { icon: MessageCircle, name: "WhatsApp Cloud API", text: "Planejado" }, { icon: CloudUpload, name: "Deploy automático", text: "Planejado" }].map(({ icon: Icon, name, text }) => <div key={name} className="rounded-lg border border-line bg-[#0D0E0C] p-4"><Icon className="mb-4 h-5 w-5 text-primary" /><p className="text-sm font-medium text-zinc-200">{name}</p><p className="mt-1 text-xs text-zinc-600">{text}</p></div>)}</div></CardContent></Card>
    </>
  );
}
