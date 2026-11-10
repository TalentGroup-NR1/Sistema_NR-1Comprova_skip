export function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseCSV(text: string): { headers: string[]; rawHeaders: string[]; rows: string[][]; sep: string } {
  const cleanText = text.replace(/^\uFEFF/, "");
  const firstLine = cleanText.split(/\r?\n/, 1)[0] || "";

  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  let sep = ";";
  if (countTab > countSemicolon && countTab > countComma) {
    sep = "\t";
  } else if (countComma > countSemicolon) {
    sep = ",";
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rawHeaders = (lines[0] || "").split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map((h) => normalizeHeader(h));
  const rows = lines.slice(1).map((line) =>
    line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""))
  );
  return { headers, rawHeaders, rows, sep };
}

export const ALIASES_CPF = ["cpf", "documento", "cpf_colaborador"];
export const ALIASES_NOME = ["nome", "full_name", "nome_completo", "colaborador", "nome_do_colaborador"];
export const ALIASES_PER_INI = [
  "periodo_aquisitivo_inicio",
  "periodo_inicio",
  "inicio_periodo_aquisitivo",
  "inicio_aquisitivo",
  "data_inicio_aquisitivo",
  "periodo_aquisitivo_ini",
];
export const ALIASES_PER_FIM = [
  "periodo_aquisitivo_fim",
  "periodo_fim",
  "fim_periodo_aquisitivo",
  "fim_aquisitivo",
  "data_fim_aquisitivo",
  "periodo_aquisitivo_termino",
];
export const ALIASES_INI_GOZO = [
  "data_inicio_gozo",
  "inicio",
  "data_inicio",
  "inicio_gozo",
  "data_inicio_ferias",
  "inicio_das_ferias",
  "data_inicial",
];
export const ALIASES_FIM_GOZO = [
  "data_fim_gozo",
  "fim",
  "data_fim",
  "fim_gozo",
  "data_fim_ferias",
  "fim_das_ferias",
  "data_final",
];
export const ALIASES_PAGAMENTO = [
  "data_pagamento",
  "pagamento",
  "data_do_pagamento",
  "dt_pagamento",
];

export const ALIASES_ABONO = [
  "dias_abono",
  "abono",
  "abono_pecuniario",
  "dias_de_abono",
  "abono_pecuniario_dias",
  "dias_abono_pecuniario",
  "dias_vendidos",
  "abono_dias",
  "qtd_abono",
  "quantidade_abono",
  "dias_de_abono_pecuniario",
];

export const ALIASES_DESCANSO = [
  "dias_descanso",
  "dias",
  "dias_gozados",
  "dias_de_descanso",
  "dias_ferias",
  "dias_de_ferias",
  "qtd_dias",
  "quantidade_dias",
  "dias_de_gozo",
  "dias_gozo",
  "total_dias",
  "dias_usufruidos",
  "dias_de_descanso_gozados",
];

export function findColumnIndexWithFallback(
  headers: string[],
  exactAliases: string[],
  fallbackPredicate?: (h: string) => boolean
): { index: number; isFallback: boolean } {
  const exact = headers.findIndex((h) => exactAliases.includes(h));
  if (exact >= 0) {
    return { index: exact, isFallback: false };
  }
  if (fallbackPredicate) {
    const fallback = headers.findIndex(fallbackPredicate);
    if (fallback >= 0) {
      return { index: fallback, isFallback: true };
    }
  }
  return { index: -1, isFallback: false };
}

export function parseDias(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.trim().replace(",", ".");
  const match = cleaned.match(/^-?\d+(\.\d+)?/);
  if (match) {
    const n = Math.round(Number(match[0]));
    return isNaN(n) || n < 0 ? 0 : n;
  }
  return 0;
}

export function isDiasValido(val: string | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "0") return true;
  const cleaned = trimmed.replace(",", ".");
  return /^-?\d+(\.\d+)?/.test(cleaned);
}

export function isFormatoData(val: string | undefined): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (trimmed.includes("/")) {
    return /^\d{1,4}\/\d{1,2}(\/\d{2,4})?$/.test(trimmed);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{1,2}-\d{1,2}-\d{2,4}$/.test(trimmed);
}

export function isDescansoFallbackMatch(h: string): boolean {
  const hasDescansoOrGozo = h.includes("descanso") || h.includes("gozo");
  const hasQuantityIndicator =
    h.includes("dias") ||
    h.includes("qtd") ||
    h.includes("quantidade") ||
    h.includes("total");

  if (!hasDescansoOrGozo || !hasQuantityIndicator) {
    return false;
  }

  const excluded = [
    "inicio",
    "fim",
    "data",
    "periodo",
    "referencia",
    "ref",
    "ano",
    "mes",
    "competencia",
    "aquisitivo",
  ];

  return !excluded.some((ex) => h.includes(ex));
}

