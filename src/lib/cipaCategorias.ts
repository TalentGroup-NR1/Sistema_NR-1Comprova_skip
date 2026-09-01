export type CategoriaComportamento =
  | "assedio_sexual"
  | "ameaca_violencia"
  | "violencia_fisica"
  | "bullying_assedio_moral";

export type OrigemOfensa =
  | "lideranca_cliente"
  | "lideranca_interna"
  | "colegas_pares"
  | "subordinados"
  | "clientes_terceiros";

export const CATEGORIA_LABEL: Record<CategoriaComportamento, string> = {
  assedio_sexual: "Atenção sexual indesejada / Assédio Sexual",
  ameaca_violencia: "Ameaças de violência",
  violencia_fisica: "Violência física",
  bullying_assedio_moral: "Bullying / Assédio Moral",
};

export const ORIGEM_LABEL: Record<OrigemOfensa, string> = {
  lideranca_cliente: "Liderança / Gestão do Cliente",
  lideranca_interna: "Liderança / Gestão Interna",
  colegas_pares: "Colegas / Pares",
  subordinados: "Subordinados",
  clientes_terceiros: "Clientes / Terceiros",
};

export const CATEGORIA_OPTIONS = Object.entries(CATEGORIA_LABEL).map(
  ([value, label]) => ({ value: value as CategoriaComportamento, label })
);

export const ORIGEM_OPTIONS = Object.entries(ORIGEM_LABEL).map(
  ([value, label]) => ({ value: value as OrigemOfensa, label })
);

export const CIPA_AVISO_SIGILO =
  "Este relato é 100% anônimo e protegido. O objetivo desta coleta não é discriminatório e visa exclusivamente mapear riscos no ambiente para ações preventivas da CIPA+A.";

export const CIPA_ALERTA_LEGAL =
  "ATENÇÃO LEGAL: Em casos de suspeita ou confirmação de adoecimento, episódios de violência, assédio ou tentativas de suicídio relacionados ao contexto laboral, é obrigatória a notificação no SINAN (Sistema de Informação de Agravos de Notificação) e a emissão imediata da CAT (Comunicação de Acidente do Trabalho) junto à Previdência Social.";
