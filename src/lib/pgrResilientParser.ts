/**
 * Parser resiliente para extração de PGR via IA (Gemini).
 * Implementa 3 camadas de recuperação para garantir zero perda de dados:
 * 1. Sanitização prévia de JSON (markdown, trailing commas, quebras de linha);
 * 2. Reparo estrutural de JSON truncado (fechamento de strings, chaves e colchetes desbalanceados);
 * 3. Fallback por varredura regex de blocos de risco e plano de ação.
 */

export interface PgrDadosEmpresa {
  nome_empresa?: string | null;
  cnpj?: string | null;
  responsavel_tecnico?: string | null;
  cargo_responsavel?: string | null;
  registro_profissional?: string | null;
  data_elaboracao?: string | null;
  validade?: string | null;
}

export interface PgrRiscoItem {
  perigo?: string;
  categoria?: string;
  descricao?: string | null;
  grupo_exposto?: string | null;
  probabilidade?: number | null;
  severidade?: number | null;
  nivel?: number | null;
  classificacao?: string | null;
  escala_matriz?: string | null;
  medidas_existentes?: string | null;
  fonte?: string | null;
  confianca?: number | null;
  [key: string]: unknown;
}

export interface PgrAcaoItem {
  acao?: string;
  prazo?: string | null;
  responsavel?: string | null;
  status?: string | null;
  por_que?: string | null;
  onde?: string | null;
  como?: string | null;
  custo_estimado?: number | null;
  [key: string]: unknown;
}

export interface PgrExtracaoParsed {
  dados_empresa: PgrDadosEmpresa;
  riscos: PgrRiscoItem[];
  plano_acao: PgrAcaoItem[];
  isParcial: boolean;
  camadaUtilizada: 1 | 2 | 3;
  aviso?: string;
}

/**
 * Camada 1: Limpeza e normalização do texto JSON bruto
 */
