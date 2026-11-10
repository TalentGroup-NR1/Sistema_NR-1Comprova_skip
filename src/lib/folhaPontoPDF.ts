import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMinutes } from "@/hooks/usePontoResumo";
import type { ResumoDiario } from "@/hooks/usePontoResumo";

export interface FolhaPontoEmpresa {
  razao_social: string;
  cnpj?: string | null;
  endereco?: string | null;
  logo_url?: string | null;
}

export interface FolhaPontoColaborador {
  full_name: string;
  matricula?: string | null;
  admission_date?: string | null;
  department?: string | null;
  setor?: string | null;
  job_title?: string | null;
  cpf?: string | null;
  ctps?: string | null;
  ctps_serie?: string | null;
  pis?: string | null;
}

export interface FolhaPontoAssinatura {
  nome: string;
  assinado_em: string; // ISO
  hash: string;        // SHA-256
}

export interface FolhaPontoAssinaturaEmpresa {
  nome: string;
  cargo?: string | null;
  assinado_em: string; // ISO
  hash: string;        // SHA-256
}

export interface FolhaPontoParams {
  empresa: FolhaPontoEmpresa;
  colaborador: FolhaPontoColaborador;
  periodoInicio: string; // yyyy-MM-dd
  periodoFim: string;
  resumos: ResumoDiario[]; // ordem cronológica asc
  /** 'save' (default) baixa o arquivo; 'blob' retorna o Blob para upload. */
  output?: "save" | "blob";
  /** Se fornecida, imprime bloco de assinatura digital do colaborador. */
  assinatura?: FolhaPontoAssinatura | null;
  /** Se fornecida, imprime bloco de assinatura digital da empresa (responsável pelo fechamento). */
  assinaturaEmpresa?: FolhaPontoAssinaturaEmpresa | null;
}

function fmtMinOrDash(min: number | null | undefined): string {
  if (min === null || min === undefined || min === 0) return "-";
  return formatMinutes(min);
}

function formatMarcacoes(resumo: ResumoDiario): string {
  if (!resumo.registros || resumo.registros.length === 0) return "";
  return resumo.registros
    .map((r) => format(new Date(r.data_hora), "HH:mm"))
    .join(" ");
}

