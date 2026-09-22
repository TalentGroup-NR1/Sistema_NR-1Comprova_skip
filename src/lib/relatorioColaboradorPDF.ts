import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getShareBaseUrl } from "@/lib/appUrl";
import {
  sha256Hex,
  loadImage,
  fitImage,
  generateVerificationQRCode,
  type LoadedImage,
} from "./pdfHelpers";
import { EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import type {
  EmployeeReportData,
  ReportPulso,
  ReportAcompanhamento,
} from "@/components/cuidar-mais/relatorio/types";
import {
  formatReportDate,
  formatReportDateTime,
} from "@/components/cuidar-mais/relatorio/normalizeReportData";

export interface RelatorioColaboradorEmpresa {
  name?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
}

export interface RelatorioColaboradorEmitente {
  nome: string;
  cargo?: string | null;
  email?: string | null;
}

export interface GerarRelatorioColaboradorPDFParams {
  data: EmployeeReportData;
  empresa: RelatorioColaboradorEmpresa;
  emitente: RelatorioColaboradorEmitente;
  verificacaoUrlBase?: string;
}

// Paleta institucional NR1-Pronto (alinhada a relatorioEvidenciaPDF.ts)
export const PRIMARY: [number, number, number] = [139, 0, 0]; // vermelho corporativo #8B0000
export const DARK: [number, number, number] = [31, 41, 55]; // cinza escuro #1F2937
export const ACCENT: [number, number, number] = [197, 165, 114]; // dourado #C5A572
export const MUTED: [number, number, number] = [110, 110, 120];
export const SUCCESS: [number, number, number] = [22, 130, 70];
export const WARNING: [number, number, number] = [180, 90, 20];
export const ZEBRA: [number, number, number] = [248, 249, 251];

/**
 * Remove emojis e caracteres fora do WinAnsi (helvetica do jsPDF não renderiza,
 * resultando em glifos lixo ou quebras de largura inesperadas).
 */
export function sanitizePdfText(input?: string | null): string {
  if (input == null) return "";
  let s = String(input);
  // Remove surrogate pairs (emojis fora do BMP)
  s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");
  // Remove pictográficos/símbolos no BMP fora do WinAnsi
  s = s.replace(/[\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF\uFE0F\u200D]/g, "");
  // Substitui qualquer caractere fora do Latin-1 (>0xFF) por espaço
  s = s.replace(/[^\x00-\xFF]/g, " ");
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Sanitiza o nome do colaborador para compor nomes de arquivos seguros.
 * Remove acentos/diacríticos preservando as letras e substitui espaços por underscores.
 * Se o resultado for vazio ou inválido, retorna "Colaborador".
 */
export function sanitizeFileName(input?: string | null): string {
  if (!input) return "Colaborador";
  const normalized = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safe = normalized
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 45);

  return safe.length > 0 ? safe : "Colaborador";
}

/**
 * Formata linha descritiva do emitente para o cabeçalho/box do dossiê.
 * Oculta rigorosamente o e-mail (PII) conforme conformidade NR-1 e LGPD.
 */
export function formatEmitenteLinha(
  emitente?: RelatorioColaboradorEmitente | null
): string {
  if (!emitente) {
    return "Administrador — Recursos Humanos / SST";
  }
  const nome = sanitizePdfText(emitente.nome || "Administrador");
  const cargo = emitente.cargo ? sanitizePdfText(emitente.cargo) : null;
  return cargo ? `${nome} — ${cargo}` : nome;
}

/**
 * Constrói o nome final seguro do arquivo PDF do dossiê probatório.
 */
export function buildDossieFileName(
  colabName?: string | null,
  date: Date = new Date()
): string {
  const colabNomeSafe = sanitizeFileName(colabName);
  return `Dossie_CuidarMais_${colabNomeSafe}_${format(date, "yyyyMMdd_HHmm")}.pdf`;
}

/**
 * Monta descrição legível do período filtrado
 */
export function buildPeriodoDescricao(
  dataInicio?: string | null,
  dataFim?: string | null
): string {
  if (dataInicio && dataFim) {
    return `${formatReportDate(dataInicio)} até ${formatReportDate(dataFim)}`;
  }
  if (dataInicio) {
    return `A partir de ${formatReportDate(dataInicio)}`;
  }
  if (dataFim) {
    return `Até ${formatReportDate(dataFim)}`;
  }
  return "Sem filtro de período (Histórico Completo)";
}

/**
 * Constrói payload determinístico para cômputo do hash SHA-256 de integridade
 */
export function buildDossieHashPayload(
  data: EmployeeReportData,
  docId: string
): string {
  const colab = data.colaborador;
  const colabId = colab?.id || "SEM_ID";
  const cpf = colab?.cpf || "SEM_CPF";
  const pulsosCount = data.pulsos?.length || 0;
  const acompCount = data.acompanhamentos?.length || 0;
  const regras = sanitizePdfText(data.regras_aplicadas || "");

  return `NR1_DOSSIE|${docId}|${colabId}|${cpf}|${pulsosCount}|${acompCount}|${regras}`;
}

/**
 * Formata linha da tabela de pulsos para o PDF
 */
export function formatPulsoRowForPdf(pulso: ReportPulso): string[] {
  const dt = formatReportDateTime(pulso.data_hora);
  const origem = pulso.origem === "campanha" ? "Campanha" : "Pulso Direto";
  const campanha = sanitizePdfText(pulso.campanha || "—");
  const esfera = sanitizePdfText(pulso.esfera || "—");
  const pergunta = sanitizePdfText(pulso.pergunta || "—");

  let notaResp = "";
  if (pulso.score_numeric !== null && !isNaN(pulso.score_numeric)) {
    const rounded = Math.round(pulso.score_numeric);
    const emojiMatch = EMOJI_SCALE.find((e) => e.score === rounded);
    const label = emojiMatch ? ` (${emojiMatch.label})` : "";
    notaResp = `Nota ${pulso.score_numeric}/5${label}`;
  } else {
    notaResp = sanitizePdfText(pulso.resposta || "—");
  }

  const comentario = sanitizePdfText(pulso.comentario || "—");

  return [dt, origem, campanha, esfera, pergunta, notaResp, comentario];
}

/**
 * Verifica se um acompanhamento foi criado fora do intervalo de datas selecionado
 */
export function isAcompanhamentoForaDoPeriodo(
  criadoEm: string | null | undefined,
  dataInicio?: string | null,
  dataFim?: string | null
): boolean {
  if (!criadoEm || (!dataInicio && !dataFim)) return false;
  const dateOnly = criadoEm.slice(0, 10);
  if (dataInicio && dateOnly < dataInicio) return true;
  if (dataFim && dateOnly > dataFim) return true;
  return false;
}

/**
 * Formata linha da tabela de acompanhamentos para o PDF
 */
export function formatAcompanhamentoRowForPdf(
  acomp: ReportAcompanhamento,
  dataInicio?: string | null,
  dataFim?: string | null
): string[] {
  const isFora = isAcompanhamentoForaDoPeriodo(acomp.criado_em, dataInicio, dataFim);
  const dtCriado = formatReportDateTime(acomp.criado_em);
  const statusBase = sanitizePdfText((acomp.status || "novo").toUpperCase());
  const statusLabel = isFora ? `${statusBase} (FORA DO PERÍODO)` : statusBase;
  const responsavel = sanitizePdfText(acomp.responsavel_nome || "RH");

  let objAcoes = sanitizePdfText(acomp.objetivo || "Sem objetivo informado");
  if (Array.isArray(acomp.acoes) && acomp.acoes.length > 0) {
    const acoesStr = acomp.acoes
      .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
      .join("; ");
    objAcoes += `\n[Ações]: ${sanitizePdfText(acoesStr)}`;
  }

  let anotResultado = "";
  if (acomp.anotacoes) {
    anotResultado += `Anotações: ${sanitizePdfText(acomp.anotacoes)}\n`;
  }
  if (acomp.resultado) {
    anotResultado += `Resultado: ${sanitizePdfText(acomp.resultado)}`;
  }
  if (!anotResultado) anotResultado = "—";

  const dtConc = acomp.concluido_em
    ? `Concluído: ${formatReportDateTime(acomp.concluido_em)}`
    : "";
  const dtProx = acomp.proximo_contato_em
    ? `Próx. contato: ${formatReportDateTime(acomp.proximo_contato_em)}`
    : "";
  const atualizadoPor = acomp.updated_by_nome
    ? `Atualizado por: ${sanitizePdfText(acomp.updated_by_nome)}`
    : "";

  const prazosArr = [dtConc, dtProx, atualizadoPor].filter(Boolean);
  const prazos = prazosArr.length > 0 ? prazosArr.join("\n") : "—";

  return [dtCriado, statusLabel, responsavel, objAcoes, anotResultado, prazos];
}

/**
 * Desenha cabeçalho superior nas páginas do PDF
 */
function drawHeader(
  doc: jsPDF,
  pageW: number,
  M: number,
  empresaName: string,
  empresaCnpj: string,
  docId: string,
  talentLogo?: LoadedImage | null
) {
  const HEADER_H = 40;
  // Faixa fina vermelha no topo
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 3, "F");

  // Logo institucional NR1-Pronto (esquerda)
  if (talentLogo) {
    const { w, h } = fitImage(talentLogo, 95, 25);
    try {
      doc.addImage(talentLogo.dataUrl, "PNG", M, 8 + (25 - h) / 2, w, h);
    } catch {
      /* ignore */
    }
  }

  // Empresa + CNPJ à direita
  const nomeLinha = empresaCnpj
    ? `${empresaName.toUpperCase()} — CNPJ ${empresaCnpj}`
    : empresaName.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  const nomeWrap = doc.splitTextToSize(nomeLinha, pageW - M * 2 - 110);
  doc.text(nomeWrap[0] || "—", pageW - M, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(docId, pageW - M, 30, { align: "right" });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(M, HEADER_H, pageW - M, HEADER_H);
}

/**
 * Desenha rodapé com data, hash e paginação
 */
function drawFooter(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  M: number,
  geradoEm: string,
  hashCurto: string,
  page: number,
  total: number
) {
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.5);
  doc.line(M, pageH - 45, pageW - M, pageH - 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Documento probatório gerado eletronicamente pela plataforma NR1-Pronto — ${geradoEm}`,
    M,
    pageH - 30
  );
  doc.text(`Hash de Integridade: ${hashCurto}…`, M, pageH - 18);
  doc.text(`Página ${page} de ${total}`, pageW - M, pageH - 18, { align: "right" });
}

/**
 * Gera e realiza download do Dossiê Probatório do Colaborador em PDF
 */
export async function gerarRelatorioColaboradorPDF(
  params: GerarRelatorioColaboradorPDFParams
): Promise<void> {
  const { data, verificacaoUrlBase } = params;
  const colab = data.colaborador;

  const empresa: RelatorioColaboradorEmpresa = {
    name: sanitizePdfText(params.empresa?.name || "Empresa"),
    cnpj: sanitizePdfText(params.empresa?.cnpj || "—"),
    logo_url: params.empresa?.logo_url,
  };

  const emitente: RelatorioColaboradorEmitente = {
    nome: sanitizePdfText(params.emitente?.nome || "Administrador"),
    cargo: params.emitente?.cargo ? sanitizePdfText(params.emitente.cargo) : (params.emitente ? null : "Recursos Humanos / SST"),
  };

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40;

  const now = new Date();
  const geradoEm = format(now, "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) + " (BRT)";
  const colabIdCurto = colab?.id ? colab.id.slice(0, 8).toUpperCase() : "DESCONHECIDO";
  const docId = `DOSSIE-${colabIdCurto}-${format(now, "yyyyMMddHHmmss")}`;

  const hashPayload = buildDossieHashPayload(data, docId);
  const hashConteudo = await sha256Hex(hashPayload);
  const hashCurto = hashConteudo.slice(0, 16).toUpperCase();

  // Tenta carregar logotipo institucional
  const talentLogo = await loadImage("/images/Logo_NR1_Transparente.png");

  // QR Code de verificação probatória
  const baseUrl = verificacaoUrlBase || getShareBaseUrl();
  const verificacaoPayload = `NR1-DOSSIE|${docId}|${hashCurto}|${baseUrl}/cuidar-mais?colaborador=${colab?.id || ""}`;
  const qrDataUrl: string | null = await generateVerificationQRCode(verificacaoPayload);

  const periodoTexto = buildPeriodoDescricao(
    data.filtro_aplicado?.data_inicio,
    data.filtro_aplicado?.data_fim
  );

  // ============================================================
  // PÁGINA 1 — CAPA / IDENTIFICAÇÃO PROBATÓRIA
  // ============================================================
  const HEADER_H = 50;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, HEADER_H, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, HEADER_H, pageW, 2, "F");

  // Logo institucional na barra do topo
  if (talentLogo) {
    const { w, h } = fitImage(talentLogo, 130, 30);
    try {
      doc.addImage(talentLogo.dataUrl, "PNG", M, (HEADER_H - h) / 2, w, h);
    } catch {
      /* ignore */
    }
  }

  // Nome da empresa e CNPJ na barra do topo
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const empNomeWrap = doc.splitTextToSize((empresa.name || "—").toUpperCase(), pageW / 2 - M);
  doc.text(empNomeWrap[0] || "—", pageW - M, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`CNPJ: ${empresa.cnpj || "—"}`, pageW - M, 36, { align: "right" });

  // Título do Relatório
  let curY = 88;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DOSSIÊ PROBATÓRIO INDIVIDUAL", pageW / 2, curY, { align: "center" });
  curY += 20;

  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text("MÓDULO CUIDAR+ — CONFORMIDADE NR-1 / FISCALIZAÇÃO DO TRABALHO", pageW / 2, curY, {
    align: "center",
  });
  curY += 28;

  // Box 1: Identificação do Documento e Emitente
  const idBoxY = curY;
  const idLabelW = 150;
  const idValueW = pageW - M * 2 - idLabelW - 16;
  const lineGap = 13;

  const linhasDoc: Array<[string, string]> = [
    ["Identificador:", docId],
    ["Emitido em:", geradoEm],
    ["Emitente:", formatEmitenteLinha(emitente)],
    ["Empresa / Unidade:", `${empresa.name || "—"} (CNPJ: ${empresa.cnpj || "—"})`],
    ["Período Abrangido:", periodoTexto],
    ["Hash SHA-256 (Integridade):", `${hashCurto}… (${hashConteudo.slice(0, 32)})`],
  ];

  let idContentH = 0;
  const wrappedDoc = linhasDoc.map(([k, v]) => {
    const wrapped = doc.splitTextToSize(v, idValueW);
    const h = Math.max(lineGap, wrapped.length * lineGap) + 3;
    idContentH += h;
    return { k, wrapped, h };
  });
  const idBoxH = idContentH + 34;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(215, 215, 225);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, idBoxY, pageW - M * 2, idBoxH, 5, 5, "FD");

  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("1. IDENTIFICAÇÃO DO DOCUMENTO E VALIDAÇÃO", M + 14, idBoxY + 18);

  let py = idBoxY + 34;
  wrappedDoc.forEach(({ k, wrapped, h }) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    doc.text(k, M + 14, py);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(wrapped, M + 14 + idLabelW, py);
    py += h;
  });

  curY = idBoxY + idBoxH + 16;

  // Box 2: Identificação do Colaborador (CPF estritamente mascarado)
  const colabBoxY = curY;
  const linhasColab: Array<[string, string]> = [
    ["Nome Completo:", sanitizePdfText(colab?.full_name || "Colaborador sem nome")],
    ["CPF (Mascarado):", sanitizePdfText(colab?.cpf || "Não informado")],
    ["Cargo / Função:", sanitizePdfText(colab?.cargo || "Não informado")],
    ["Departamento:", sanitizePdfText(colab?.departamento || "Não informado")],
    ["Data de Admissão:", formatReportDate(colab?.admissao)],
    ["Status Funcional:", sanitizePdfText((colab?.status || "Não informado").toUpperCase())],
  ];

  let colabContentH = 0;
  const wrappedColab = linhasColab.map(([k, v]) => {
    const wrapped = doc.splitTextToSize(v, idValueW);
    const h = Math.max(lineGap, wrapped.length * lineGap) + 3;
    colabContentH += h;
    return { k, wrapped, h };
  });
  const colabBoxH = colabContentH + 34;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 215, 225);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, colabBoxY, pageW - M * 2, colabBoxH, 5, 5, "FD");

  doc.setFontSize(9.5);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("2. IDENTIFICAÇÃO DO COLABORADOR", M + 14, colabBoxY + 18);

  let cy = colabBoxY + 34;
  wrappedColab.forEach(({ k, wrapped, h }) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    doc.text(k, M + 14, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(wrapped, M + 14 + idLabelW, cy);
    cy += h;
  });

  curY = colabBoxY + colabBoxH + 16;

  // Box 3: Resumo Quantitativo
  const totalPulsos = data.pulsos?.length || 0;
  const totalAcomp = data.acompanhamentos?.length || 0;
  const scoresValidos = (data.pulsos || [])
    .filter((p) => p.score_numeric !== null && !isNaN(p.score_numeric))
    .map((p) => p.score_numeric as number);
  const mediaHumor =
    scoresValidos.length > 0
      ? (scoresValidos.reduce((a, b) => a + b, 0) / scoresValidos.length).toFixed(1)
      : "—";

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(220, 220, 230);
  doc.roundedRect(M, curY, pageW - M * 2, 54, 5, 5, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("3. RESUMO PROBATÓRIO DO PERÍODO", M + 14, curY + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.setFontSize(8.5);
  const resumoTexto = `Total de Pulsos Respondidos: ${totalPulsos}  |  Média Geral de Humor: ${mediaHumor} / 5.0  |  Acompanhamentos Registrados: ${totalAcomp}`;
  doc.text(resumoTexto, M + 14, curY + 36);

  curY += 70;

  // Box 4: Finalidade Jurídica e Fiscal
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(9.5);
  doc.text("FINALIDADE E VALIDADE JURÍDICA", M, curY);
  curY += 12;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  const finalidadeJuridica =
    "O presente dossiê consolida os registros temporais de percepção psicossocial (pulsos) e ações institucionais " +
    "de apoio realizadas para o colaborador identificado, em conformidade com as diretrizes de gerenciamento de riscos " +
    "psicossociais previstas na Norma Regulamentadora nº 01 (NR-1) do Ministério do Trabalho e Emprego. " +
    "Possui finalidade estritamente probatória perante auditorias fiscais do trabalho e instrução processual trabalhista. " +
    "A autenticidade e inviolabilidade deste relatório são asseguradas pelo hash SHA-256 e pelo QR Code apostos ao documento.";
  doc.text(doc.splitTextToSize(finalidadeJuridica, pageW - M * 2), M, curY);

  // ============================================================
  // PÁGINA 2+: TABELA DE PULSOS REGISTRADOS
  // ============================================================
  doc.addPage();
  drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);

  let tableStartY = 60;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(11);
  doc.text("4. REGISTRO CRONOLÓGICO DE PULSOS", M, tableStartY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "Respostas registradas com identificação nominal (respostas anônimas excluídas por regra probatória).",
    M,
    tableStartY + 12
  );

  const pulsosRows = (data.pulsos || []).map(formatPulsoRowForPdf);

  if (pulsosRows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Nenhum pulso registrado para este colaborador no período selecionado.", M, tableStartY + 35);
  } else {
    autoTable(doc, {
      startY: tableStartY + 20,
      head: [["Data/Hora", "Origem", "Campanha", "Esfera", "Pergunta", "Resposta / Nota", "Comentário"]],
      body: pulsosRows,
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        valign: "top",
        lineColor: [225, 225, 230],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: PRIMARY,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { cellWidth: 70 }, // Data/Hora
        1: { cellWidth: 50 }, // Origem
        2: { cellWidth: 75 }, // Campanha
        3: { cellWidth: 45 }, // Esfera
        4: { cellWidth: 110 }, // Pergunta
        5: { cellWidth: 65 }, // Resposta/Nota
        6: { cellWidth: "auto" }, // Comentário
      },
      margin: { left: M, right: M, bottom: 60 },
      didDrawPage: () =>
        drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo),
    });
  }

  // ============================================================
  // PÁGINA SEGUINTE: ACOMPANHAMENTOS E AÇÕES INSTITUCIONAIS
  // ============================================================
  doc.addPage();
  drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);

  let acompStartY = 60;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(11);
  doc.text("5. ACOMPANHAMENTOS E TRATATIVAS INSTITUCIONAIS (RH / SST)", M, acompStartY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "Registros formais de reuniões de suporte, planos de intervenção preventiva e resoluções.",
    M,
    acompStartY + 12
  );

  const acompRows = (data.acompanhamentos || []).map((a) =>
    formatAcompanhamentoRowForPdf(
      a,
      data.filtro_aplicado?.data_inicio,
      data.filtro_aplicado?.data_fim
    )
  );

  if (acompRows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Nenhum acompanhamento registrado para este colaborador.", M, acompStartY + 35);
  } else {
    autoTable(doc, {
      startY: acompStartY + 20,
      head: [["Criado em", "Status", "Responsável", "Objetivo e Ações", "Anotações / Resultado", "Prazos / Atualizado"]],
      body: acompRows,
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        valign: "top",
        lineColor: [225, 225, 230],
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: PRIMARY,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { cellWidth: 70 }, // Criado em
        1: { cellWidth: 55 }, // Status
        2: { cellWidth: 65 }, // Responsável
        3: { cellWidth: 125 }, // Objetivo e Ações
        4: { cellWidth: 115 }, // Anotações / Resultado
        5: { cellWidth: "auto" }, // Prazos
      },
      margin: { left: M, right: M, bottom: 60 },
      didDrawPage: () =>
        drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo),
    });
  }

  // ============================================================
  // NOTA METODOLÓGICA E QR CODE (ÚLTIMA PÁGINA)
  // ============================================================
  let lastFinalY = (doc as any).lastAutoTable?.finalY
    ? (doc as any).lastAutoTable.finalY + 24
    : acompStartY + 60;

  // Se o espaço restante for insuficiente para nota metodológica + QR code, cria nova página
  const neededHeight = 220;
  if (lastFinalY + neededHeight > pageH - 50) {
    doc.addPage();
    drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
    lastFinalY = 60;
  }

  // Caixa de Nota Metodológica
  const notaComplementar = "Pulsos filtrados pelo período selecionado; acompanhamentos listados na íntegra, incluindo ações fora do período.";
  const regrasBase = sanitizePdfText(data.regras_aplicadas || "Conforme diretrizes da NR-1.");
  const regrasCompleta = `${regrasBase}\n${notaComplementar}`;

  doc.setFillColor(252, 252, 254);
  doc.setDrawColor(215, 215, 225);
  doc.roundedRect(M, lastFinalY, pageW - M * 2, 78, 5, 5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(8.5);
  doc.text("6. NOTA METODOLÓGICA E REGRAS DE CONSOLIDAÇÃO (NR-1 / LGPD)", M + 12, lastFinalY + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7.5);
  const regrasWrap = doc.splitTextToSize(regrasCompleta, pageW - M * 2 - 24);
  doc.text(regrasWrap, M + 12, lastFinalY + 30);

  // QR Code de Verificação Probatória
  const qrY = lastFinalY + 85;
  const qrSize = 65;
  if (qrDataUrl) {
    const qrX = pageW / 2 - qrSize / 2;
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      /* ignore */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(
    "VERIFICAÇÃO DE AUTENTICIDADE ELETRÔNICA",
    pageW / 2,
    qrY + qrSize + 12,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    "Escaneie o QR Code para auditar a autenticidade e validade deste dossiê na plataforma NR1-Pronto.",
    pageW / 2,
    qrY + qrSize + 22,
    { align: "center" }
  );

  // ============================================================
  // NUMERAÇÃO E CARIMBO DE RODAPÉ EM TODAS AS PÁGINAS
  // ============================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, pageW, pageH, M, geradoEm, hashCurto, p, totalPages);
  }

  // Nome do arquivo seguro com preservação de caracteres acentuados
  const fileName = buildDossieFileName(colab?.full_name, now);
  doc.save(fileName);
}
