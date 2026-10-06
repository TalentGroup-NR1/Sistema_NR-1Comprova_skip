import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getShareBaseUrl } from "@/lib/appUrl";
import { sha256Hex, fetchHash, loadImage, fitImage, generateVerificationQRCode, sha256HexFromBytes } from "./pdfHelpers";
import { AcaoComExecucoes, aggregatePgrData } from "./relatorioPgrAggregators";
import { supabase } from "@/integrations/supabase/client";
import { RiscoExtraido, AcaoExtraida } from "@/hooks/usePgrImportacao";

export interface EvidenciaEmpresa {
  name?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
}

export interface EvidenciaEmitente {
  nome: string;
  cargo?: string | null;
  email: string;
}

export interface PgrInfo {
  id: string;
  data_elaboracao: string | null;
  validade: string | null;
  responsavel_tecnico: string | null;
  cargo_responsavel: string | null;
  registro_profissional?: string | null; // Opcional, sem placeholder
  status: string;
}

export interface GerarRelatorioPgrParams {
  pgrInfo: PgrInfo;
  acoes: AcaoComExecucoes[];
  riscos?: RiscoExtraido[];
  planoAcao?: AcaoExtraida[];
  empresa: EvidenciaEmpresa;
  emitente: EvidenciaEmitente;
  verificacaoUrlBase?: string;
}

// Paleta NR-1Comprova (copiada do outro relat.)
const PRIMARY: [number, number, number] = [139, 0, 0];
const DARK: [number, number, number] = [31, 41, 55];
const ACCENT: [number, number, number] = [197, 165, 114];
const ZEBRA: [number, number, number] = [248, 249, 251];

function sanitizeText(input?: string | null): string {
  if (input == null) return "";
  let s = String(input);
  s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");
  s = s.replace(/[\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF\uFE0F\u200D]/g, "");
  s = s.replace(/[^\x00-\xFF]/g, " ");
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = iso.length === 10 ? new Date(iso + "T12:00:00") : new Date(iso);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) + " (BRT)";
  } catch {
    return "—";
  }
}