export interface DiagnosticoCSV {
  separador: string;
  rawHeaders: string[];
  headers: string[];
  reconhecidas: {
    cpf?: { index: number; header: string };
    nome?: { index: number; header: string };
    periodoInicio?: { index: number; header: string };
    periodoFim?: { index: number; header: string };
    inicioGozo?: { index: number; header: string };
    fimGozo?: { index: number; header: string };
    descanso?: { index: number; isFallback: boolean; header: string };
    abono?: { index: number; isFallback: boolean; header: string };
    pagamento?: { index: number; header: string };
  };
  colunasIgnoradas: { index: number; rawHeader: string; header: string }[];
  valido: boolean;
  motivoInvalido?: string;
}

export function diagnosticarCSV(text: string): DiagnosticoCSV {
  const { headers, rawHeaders, sep } = parseCSV(text);
  const findExact = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));

  const idxCpf = findExact(ALIASES_CPF);
  const idxNome = findExact(ALIASES_NOME);
  const idxPerIni = findExact(ALIASES_PER_INI);
  const idxPerFim = findExact(ALIASES_PER_FIM);
  const idxIni = findExact(ALIASES_INI_GOZO);
  const idxFim = findExact(ALIASES_FIM_GOZO);
  const idxPag = findExact(ALIASES_PAGAMENTO);
  const diasMatch = findColumnIndexWithFallback(headers, ALIASES_DESCANSO, isDescansoFallbackMatch);
  const abonoMatch = findColumnIndexWithFallback(headers, ALIASES_ABONO, (h) => h.includes("abono"));

  const reconhecidas: DiagnosticoCSV["reconhecidas"] = {};
  const usedIndices = new Set<number>();

  if (idxCpf >= 0) {
    reconhecidas.cpf = { index: idxCpf, header: rawHeaders[idxCpf] };
    usedIndices.add(idxCpf);
  }
  if (idxNome >= 0) {
    reconhecidas.nome = { index: idxNome, header: rawHeaders[idxNome] };
    usedIndices.add(idxNome);
  }
  if (idxPerIni >= 0) {
    reconhecidas.periodoInicio = { index: idxPerIni, header: rawHeaders[idxPerIni] };
    usedIndices.add(idxPerIni);
  }
  if (idxPerFim >= 0) {
    reconhecidas.periodoFim = { index: idxPerFim, header: rawHeaders[idxPerFim] };
    usedIndices.add(idxPerFim);
  }
  if (idxIni >= 0) {
    reconhecidas.inicioGozo = { index: idxIni, header: rawHeaders[idxIni] };
    usedIndices.add(idxIni);
  }
  if (idxFim >= 0) {
    reconhecidas.fimGozo = { index: idxFim, header: rawHeaders[idxFim] };
    usedIndices.add(idxFim);
  }
  if (idxPag >= 0) {
    reconhecidas.pagamento = { index: idxPag, header: rawHeaders[idxPag] };
    usedIndices.add(idxPag);
  }
  if (diasMatch.index >= 0) {
    reconhecidas.descanso = {
      index: diasMatch.index,
      isFallback: diasMatch.isFallback,
      header: rawHeaders[diasMatch.index],
    };
    usedIndices.add(diasMatch.index);
  }
  if (abonoMatch.index >= 0) {
    reconhecidas.abono = {
      index: abonoMatch.index,
      isFallback: abonoMatch.isFallback,
      header: rawHeaders[abonoMatch.index],
    };
    usedIndices.add(abonoMatch.index);
  }

  const colunasIgnoradas = headers
    .map((h, i) => ({ index: i, rawHeader: rawHeaders[i], header: h }))
    .filter((c) => !usedIndices.has(c.index));

  let valido = true;
  let motivoInvalido: string | undefined;

  if (idxPerIni < 0 || idxPerFim < 0 || idxIni < 0 || idxFim < 0 || (idxCpf < 0 && idxNome < 0)) {
    valido = false;
    motivoInvalido = "Colunas obrigatórias ausentes (cpf ou nome, periodo_inicio, periodo_fim, inicio_gozo, fim_gozo)";
  }

  return {
    separador: sep,
    rawHeaders,
    headers,
    reconhecidas,
    colunasIgnoradas,
    valido,
    motivoInvalido,
  };
}

