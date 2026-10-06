/** Domínio comercial público da landing page. */
export const LANDING_DOMAIN = "https://nr1pronto.com.br";
export const LANDING_SUPPORT_EMAIL = "suporte@nr1pronto.com.br";
export const LANDING_LINKEDIN = "https://www.linkedin.com/company/talent-group";
/** Placeholder — substituir pelo perfil oficial. */
export const LANDING_INSTAGRAM = "https://www.instagram.com/";
/** Placeholder — inserir CNPJ da NR-1Comprova. */
export const LANDING_CNPJ = "[inserir CNPJ]";
/** Placeholder — substituir pelo PDF do relatório demonstrativo. */
export const LANDING_DEMO_REPORT_URL = "/relatorio-demonstrativo.pdf";

export const CONTACT_SECTION_ID = "contato";
export const MATRIZ_SECTION_ID = "diagnostico";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function scrollToContact() {
  scrollToId(CONTACT_SECTION_ID);
}

export function scrollToMatriz() {
  scrollToId(MATRIZ_SECTION_ID);
}
