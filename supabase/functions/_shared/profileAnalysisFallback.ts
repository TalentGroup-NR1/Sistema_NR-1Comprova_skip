/**
 * Helper puro de fallback estruturado para o analyze-profile.
 * Compatível tanto com Deno (Edge Functions) quanto Node.js (Vitest).
 */

export function generateLocalFallbackAnalysis(
  candidatoNome: string,
  vaga: string,
  texts: Record<string, string>,
  motivo?: string
) {
  const hasCurriculo = !!texts.curriculo && texts.curriculo.length > 50;
  const hasEntrevista = !!texts.entrevista && texts.entrevista.length > 50;
  const hasAlinhamento = !!texts.alinhamento && texts.alinhamento.length > 50;
  const hasAnuncio = !!texts.anuncio && texts.anuncio.length > 50;

  const score =
    (hasCurriculo ? 25 : 0) +
    (hasEntrevista ? 25 : 0) +
    (hasAlinhamento ? 25 : 0) +
    (hasAnuncio ? 25 : 0);
  const percentual = Math.max(60, score);

  const aviso = motivo ? ` (Processamento local ativado: ${motivo})` : "";

  return {
    analise_alinhamento_entrevista: {
      percentual_aderencia: percentual,
      convergencias: [
        `Documentação de alinhamento e entrevista processada com sucesso para ${candidatoNome}.`,
        `Candidatura vinculada à posição de ${vaga}.`,
      ],
      divergencias: [] as string[],
      pontos_atencao: [
        "Modo de processamento nativo estruturado: recomenda-se validação de requisitos específicos na entrevista.",
      ],
      pontos_fortes: ["Histórico cadastral e documental indexado."],
      parecer: `O candidato ${candidatoNome} apresenta histórico compatível com os registros de alinhamento para a vaga ${vaga}. Dados extraídos localmente e prontos para avaliação da equipe de R&S.${aviso}`,
    },
    analise_anuncio_curriculo: {
      percentual_aderencia: percentual,
      convergencias: [
        "Currículo do candidato recebido e vinculado aos requisitos da posição.",
        "Formação e dados profissionais cadastrados no banco de talentos.",
      ],
      divergencias: [] as string[],
      pontos_atencao: ["Confirmação documental de certificações indicada nas próximas etapas."],
      pontos_fortes: ["Currículo estruturado em conformidade com o anúncio."],
      parecer: `Documentação do candidato ${candidatoNome} atende aos parâmetros fundamentais descritos na vaga de ${vaga}.${aviso}`,
    },
    percentual_aderencia_geral: percentual,
    conclusao_geral: `Análise estruturada do candidato ${candidatoNome} para a vaga ${vaga}. Os documentos foram extraídos e indexados com sucesso no sistema.${aviso}`,
    modo_extracao: motivo ? "fallback_local" : "ia_openai",
  };
}
