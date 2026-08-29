export const LEAD_STATUSES = [
  "Novo",
  "Contato enviado",
  "Respondeu",
  "Reunião marcada",
  "Proposta enviada",
  "Negociação",
  "Fechado",
  "Perdido",
] as const;

export const PROJECT_STATUSES = [
  "Aguardando kickoff",
  "Planejamento",
  "Design",
  "Desenvolvimento",
  "Revisão interna",
  "Aguardando cliente",
  "Homologação",
  "Concluído",
  "Manutenção",
  "Pausado",
  "Cancelado",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type Priority = "Baixa" | "Média" | "Alta";
export type UserRole = "admin" | "manager" | "seller" | "developer";
export type PlanCode = "free" | "starter" | "pro" | "business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete";

export interface Profile { id: string; name: string; email: string; avatar: string | null; role: UserRole; created_at: string; }
export interface Organization { id: string; name: string; slug: string; created_at: string; }

export interface Lead {
  id: string; organization_id: string; source_external_id: string | null; import_key: string | null;
  company_name: string; contact_name: string | null; phone: string | null; whatsapp: string | null;
  whatsapp_opt_in: boolean; whatsapp_opt_in_at: string | null; whatsapp_opt_in_source: string | null; whatsapp_last_message_id: string | null;
  email: string | null; segment: string | null; city: string | null; state: string | null; neighborhood: string | null;
  instagram: string | null; website: string | null; website_status: string | null; has_website: boolean; source: string | null;
  priority: Priority; status: LeadStatus; responsible_user: string | null; message: string | null; prompt: string | null;
  differentiators: string | null; landing_page_opportunity: string | null; contact_link: string | null;
  best_contact_day: string | null; best_contact_time: string | null; contact_time_reason: string | null;
  public_source: string | null; image_source: string | null; prospecting_status: string | null; contacted_at: string | null;
  response: string | null; offered_value: number | null; observations: string | null; email_status: string | null;
  created_at: string; updated_at: string; responsible?: Pick<Profile, "id" | "name" | "email"> | null;
}

export interface Activity { id: string; organization_id: string; lead_id: string; user_id: string; type: string; description: string; created_at: string; }
export type TaskStatus = "pendente" | "concluído" | "cancelado";
export interface Task {
  id: string; organization_id: string; lead_id: string | null; client_id?: string | null; project_id?: string | null;
  user_id: string; title: string; description: string | null; scheduled_at: string; status: TaskStatus; priority?: Priority; created_at: string;
  lead?: Pick<Lead, "id" | "company_name"> | null; responsible?: Pick<Profile, "id" | "name"> | null;
}

export interface Client {
  id: string; organization_id: string; lead_id: string | null; company_name: string; legal_name?: string | null; tax_id?: string | null;
  contact_name: string | null; phone: string | null; whatsapp?: string | null; email: string | null; address?: string | null;
  observations?: string | null; created_at: string; updated_at?: string;
}

export interface Project {
  id: string; organization_id: string; client_id: string; service_id?: string | null; proposal_id?: string | null; contract_id?: string | null;
  name: string; category: string | null; status: ProjectStatus; briefing: string | null; description?: string | null; scope?: string | null;
  responsible_user?: string | null; starts_at?: string | null; due_date?: string | null; delivered_at?: string | null; contracted_value?: number | null;
  observations?: string | null; preview_url: string | null; production_url: string | null; repository_url: string | null;
  created_at: string; updated_at?: string; client?: Pick<Client, "id" | "company_name"> | null;
}

export interface PromptGeneration { id: string; organization_id: string; user_id: string; company_name: string; segment: string; city: string | null; objective: string; prompt: string; created_at: string; }
export interface OrganizationMember { organization_id: string; user_id: string; role: UserRole; profile?: Profile; }
export interface Plan { id: string; code: PlanCode; name: string; description: string; price_monthly: number; max_members: number; max_stored_leads: number; monthly_prospecting_credits: number; features: Record<string, boolean>; active: boolean; }
export interface Subscription { id: string; organization_id: string; plan_id: string; status: SubscriptionStatus; stripe_customer_id: string | null; stripe_subscription_id: string | null; current_period_start: string; current_period_end: string; cancel_at_period_end: boolean; plan?: Plan | null; }
export type ProspectingJobStatus = "queued" | "running" | "completed" | "failed";
export interface ProspectingJob { id: string; organization_id: string; user_id: string; region: string; niche: string; requested_quantity: number; generated_quantity: number; status: ProspectingJobStatus; filters: Record<string, unknown>; error_message: string | null; created_at: string; completed_at: string | null; }

export interface Service { id: string; organization_id: string; name: string; description: string | null; base_price: number; price_type: "fixed" | "starting_at" | "monthly" | "hourly"; active: boolean; created_at: string; updated_at: string; }
export type ProposalStatus = "Rascunho" | "Enviada" | "Visualizada" | "Negociação" | "Aceita" | "Recusada" | "Expirada";
export interface Proposal { id: string; organization_id: string; number: string; client_id: string | null; lead_id: string | null; responsible_user: string | null; proposal_date: string; valid_until: string | null; observations: string | null; payment_terms: string | null; subtotal: number; discount: number; total: number; status: ProposalStatus; created_at: string; updated_at: string; }
export type ContractStatus = "Rascunho" | "Enviado" | "Assinado" | "Vigente" | "Encerrado" | "Cancelado";
export interface Contract { id: string; organization_id: string; client_id: string; proposal_id: string | null; project_id: string | null; number: string; status: ContractStatus; service: string | null; scope: string | null; value: number; payment_terms: string | null; starts_at: string | null; ends_at: string | null; document_url: string | null; signature_url: string | null; signed_at: string | null; created_at: string; updated_at: string; }
export type PaymentStatus = "Pendente" | "Pago" | "Atrasado" | "Cancelado";
export interface Payment { id: string; organization_id: string; client_id: string | null; project_id: string | null; contract_id: string | null; description: string; amount: number; due_date: string; paid_at: string | null; status: PaymentStatus; payment_method: string | null; observations: string | null; recurring: boolean; created_at: string; updated_at: string; }
