import { eachWeekOfInterval, endOfWeek, format, isAfter, isBefore, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Lead, OrganizationMember } from "@/types";

export function weeklyLeadData(leads: Lead[], weeks = 7) {
  const now = new Date();
  const starts = eachWeekOfInterval({ start: startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 }), end: now }, { weekStartsOn: 1 });
  return starts.map((start) => {
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return {
      week: format(start, "dd MMM", { locale: ptBR }),
      leads: leads.filter((lead) => {
        const created = new Date(lead.created_at);
        return !isBefore(created, start) && !isAfter(created, end);
      }).length,
    };
  });
}

export function funnelData(leads: Lead[]) {
  const stages = [
    { name: "Leads", statuses: null, fill: "#1f5ebf" },
    { name: "Contato", statuses: ["Contato enviado", "Respondeu", "Reunião marcada", "Proposta enviada", "Negociação", "Fechado"], fill: "#8CE739" },
    { name: "Respostas", statuses: ["Respondeu", "Reunião marcada", "Proposta enviada", "Negociação", "Fechado"], fill: "#4b8cff" },
    { name: "Propostas", statuses: ["Proposta enviada", "Negociação", "Fechado"], fill: "#B2F476" },
    { name: "Fechados", statuses: ["Fechado"], fill: "#a6c6ff" },
  ];
  return stages.map((stage) => ({ ...stage, value: stage.statuses ? leads.filter((lead) => stage.statuses!.includes(lead.status)).length : leads.length }));
}

export function performanceData(leads: Lead[], members: OrganizationMember[]) {
  return members.map((member) => {
    const memberLeads = leads.filter((lead) => lead.responsible_user === member.user_id);
    return {
      name: (member.profile?.name || member.profile?.email || "Usuário").split(" ")[0],
      leads: memberLeads.length,
      fechados: memberLeads.filter((lead) => lead.status === "Fechado").length,
    };
  }).filter((item) => item.leads > 0).slice(0, 8);
}
