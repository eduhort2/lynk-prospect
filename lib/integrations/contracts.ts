export interface LandingPageGenerationInput {
  projectId: string;
  prompt: string;
  templateId?: string;
}

export interface LandingPageGenerationResult {
  html: string;
  css: string;
  javascript: string;
  assets: string[];
}

export interface LandingPageGenerator {
  generate(input: LandingPageGenerationInput): Promise<LandingPageGenerationResult>;
}

export interface DeploymentProvider {
  deploy(projectId: string, files: LandingPageGenerationResult): Promise<{ url: string }>;
}

export interface WhatsAppProvider {
  sendTemplate(input: {
    to: string;
    template: string;
    variables: Record<string, string>;
  }): Promise<{ externalId: string; status: string }>;
}

// As implementações pagas entram somente na Fase 3. Manter os contratos separados
// impede que o CRM gratuito dependa de OpenAI, Meta, GitHub, Netlify ou Vercel.