function fmtCurrency(val: number | null | undefined) {
  if (val == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function statusLabel(st: string) {
  const map: Record<string, string> = {
    pendente: "Pendente",
    em_andamento: "Em Andamento",
    concluida: "Concluída",
    validada: "Eficácia verificada",
  };
  return map[st] || st;
}

export async function gerarRelatorioPgrPDF(params: GerarRelatorioPgrParams) {
  const { pgrInfo, acoes, empresa, emitente, riscos = [], planoAcao = [] } = params;

  // Cálculos prévios
  const stats = aggregatePgrData(acoes);
  const hashConteudo = await sha256Hex(`PGR_EXEC|${pgrInfo.id}|${stats.totalAcoes}|${stats.concluidas}|${stats.percentualExecucao}`);
  const now = new Date();
  const geradoEm = fmtDateTime(now.toISOString());
  const docId = `PGR-EXEC-${pgrInfo.id.slice(0, 8).toUpperCase()}-${format(now, "yyyyMMddHHmmss")}`;
  const hashCurto = hashConteudo.slice(0, 16).toUpperCase();

  const baseUrl = params.verificacaoUrlBase || getShareBaseUrl();
  const verificacaoPayload = `TALENT-EVID|PGR_EXEC|${docId}|${hashCurto}|${baseUrl}/evidencias?verificar=${docId}`;
  const qrDataUrl = await generateVerificationQRCode(verificacaoPayload);

  const talentLogo = await loadImage("/images/Logo_NR1_Transparente.png");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  const HEADER_H = 50;

  function renderHeader() {
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageW, HEADER_H, "F");
    doc.setFillColor(...ACCENT);
    doc.rect(0, HEADER_H, pageW, 2, "F");

    if (talentLogo) {
      const { w, h } = fitImage(talentLogo, 130, 30);
      try {
        doc.addImage(talentLogo.dataUrl, "PNG", M, (HEADER_H - h) / 2, w, h);
      } catch {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const empNomeWrap = doc.splitTextToSize(sanitizeText(empresa.name || "—").toUpperCase(), pageW / 2 - M);
    doc.text(empNomeWrap[0] || "—", pageW - M, 22, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`CNPJ: ${sanitizeText(empresa.cnpj || "—")}`, pageW - M, 36, { align: "right" });
  }

  function renderFooter() {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = pageH - 50;
      doc.setDrawColor(200, 200, 200);
      doc.line(M, footerY, pageW - M, footerY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      doc.text(`DOC-ID: ${docId}`, M, footerY + 14);
      doc.text(`HASH: ${hashCurto}`, M, footerY + 24);
      doc.text(`Gerado por: ${sanitizeText(emitente.nome)} em ${geradoEm}`, M, footerY + 34);

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", pageW - M - 30, footerY + 5, 30, 30);
      }

      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, footerY + 20, { align: "center" });
    }
  }

  // --- PÁGINA 1: Capa e Identificação ---
  renderHeader();
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RELATÓRIO DE EVIDÊNCIA DE EXECUÇÃO", pageW / 2, 100, { align: "center" });
  doc.text("PGR", pageW / 2, 120, { align: "center" });

  autoTable(doc, {
    startY: 150,
    head: [[{ content: "Informações do Relatório", colSpan: 2 }]],
    body: [
      ["ID do PGR Base", pgrInfo.id],
      ["Data de Elaboração PGR", fmtDate(pgrInfo.data_elaboracao === "null" ? null : pgrInfo.data_elaboracao)],
      ["Validade PGR", fmtDate(pgrInfo.validade === "null" ? null : pgrInfo.validade)],
      ["Responsável Técnico", pgrInfo.responsavel_tecnico || "—"],
      ...(pgrInfo.registro_profissional ? [["Registro Profissional", pgrInfo.registro_profissional]] : []),
      ["Emitido em", geradoEm],
      ["Emitido por", emitente.nome],
      ["ID Documento (Rastreabilidade)", docId],
      ["Hash de Integridade (SHA-256)", hashConteudo],
    ],
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 5, textColor: DARK },
    headStyles: { fillColor: ZEBRA, textColor: PRIMARY, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 160 } },
    margin: { left: M, right: M },
  });

  // Finalidade
  const termsY = (doc as any).lastAutoTable.finalY + 30;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Finalidade e Validade Probatória", M, termsY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const txtFinalidade = "Este relatório consolida as evidências de execução das ações do Plano de Gerenciamento de Riscos (PGR), com finalidade comprobatória perante a fiscalização do Ministério do Trabalho e Emprego, em atendimento à Norma Regulamentadora nº 01 (NR-1). O histórico é imutável e registrado com integridade criptográfica. O sigilo de dados pessoais sensíveis é garantido em conformidade com a LGPD.";
  const splitted = doc.splitTextToSize(txtFinalidade, pageW - 2 * M);
  doc.text(splitted, M, termsY + 15);

  // --- PÁGINA: Dashboard e Indicadores ---
  doc.addPage();
  renderHeader();
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo de Execução do Plano de Ação", M, 90);

  autoTable(doc, {
    startY: 110,
    head: [["Indicador", "Valor", "Indicador", "Valor"]],
    body: [
      ["Total de Ações", String(stats.totalAcoes), "Eficácia Verificada", String(stats.validadas)],
      ["Concluídas", String(stats.concluidas), "Em Andamento", String(stats.emAndamento)],
      ["Pendentes", String(stats.pendentes), "Percentual Executado", `${stats.percentualExecucao}%`],
      ["Custo Orçado", fmtCurrency(stats.custoEstimadoTotal), "Custo Realizado", fmtCurrency(stats.custoRealTotal)],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 6, textColor: DARK },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold" }, 2: { fontStyle: "bold" } },
    margin: { left: M, right: M },
  });

  // --- SEÇÃO: Riscos Mapeados ---
  doc.addPage();
  renderHeader();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Riscos Mapeados", M, 90);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(riscos.length > 0 ? `${riscos.length} riscos identificados` : "Sem dados mapeados.", M, 105);

  if (riscos.length > 0) {
    const riscosBody = riscos.map(r => {
      const riscoTxt = `${sanitizeText(r.nome)}${r.descricao ? `\n${sanitizeText(r.descricao)}` : ""}`;
      const cat = sanitizeText(r.categoria) || "—";
      const classNivel = (r.nivel === 0 || String(r.nivel) === "0" || r.nivel == null) ? (sanitizeText(r.classificacao) || "—") : String(r.nivel);
      const grupo = sanitizeText(r.grupo_exposto) || "—";
      const local = sanitizeText(r.local_exposicao || r.fonte) || "—";
      const medidas = (r.medidas_existentes === "null" || !r.medidas_existentes) ? "—" : sanitizeText(r.medidas_existentes);

      return [riscoTxt, cat, classNivel, grupo, local, medidas];
    });

    autoTable(doc, {
      startY: 115,
      head: [["Risco (Nome e Descrição)", "Categoria", "Nível/Classificação", "Grupo Exposto", "Local/Fonte", "Medidas Existentes"]],
      body: riscosBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, textColor: DARK },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
      margin: { left: M, right: M },
    });
  }

  // --- SEÇÃO: Ações Mapeadas ---
  doc.addPage();
  renderHeader();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Ações Mapeadas", M, 90);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(planoAcao.length > 0 ? `${planoAcao.length} ações do plano` : "Sem dados mapeados.", M, 105);

  if (planoAcao.length > 0) {
    const planoBody = planoAcao.map(a => {
      const medida = sanitizeText(a.medida) || "—";
      const status = sanitizeText(a.status) || "—";
      const prioridade = sanitizeText(a.prioridade) || "—";
      let prazo = sanitizeText(a.prazo_sugerido) || "—";
      if (/^\d+$/.test(prazo)) {
        prazo = `${prazo} dias`;
      }
      const resp = sanitizeText(a.responsavel_sugerido) || "—";
      const riscoRef = (a.risco_referenciado === "null" || !a.risco_referenciado) ? "—" : sanitizeText(a.risco_referenciado);
      
      return [medida, status, prioridade, prazo, resp, riscoRef];
    });

    autoTable(doc, {
      startY: 115,
      head: [["Medida", "Status", "Prioridade", "Prazo", "Responsável", "Risco Ref."]],
      body: planoBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, textColor: DARK },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
      margin: { left: M, right: M },
    });
  }

  // --- PÁGINAS SEGUINTES: 5W2H e Log de Execução ---
  if (!acoes || acoes.length === 0) {
    doc.addPage();
    renderHeader();
    doc.setFont("helvetica", "italic");
    doc.text("Nenhuma ação cadastrada para este PGR", M, 100);
  } else {
    doc.addPage();
    renderHeader();
    let currentY = 90;
    
    // Lista Resumo do Plano de Ação
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Plano de Ação (Resumo)", M, currentY);
    
    autoTable(doc, {
      startY: currentY + 15,
      head: [["#", "Ação (Medida)", "Status", "Prioridade"]],
      body: acoes.map((a, i) => [
        String(i + 1),
        sanitizeText(a.acao),
        statusLabel(a.status),
        a.prioridade ? sanitizeText(a.prioridade).toUpperCase() : "—"
      ]),
      theme: "striped",
      styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
      headStyles: { fillColor: ZEBRA, textColor: PRIMARY, fontStyle: "bold" },
      margin: { left: M, right: M },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 30;

    for (let i = 0; i < acoes.length; i++) {
      const acao = acoes[i];
      
      // If we are too close to bottom, add page
      if (currentY > pageH - 200) {
        doc.addPage();
        renderHeader();
        currentY = 90;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      // Formata em bloco legível com quebra de linha se for muito longo
      const titleLines = doc.splitTextToSize(`Ação ${i + 1}: ${sanitizeText(acao.acao)}`, pageW - 2 * M);
      doc.text(titleLines, M, currentY);
      
      const titleHeight = titleLines.length * 14;

      // Tratamento do responsável
      const responsavel = acao.colaboradores?.full_name || "Não informado";
      
      // Tabela 5W2H
      autoTable(doc, {
        startY: currentY + titleHeight + 10,
        body: [
          ["Onde (Local)", sanitizeText(acao.onde || "Não informado"), "Por que (Justificativa)", sanitizeText(acao.por_que || "Não informado")],
          ["Como (Método)", sanitizeText(acao.como || "Não informado"), "Prazo", acao.prazo ? fmtDate(acao.prazo) : "Não informado"],
          ["Responsável", sanitizeText(responsavel), "Prioridade", acao.prioridade ? sanitizeText(acao.prioridade).toUpperCase() : "Não informado"],
          ["Status Atual", statusLabel(acao.status), "Eficácia", acao.status === 'validada' ? 'Verificada' : 'Pendente'],
          ["Custo Orçado", acao.custo_estimado != null ? fmtCurrency(acao.custo_estimado) : "Não informado", "Custo Real", acao.custo_real != null ? fmtCurrency(acao.custo_real) : "Não informado"],
        ],
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 4, textColor: DARK, lineColor: [200, 200, 200], lineWidth: 0.5 },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 2: { fontStyle: "bold", cellWidth: 100 } },
        margin: { left: M, right: M },
      });

      let nextY = (doc as any).lastAutoTable.finalY + 10;

      // Log de execuções
      if (acao.execucoes && acao.execucoes.length > 0) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Histórico de Execuções", M, nextY);
        
        const execRows = acao.execucoes.map((e: any) => [
          fmtDate(e.data),
          sanitizeText(e.colaboradores?.full_name || "Não informado"),
          sanitizeText(e.o_que_foi_feito || "—"),
          sanitizeText(e.como || "—")
        ]);

        autoTable(doc, {
          startY: nextY + 5,
          head: [["Data", "Quem Executou", "O que foi feito", "Observações"]],
          body: execRows,
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 3, textColor: DARK },
          headStyles: { fillColor: ZEBRA, textColor: PRIMARY, fontStyle: "bold" },
          margin: { left: M, right: M },
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Sem execução registrada", M, nextY);
        currentY = nextY + 15;
      }
    }
  }

  // --- ANEXOS (Evidências listadas no final) ---
  const anexosUrls = acoes.flatMap(a => [
    ...(a.evidencia_url ? [a.evidencia_url] : []),
    ...(a.execucoes || []).flatMap(e => (e.evidencia_url ? [e.evidencia_url] : []))
  ]);

  if (anexosUrls.length > 0) {
    doc.addPage();
    renderHeader();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Relação de Arquivos e Evidências Anexas", M, 90);
    
    // Calcula hashes na hora baixando o arquivo diretamente via Supabase client
    const anexoRows: string[][] = [];
    for (const url of anexosUrls) {
      const fileName = url.split("/").pop() || url;
      let h: string | null = null;
      try {
        const { data, error } = await supabase.storage.from("pgr_evidencias").download(url);
        if (data && !error) {
          const buf = await data.arrayBuffer();
          h = await sha256HexFromBytes(buf);
        }
      } catch (err) {
        console.error("Erro ao baixar anexo para hash:", err);
      }
      anexoRows.push([fileName, h || "Hash não disponível"]);
    }

    autoTable(doc, {
      startY: 110,
      head: [["Arquivo", "Hash SHA-256 (Integridade)"]],
      body: anexoRows,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 5, textColor: DARK },
      headStyles: { fillColor: ZEBRA, textColor: DARK, fontStyle: "bold" },
      margin: { left: M, right: M },
    });
  }

  renderFooter();

  return {
    blob: new Blob([doc.output("arraybuffer")], { type: "application/pdf" }),
    docId
  };
}
