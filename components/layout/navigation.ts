import { CalendarDays, ContactRound, ListFilter } from "lucide-react";

/**
 * Navegação da versão enxuta. Dashboard, Clientes, Projetos, Prompts,
 * Relatórios, Planos e Prospecção automática continuam com rotas e código
 * preservados (/dashboard, /clientes, /projetos, /prompts, /relatorios,
 * /planos, /prospeccao); só não aparecem no menu. Para reativar um módulo,
 * acrescente o link aqui.
 */
export const MAIN_NAVIGATION = [
  { href: "/leads", label: "Leads", icon: ContactRound },
  { href: "/pipeline", label: "Pipeline", icon: ListFilter },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
];

export const HOME_PATH = "/leads";

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
