import type { PlanCode } from "@/types";

export type CommercialPlan = {
  code: PlanCode;
  name: string;
  price: number;
  description: string;
  members: number;
  storedLeads: number;
  prospectingCredits: number;
  highlight?: boolean;
  features: string[];
};

export const commercialPlans: CommercialPlan[] = [
  {
    code: "free",
    name: "Gratuito",
    price: 0,
    description: "Para organizar uma operação comercial pequena.",
    members: 1,
    storedLeads: 100,
    prospectingCredits: 0,
    features: ["CRM de leads", "Pipeline", "Agenda", "Importação de planilhas"],
  },
  {
    code: "starter",
    name: "Starter",
    price: 79,
    description: "Para profissionais que prospectam todas as semanas.",
    members: 2,
    storedLeads: 2_000,
    prospectingCredits: 300,
    features: ["Tudo do Gratuito", "300 pesquisas mensais", "Exportação XLSX", "Prompts personalizados"],
  },
  {
    code: "pro",
    name: "Pro",
    price: 179,
    description: "Para times comerciais em crescimento.",
    members: 5,
    storedLeads: 10_000,
    prospectingCredits: 1_500,
    highlight: true,
    features: ["Tudo do Starter", "1.500 pesquisas mensais", "Relatórios avançados", "Gestão de projetos"],
  },
  {
    code: "business",
    name: "Business",
    price: 399,
    description: "Para operações com volume e múltiplos usuários.",
    members: 15,
    storedLeads: 50_000,
    prospectingCredits: 5_000,
    features: ["Tudo do Pro", "5.000 pesquisas mensais", "Auditoria", "Suporte prioritário"],
  },
];

export function getCommercialPlan(code: string | null | undefined) {
  return commercialPlans.find((plan) => plan.code === code) || commercialPlans[0];
}