export function sanitizeJsonString(raw: string): string {
  if (!raw || typeof raw !== "string") return "{}";
  
  let s = raw.trim();
  // Remove markdown fences
  s = s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  s = s.replace(/\s*```$/i, "");
  s = s.trim();

  // Remove caracteres de controle ASCII que invalidam o JSON (exceto \t, \r, \n)
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  // Remove trailing commas antes de fechamento de objeto ou array
  s = s.replace(/,\s*([}\]])/g, "$1");

  return s;
}

/**
 * Camada 2: Reparo estrutural de JSON truncado (por MAX_TOKENS ou corte de rede).
 * Percorre o fluxo de caracteres rastreando delimitadores abertos e fecha-os adequadamente.
 */
export function repairTruncatedJson(raw: string): string {
  let s = sanitizeJsonString(raw);
  if (!s) return "{}";

  // Tenta parse direto primeiro
  try {
    JSON.parse(s);
    return s;
  } catch {
    // Prossegue para reparo
  }

  let inString = false;
  let isEscaped = false;
  const stack: ("{" | "[")[] = [];

  for (let i = 0; i < s.length; i++) {
    const char = s[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      stack.push(char);
    } else if (char === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") {
        stack.pop();
      }
    } else if (char === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") {
        stack.pop();
      }
    }
  }

  // 1. Se terminou no meio de uma string, fecha as aspas
  if (inString) {
    s += '"';
  }

  // 2. Limpa caracteres órfãos no final antes de fechar containers (ex.: vírgula ou dois-pontos)
  s = s.trimEnd();
  
  // Se terminou em ':' (ex: "campo": ), preenche com null
  if (s.endsWith(":")) {
    s += " null";
  }
  
  // Remove vírgula pendente no final (ex: {"a": 1, )
  if (s.endsWith(",")) {
    s = s.slice(0, -1).trimEnd();
  }

  // 3. Desempilha e fecha os containers na ordem inversa
  while (stack.length > 0) {
    const openToken = stack.pop();
    if (openToken === "{") {
      // Se terminou com uma propriedade incompleta que não tem valor, ex: {"campo"
      // Remove trailing commas se houver
      s = s.replace(/,\s*$/, "");
      s += "}";
    } else if (openToken === "[") {
      s = s.replace(/,\s*$/, "");
      s += "]";
    }
  }

  // Remove qualquer trailing comma que possa ter ficado
  s = s.replace(/,\s*([}\]])/g, "$1");

  return s;
}

/**
 * Camada 3: Fallback de extração via Regex de blocos de riscos e ações individuais.
 * Útil quando a estrutura raiz do documento ficou corrompida.
 */
export function fallbackExtractObjects(raw: string): {
  dados_empresa: PgrDadosEmpresa;
  riscos: PgrRiscoItem[];
  plano_acao: PgrAcaoItem[];
} {
  const riscos: PgrRiscoItem[] = [];
  const plano_acao: PgrAcaoItem[] = [];
  const dados_empresa: PgrDadosEmpresa = {};

  if (!raw || typeof raw !== "string") {
    return { dados_empresa, riscos, plano_acao };
  }

  // Tenta extrair dados da empresa
  const nomeMatch = raw.match(/"nome(?:_empresa)?"\s*:\s*"([^"]+)"/i);
  if (nomeMatch) dados_empresa.nome_empresa = nomeMatch[1];
  const cnpjMatch = raw.match(/"cnpj"\s*:\s*"([^"]+)"/i);
  if (cnpjMatch) dados_empresa.cnpj = cnpjMatch[1];

  // Extração de blocos de risco: procura por objetos contendo "perigo" ou "categoria"
  const riscoRegex = /\{[^{}]*"(?:perigo|categoria)"\s*:[^{}]*\}/gi;
  let match: RegExpExecArray | null;
  while ((match = riscoRegex.exec(raw)) !== null) {
    try {
      const obj = JSON.parse(sanitizeJsonString(match[0]));
      if (obj && (obj.perigo || obj.categoria || obj.descricao)) {
        riscos.push(obj);
      }
    } catch {
      try {
        const repaired = repairTruncatedJson(match[0]);
        const obj = JSON.parse(repaired);
        if (obj && (obj.perigo || obj.categoria || obj.descricao)) {
          riscos.push(obj);
        }
      } catch {
        // Ignora
      }
    }
  }

  // Extração de blocos de plano de ação: procura por objetos contendo "acao"
  const acaoRegex = /\{[^{}]*"acao"\s*:[^{}]*\}/gi;
  while ((match = acaoRegex.exec(raw)) !== null) {
    try {
      const obj = JSON.parse(sanitizeJsonString(match[0]));
      if (obj && (obj.acao || obj.medida)) {
        plano_acao.push(obj);
      }
    } catch {
      try {
        const repaired = repairTruncatedJson(match[0]);
        const obj = JSON.parse(repaired);
        if (obj && (obj.acao || obj.medida)) {
          plano_acao.push(obj);
        }
      } catch {
        // Ignora
      }
    }
  }

  return { dados_empresa, riscos, plano_acao };
}

/**
 * Consolida e deduplica riscos e plano de ação.
 */
export function consolidateAndDeduplicate(
  riscos: PgrRiscoItem[],
  plano_acao: PgrAcaoItem[]
): { riscos: PgrRiscoItem[]; plano_acao: PgrAcaoItem[] } {
  const riscosDeduplicados: PgrRiscoItem[] = [];
  const riscosVistos = new Set<string>();

  for (const r of riscos || []) {
    const nome = (r.perigo || (r as any).nome || "").trim().toLowerCase();
    const cat = (r.categoria || "outros").trim().toLowerCase();
    if (!nome && !r.descricao) continue;

    const key = `${cat}|${nome}`;
    if (!riscosVistos.has(key)) {
      riscosVistos.add(key);
      riscosDeduplicados.push(r);
    }
  }

  const planoDeduplicado: PgrAcaoItem[] = [];
  const acoesVistas = new Set<string>();

  for (const a of plano_acao || []) {
    const medida = (a.acao || (a as any).medida || "").trim().toLowerCase();
    if (!medida) continue;

    if (!acoesVistas.has(medida)) {
      acoesVistas.add(medida);
      planoDeduplicado.push(a);
    }
  }

  return { riscos: riscosDeduplicados, plano_acao: planoDeduplicado };
}

/**
 * Ponto de entrada principal: processa a resposta bruta do Gemini com tolerância a truncamento.
 */
export function parsePgrGeminiResponse(
  rawText: string,
  finishReason?: string
): PgrExtracaoParsed {
  const isMaxTokens = finishReason === "MAX_TOKENS";
  let camadaUtilizada: 1 | 2 | 3 = 1;
  let parsedObj: any = null;

  // Camada 1: Sanitização prévia simples
  const sanitized = sanitizeJsonString(rawText);
  try {
    parsedObj = JSON.parse(sanitized);
    camadaUtilizada = 1;
  } catch {
    // Camada 2: Reparo estrutural de JSON truncado
    try {
      const repaired = repairTruncatedJson(rawText);
      parsedObj = JSON.parse(repaired);
      camadaUtilizada = 2;
    } catch {
      // Camada 3: Fallback por regex
      const extracted = fallbackExtractObjects(rawText);
      parsedObj = extracted;
      camadaUtilizada = 3;
    }
  }

  let dadosEmpresa: PgrDadosEmpresa = parsedObj?.dados_empresa || {};
  let riscosRaw: PgrRiscoItem[] = Array.isArray(parsedObj?.riscos) ? parsedObj.riscos : [];
  let planoRaw: PgrAcaoItem[] = Array.isArray(parsedObj?.plano_acao) ? parsedObj.plano_acao : [];

  // Se por algum motivo riscos ou plano vierem vazios na Camada 2, tenta enriquecer com Camada 3
  if (riscosRaw.length === 0 && planoRaw.length === 0 && rawText.length > 200) {
    const fallback = fallbackExtractObjects(rawText);
    if (fallback.riscos.length > 0 || fallback.plano_acao.length > 0) {
      riscosRaw = fallback.riscos;
      planoRaw = fallback.plano_acao;
      dadosEmpresa = { ...fallback.dados_empresa, ...dadosEmpresa };
      camadaUtilizada = 3;
    }
  }

  // Deduplicação
  const { riscos, plano_acao } = consolidateAndDeduplicate(riscosRaw, planoRaw);
  const isParcial = isMaxTokens || camadaUtilizada > 1;

  let aviso: string | undefined = undefined;
  if (isParcial && (riscos.length > 0 || plano_acao.length > 0)) {
    aviso = `Importação parcial: foram extraídos com sucesso ${riscos.length} risco(s) e ${plano_acao.length} ação(ões) do documento. Devido à extensão do arquivo, revise os itens e complete manualmente se necessário.`;
  }

  return {
    dados_empresa: dadosEmpresa,
    riscos,
    plano_acao,
    isParcial,
    camadaUtilizada,
    aviso,
  };
}