export interface ExistingColaboradorRecord {
  id: string;
  cpf: string | null;
  full_name: string | null;
}

export interface ExistingPeriodoRecord {
  id: string;
  colaborador_id: string;
  data_inicio_aquisitivo: string;
}

export interface ExistingGozoRecord {
  id: string;
  colaborador_id: string;
  periodo_aquisitivo_id: string;
  data_inicio_gozo: string;
  data_fim_gozo: string;
  observacoes: string | null;
}

export interface DryRunItem {
  colaboradorNome: string;
  cpf?: string;
  periodo: string;
  gozo: string;
  acao: "UPDATE" | "INSERT";
  hasCsvCollision: boolean;
}

export interface DryRunSummary {
  linhasUpdate: number;
  linhasInsert: number;
  hasBlockingCollision: boolean;
  collisions: DryRunItem[];
  inserts: DryRunItem[];
}

export function computeDryRunReport(
  parsedRows: {
    cpf?: string;
    nome?: string;
    periodo_aquisitivo_inicio: string;
    periodo_aquisitivo_fim: string;
    data_inicio_gozo: string;
    data_fim_gozo: string;
    rawInicioPer: string;
    rawFimPer: string;
    rawIniGozo: string;
    rawFimGozo: string;
    error?: string;
    dryRunAction?: "UPDATE" | "INSERT";
  }[],
  colabs: ExistingColaboradorRecord[],
  periodos: ExistingPeriodoRecord[],
  gozos: ExistingGozoRecord[]
): DryRunSummary {
  const summary: DryRunSummary = {
    linhasUpdate: 0,
    linhasInsert: 0,
    hasBlockingCollision: false,
    collisions: [],
    inserts: [],
  };

  const byCpf = new Map<string, { id: string; name: string }>();
  const byName = new Map<string, { id: string; name: string }>();
  colabs.forEach((c) => {
    if (c.cpf) byCpf.set(c.cpf.replace(/\D/g, ""), { id: c.id, name: c.full_name || "" });
    if (c.full_name) byName.set(c.full_name.trim().toLowerCase(), { id: c.id, name: c.full_name });
  });

  const periodosMap = new Map<string, { id: string; data_inicio_aquisitivo: string }[]>();
  periodos.forEach((p) => {
    if (!periodosMap.has(p.colaborador_id)) periodosMap.set(p.colaborador_id, []);
    periodosMap.get(p.colaborador_id)!.push(p);
  });

  const existingGozoSet = new Set<string>();
  const periodosComCsvImportado = new Set<string>();

  gozos.forEach((g) => {
    existingGozoSet.add(`${g.colaborador_id}|${g.periodo_aquisitivo_id}|${g.data_inicio_gozo}|${g.data_fim_gozo}`);
    if (g.observacoes && g.observacoes.startsWith("Importado (CSV)")) {
      periodosComCsvImportado.add(`${g.colaborador_id}|${g.periodo_aquisitivo_id}`);
    }
  });

  parsedRows.forEach((r) => {
    if (r.error) return;
    const colab = (r.cpf ? byCpf.get(r.cpf) : undefined) || (r.nome ? byName.get(r.nome.trim().toLowerCase()) : undefined);
    if (!colab) return;

    const colabPeriodos = periodosMap.get(colab.id) || [];
    const per = colabPeriodos.find((p) => p.data_inicio_aquisitivo === r.periodo_aquisitivo_inicio);

    const gozoKey = per ? `${colab.id}|${per.id}|${r.data_inicio_gozo}|${r.data_fim_gozo}` : null;
    const isExisting = gozoKey ? existingGozoSet.has(gozoKey) : false;

    if (isExisting) {
      summary.linhasUpdate++;
      r.dryRunAction = "UPDATE";
    } else {
      summary.linhasInsert++;
      r.dryRunAction = "INSERT";
      const colabNome = colab.name || r.nome || r.cpf || "Colaborador";
      const item: DryRunItem = {
        colaboradorNome: colabNome,
        cpf: r.cpf,
        periodo: `${r.rawInicioPer} – ${r.rawFimPer}`,
        gozo: `${r.rawIniGozo} – ${r.rawFimGozo}`,
        acao: "INSERT",
        hasCsvCollision: false,
      };

      if (per && periodosComCsvImportado.has(`${colab.id}|${per.id}`)) {
        item.hasCsvCollision = true;
        summary.hasBlockingCollision = true;
        summary.collisions.push(item);
      }
      summary.inserts.push(item);
    }
  });

  return summary;
}