async function loadImageAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarFolhaPontoPDF(params: FolhaPontoParams): Promise<Blob | void> {
  const { empresa, colaborador, periodoInicio, periodoFim, resumos } = params;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // ---------- Header ----------
  if (empresa.logo_url) {
    const dataUrl = await loadImageAsDataURL(empresa.logo_url);
    if (dataUrl) {
      try {
        doc.addImage(dataUrl, "PNG", pageWidth - marginX - 30, 8, 30, 12, undefined, "FAST");
      } catch {
        // ignore broken image
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Folha de Ponto", pageWidth / 2, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const periodoStr = `Apuração: de ${format(new Date(periodoInicio + "T12:00:00"), "dd/MM/yyyy")} a ${format(new Date(periodoFim + "T12:00:00"), "dd/MM/yyyy")}`;
  doc.text(periodoStr, pageWidth / 2, 20, { align: "center" });
  doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, 25, { align: "center" });

  // ---------- Empregador ----------
  let cursorY = 32;
  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 7, cellPadding: 0.6 },
    head: [[{ content: "DADOS DO EMPREGADOR", styles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 } }]],
    body: [
      [`Razão Social: ${empresa.razao_social || "-"}`],
      [`CNPJ: ${empresa.cnpj || "-"}`],
      ...(empresa.endereco ? [[`Endereço: ${empresa.endereco}`]] : []),
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 3;

  // ---------- Trabalhador ----------
  const admissao = colaborador.admission_date
    ? format(new Date(colaborador.admission_date + "T12:00:00"), "dd/MM/yyyy")
    : "-";
  const ctpsLine = [colaborador.ctps, colaborador.ctps_serie ? `Série: ${colaborador.ctps_serie}` : null]
    .filter(Boolean)
    .join("  ");

  autoTable(doc, {
    startY: cursorY,
    theme: "plain",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 7, cellPadding: 0.6 },
    head: [[{ content: "DADOS DO TRABALHADOR", colSpan: 2, styles: { fontStyle: "bold", fillColor: [240, 240, 240], textColor: 20 } }]],
    columnStyles: { 0: { cellWidth: (pageWidth - 2 * marginX) / 2 }, 1: { cellWidth: (pageWidth - 2 * marginX) / 2 } },
    body: [
      [
        `Nome: ${colaborador.full_name}${colaborador.matricula ? ` (${colaborador.matricula})` : ""}`,
        `Data de admissão: ${admissao}`,
      ],
      [
        `Departamento: ${colaborador.department || "-"}`,
        `Setor: ${colaborador.setor || "-"}`,
      ],
      [
        `Cargo: ${colaborador.job_title || "-"}`,
        `CPF: ${colaborador.cpf || "-"}`,
      ],
      [
        `CTPS: ${ctpsLine || "-"}`,
        `PIS / PASEP: ${colaborador.pis || "-"}`,
      ],
    ],
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // ---------- Registros ----------
  let totalPrev = 0;
  let totalTrab = 0;
  let totalSaldo = 0;
  let totalPos = 0;
  let totalNeg = 0;

  let totalAbono = 0;
  let totalNoturno = 0;

  const temNoturno = resumos.some((r) => (r.horasNoturnasMin ?? 0) > 0);

  const body = resumos.map((r) => {
    const data = new Date(r.data + "T12:00:00");
    const diaSemanaRaw = format(data, "EEE", { locale: ptBR }).replace(".", "");
    const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1).toLowerCase() + ".";
    const dataStr = `${format(data, "dd/MM/yyyy")} - ${diaSemana}`;
    const marcacoes = formatMarcacoes(r);
    const isFalta = r.status === "FALTA";
    const isFeriado = r.status === "FERIADO";
    const isFerias = r.status === "FERIAS";
    const isAbonado = r.status === "ABONADO";
    const dow = data.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const skipFromTotals = (isFalta && isWeekend) || isFeriado || isFerias || isAbonado;

    let marcacoesCell = marcacoes || "";
    if (isFerias) marcacoesCell = "FÉRIAS";
    else if (isAbonado) marcacoesCell = r.tipoAbono || "Abonado";
    else if (isFeriado && !marcacoes) marcacoesCell = `Feriado: ${r.feriadoNome || ""}`;
    else if (isFeriado && marcacoes) marcacoesCell = `${marcacoes}  (Feriado: ${r.feriadoNome || ""})`;

    // Abono: horas vão para a coluna "Abonos", não em "Trabalhadas".
    const abonoMin = isAbonado
      ? (r.horasPrevistasMin > 0 ? r.horasPrevistasMin : r.horasTrabalhadasMin)
      : 0;

    const prevStr = skipFromTotals ? "-" : formatMinutes(r.horasPrevistasMin);
    const trabStr = !isAbonado && r.horasTrabalhadasMin > 0 ? formatMinutes(r.horasTrabalhadasMin) : "-";
    const abonoStr = abonoMin > 0 ? formatMinutes(abonoMin) : "-";
    const saldoStr = skipFromTotals ? "-" : formatMinutes(r.saldoMin);
    const noturnoMin = r.horasNoturnasMin ?? 0;
    const noturnoStr = noturnoMin > 0 ? formatMinutes(noturnoMin) : "-";

    if (!skipFromTotals) {
      totalPrev += r.horasPrevistasMin;
      totalSaldo += r.saldoMin;
      if (r.saldoMin > 0) totalPos += r.saldoMin;
      if (r.saldoMin < 0) totalNeg += r.saldoMin;
    }
    if (!isAbonado && r.horasTrabalhadasMin > 0) totalTrab += r.horasTrabalhadasMin;
    totalAbono += abonoMin;
    totalNoturno += noturnoMin;

    const row: any[] = [dataStr, marcacoesCell, prevStr, trabStr, abonoStr];
    if (temNoturno) row.push(noturnoStr);
    row.push(saldoStr);
    return row;
  });

  const totalRow: any[] = [
    { content: "TOTAL", colSpan: 2, styles: { fontStyle: "bold", halign: "right" } },
    { content: formatMinutes(totalPrev), styles: { fontStyle: "bold", halign: "center" } },
    { content: formatMinutes(totalTrab), styles: { fontStyle: "bold", halign: "center" } },
    { content: totalAbono > 0 ? formatMinutes(totalAbono) : "-", styles: { fontStyle: "bold", halign: "center" } },
  ];
  if (temNoturno) {
    totalRow.push({ content: totalNoturno > 0 ? formatMinutes(totalNoturno) : "-", styles: { fontStyle: "bold", halign: "center" } });
  }
  totalRow.push({ content: formatMinutes(totalSaldo), styles: { fontStyle: "bold", halign: "center" } });
  body.push(totalRow);

  const headRow: string[] = ["Dia", "Marcações", "Previstas", "Trabalhadas", "Abonos"];
  if (temNoturno) headRow.push("Noturno");
  headRow.push("Saldo");

  const colStyles: Record<number, any> = {
    0: { cellWidth: 33 },
    1: { cellWidth: "auto" },
    2: { cellWidth: 18, halign: "center" },
    3: { cellWidth: 22, halign: "center" },
    4: { cellWidth: 16, halign: "center" },
  };
  if (temNoturno) {
    colStyles[5] = { cellWidth: 18, halign: "center" };
    colStyles[6] = { cellWidth: 18, halign: "center" };
  } else {
    colStyles[5] = { cellWidth: 18, halign: "center" };
  }

  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 7, cellPadding: 0.8 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7, cellPadding: 0.8 },
    head: [[
      { content: "REGISTROS", colSpan: temNoturno ? 7 : 6, styles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" } },
    ], headRow],
    body,
    columnStyles: colStyles,
    didDrawPage: () => {
      // Footer page number
      const str = `${doc.getCurrentPageInfo().pageNumber}`;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(str, pageWidth - marginX, pageHeight - 6, { align: "right" });
    },
  });
  cursorY = (doc as any).lastAutoTable.finalY + 4;

  // ---------- Footer / Assinaturas ----------
  if (cursorY > pageHeight - 35) {
    doc.addPage();
    cursorY = 20;
  }

  const diasFerias = resumos.filter(r => r.status === "FERIAS").length;
  const diasFeriado = resumos.filter(r => r.status === "FERIADO").length;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Neste período: saldo positivo de ${formatMinutes(totalPos)} e saldo negativo de ${formatMinutes(Math.abs(totalNeg))}. Dias de férias: ${diasFerias} · Feriados: ${diasFeriado}.`,
    marginX,
    cursorY,
  );
  cursorY += 5;

  doc.setFontSize(8);
  const recText = "Reconheço com exatidão todos os registros constantes neste documento, pois representam o ocorrido neste período.";
  const recLines = doc.splitTextToSize(recText, pageWidth - 2 * marginX);
  doc.text(recLines, marginX, cursorY);
  cursorY += recLines.length * 4 + 12;

  // Signature lines
  const lineWidth = (pageWidth - 2 * marginX - 20) / 2;
  doc.setLineWidth(0.3);
  doc.line(marginX, cursorY, marginX + lineWidth, cursorY);
  doc.line(pageWidth - marginX - lineWidth, cursorY, pageWidth - marginX, cursorY);

  doc.setFontSize(8);
  doc.text(empresa.razao_social || "Empregador", marginX, cursorY + 4);
  doc.text(colaborador.full_name, pageWidth - marginX - lineWidth, cursorY + 4);
  doc.setFont("helvetica", "bold");
  doc.text("Responsável", marginX, cursorY + 9);
  doc.text("Trabalhador", pageWidth - marginX - lineWidth, cursorY + 9);

  // Bloco de assinatura digital do colaborador (impresso acima da linha)
  const assinatura = params.assinatura;
  if (assinatura) {
    const xSig = pageWidth - marginX - lineWidth;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const dt = new Date(assinatura.assinado_em);
    const dtStr = isNaN(dt.getTime())
      ? assinatura.assinado_em
      : format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Assinado digitalmente por ${assinatura.nome}`, xSig, cursorY - 6);
    doc.text(`em ${dtStr}`, xSig, cursorY - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    const hashLines = doc.splitTextToSize(`Hash SHA-256: ${assinatura.hash}`, lineWidth);
    doc.text(hashLines, xSig, cursorY + 14);
  }

  // Bloco de assinatura digital da empresa (responsável pelo fechamento)
  const assinaturaEmpresa = params.assinaturaEmpresa;
  if (assinaturaEmpresa) {
    const xSig = marginX;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const dt = new Date(assinaturaEmpresa.assinado_em);
    const dtStr = isNaN(dt.getTime())
      ? assinaturaEmpresa.assinado_em
      : format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const nomeLinha = assinaturaEmpresa.cargo
      ? `${assinaturaEmpresa.nome} — ${assinaturaEmpresa.cargo}`
      : assinaturaEmpresa.nome;
    doc.text(`Assinado digitalmente por ${nomeLinha}`, xSig, cursorY - 6);
    doc.text(`em ${dtStr}`, xSig, cursorY - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    const hashLines = doc.splitTextToSize(`Hash SHA-256: ${assinaturaEmpresa.hash}`, lineWidth);
    doc.text(hashLines, xSig, cursorY + 14);
  }

  // Filename / output
  const mes = format(new Date(periodoInicio + "T12:00:00"), "MMMyy", { locale: ptBR }).toUpperCase();
  const safeName = colaborador.full_name.replace(/[^a-zA-Z0-9]/g, "_");
  const matricula = colaborador.matricula ? `${colaborador.matricula}_` : "";
  if (params.output === "blob") {
    return doc.output("blob");
  }
  doc.save(`folha-ponto-${matricula}${safeName}-${mes}.pdf`);
}
