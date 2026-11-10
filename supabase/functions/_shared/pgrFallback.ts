/**
 * Fallback local: estrutura mínima quando a IA não está disponível.
 * Extração local e conservadora (somente padrões inequivocamente identificáveis).
 */
export function fallbackLocalAnalise(texto: string, motivo: string): Record<string, unknown> {
  const linhas = texto.split("\n").filter((l) => l.trim().length > 0);

  // 1. Extração de CNPJ (Muito seguro: formato exato e improvável de falso-positivo no contexto de um documento)
  const matchCnpj = texto.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/);
  const cnpj = matchCnpj ? matchCnpj[0] : null;

  // 2. Extração de Empresa (Seguro: Ancorado em "Razão Social:" ou "Empregador:" exigindo uma forma jurídica típica)
  const matchEmpresa = texto.match(/(?:Razão Social|Empregador)\s*:\s*([A-Za-z0-9\s.\-&]+?(?:LTDA\.?|S\.?A\.?|ME|EPP|EIRELI))/i);
  const nome = matchEmpresa ? matchEmpresa[1].trim() : null;

  // 3. Extração de Data (Seguro: Ancorado em rótulos explícitos com formato de data exato)
  const matchDataElaboracao = texto.match(/(?:Data de [Ee]labora[cç][aã]o|Elaborado em)\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
  const data_elaboracao = matchDataElaboracao ? matchDataElaboracao[1] : null;

  const matchValidade = texto.match(/(?:Validade|Válido até)\s*:\s*(\d{2}\/\d{2}\/\d{4})/);
  const validade = matchValidade ? matchValidade[1] : null;

  // Responsável Técnico omitido: Nomes de pessoas e assinaturas em PDFs variam excessivamente
  // e frequentemente causam vazamento de texto (ex: captura a próxima seção). Melhor manter null.

  return {
    dados_empresa: {
      nome,
      cnpj,
      responsavel_tecnico: null,
      cargo_responsavel: null,
      data_elaboracao,
      validade,
    },
    riscos: [],
    plano_acao: [],
    modo_extracao: "fallback_local",
    motivo_fallback: motivo,
    linhas_extraidas: linhas.length,
    aviso: "O OCR com IA não estava disponível ou falhou por timeout. O texto foi extraído localmente. Revise e preencha os dados manualmente antes de confirmar.",
  };
}
