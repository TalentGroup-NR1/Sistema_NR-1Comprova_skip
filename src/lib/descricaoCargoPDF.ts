import jsPDF from "jspdf";
import type { DBloco, DCampo } from "./descricaoModelo";

export interface DescricaoCargoPDFData {
  funcao: string;
  area?: string | null;
  cbo?: string | null;
  maturidade?: string | null;
  reporte?: string | null;
  alocacao?: string | null;
  descricao_sumaria?: string | null;
  grupo_organizacional?: string | null;
  nivel_maturidade?: string | null;
  responsabilidades: string[];
  formacao_academica?: string | null;
  cursos_necessarios?: string | null;
  cursos_desejaveis?: string | null;
  habilidades_comportamentais?: string | null;
  fator_experiencia?: string | null;
  fator_complexidade?: string | null;
  fator_responsabilidade_erros?: string | null;
  fator_responsabilidade_sigilo?: string | null;
  /** Blocos do modelo configurado; quando presentes, guiam a montagem do PDF. */
  blocos?: DBloco[];
  valores?: Record<string, unknown>;
}


export interface DescricaoCargoPDFParams {
  data: DescricaoCargoPDFData;
  empresaNome?: string | null;
  logoDataUrl?: string | null;
  output?: "save" | "blob";
}

// A4 (mm)
const PAGE_W = 210;
const PAGE_H = 297;
const BAR_W = 8; // faixa vermelha lateral
const ML = 22; // margem esquerda do conteúdo
const MR = 14;
const CONTENT_W = PAGE_W - ML - MR;
const HEADER_BOTTOM = 34; // y após o cabeçalho
const FOOTER_LIMIT = PAGE_H - 16;

const RED: [number, number, number] = [192, 0, 0];
const BLACK: [number, number, number] = [0, 0, 0];

export async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function generateDescricaoCargoPDF({
  data,
  empresaNome,
  logoDataUrl,
  output = "save",
}: DescricaoCargoPDFParams): Blob | void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = 0;

  const drawChrome = () => {
    // faixa vermelha lateral
    doc.setFillColor(...RED);
    doc.rect(0, 0, BAR_W, PAGE_H, "F");

    // logo / nome da empresa
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, ML - 4, 10, 34, 14, undefined, "FAST");
      } catch {
        /* ignora logo inválido */
      }
    } else if (empresaNome) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(110, 110, 110);
      doc.text(empresaNome, ML - 4, 20);
    }

    // título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...RED);
    doc.text("Descrição de Função & Competências", PAGE_W - MR, 20, { align: "right" });

    // régua preta
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(1);
    doc.line(ML - 4, 27, PAGE_W - MR, 27);
    doc.setLineWidth(0.2);
    doc.setTextColor(...BLACK);
  };

  const newPage = () => {
    doc.addPage();
    drawChrome();
    y = HEADER_BOTTOM;
  };

  const ensure = (needed: number) => {
    if (y + needed > FOOTER_LIMIT) newPage();
  };

  /** Título de seção com linha inferior (estilo do modelo). */
  const sectionTitle = (title: string, spaceBefore = 7) => {
    ensure(spaceBefore + 10);
    y += spaceBefore;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text(title, ML, y);
    y += 2;
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.4);
    doc.line(ML - 4, y, PAGE_W - MR, y);
    doc.setLineWidth(0.2);
    y += 5;
  };

  /** Parágrafo justificado com quebra automática entre páginas. */
  const paragraph = (text: string, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    const lh = size * 0.52;
    for (const line of lines) {
      ensure(lh);
      doc.text(line, ML, y);
      y += lh;
    }
  };

  /** Linha "Rótulo: valor" com rótulo em negrito. */
  const labelValue = (label: string, value: string, x: number, maxW: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, x, y);
    const lw = doc.getTextWidth(label) + 2;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, Math.max(20, maxW - lw)) as string[];
    doc.text(lines, x + lw, y);
    return lines.length;
  };

  /** Item de lista com marcador em seta (triângulo desenhado). */
  const bullet = (text: string, boldPrefix?: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lh = 5.2;
    let firstIndent = 0;

    ensure(lh);
    // marcador: triângulo apontando à direita
    doc.setFillColor(...BLACK);
    doc.triangle(ML, y - 2.6, ML, y - 0.2, ML + 2.4, y - 1.4, "F");

    if (boldPrefix) {
      doc.setFont("helvetica", "bold");
      doc.text(boldPrefix, ML + 8, y);
      firstIndent = doc.getTextWidth(boldPrefix) + 1.5;
      doc.setFont("helvetica", "normal");
    }

    const firstLines = doc.splitTextToSize(text, CONTENT_W - 8 - firstIndent) as string[];
    doc.text(firstLines[0] ?? "", ML + 8 + firstIndent, y);
    y += lh;

    const rest = (firstLines.slice(1).join(" ") || "").trim();
    if (rest) {
      const lines = doc.splitTextToSize(rest, CONTENT_W - 8) as string[];
      for (const line of lines) {
        ensure(lh);
        doc.text(line, ML + 8, y);
        y += lh;
      }
    }
    y += 1.5;
  };


  const has = (v?: string | null) => !!v && v.trim().length > 0;

  // ---------- Página 1 ----------
  drawChrome();
  y = HEADER_BOTTOM;

  // Identificação
  sectionTitle("Identificação", 0);
  const colW = CONTENT_W / 2 - 4;
  const colR = ML + CONTENT_W / 2 + 4;
  const rows: Array<[string, string, string, string]> = [
    ["Função:", data.funcao || "—", "Área:", data.area || "—"],
    ["CBO:", data.cbo || "—", "Maturidade:", data.maturidade || "—"],
    ["Reporte:", data.reporte || "—", "Alocação:", data.alocacao || "—"],
  ];
  for (const [l1, v1, l2, v2] of rows) {
    ensure(7);
    const n1 = labelValue(l1, v1, ML, colW);
    const n2 = labelValue(l2, v2, colR, colW);
    y += Math.max(n1, n2) * 5.2 + 1.5;
  }

  const valorDoCampo = (campo: DCampo): string | string[] | null => {
    if (campo.campo_fixo) {
      const v = (data as unknown as Record<string, unknown>)[campo.campo_fixo];
      if (Array.isArray(v)) return v as string[];
      return typeof v === "string" ? v : null;
    }
    const v = data.valores?.[campo.id];
    if (Array.isArray(v)) return v as string[];
    return typeof v === "string" ? v : null;
  };

  if (data.blocos && data.blocos.length > 0) {
    // ---------- Blocos configurados no modelo ----------
    data.blocos.forEach((bloco, i) => {
      const conteudo = bloco.campos
        .map((c) => ({ campo: c, valor: valorDoCampo(c) }))
        .filter(({ valor }) =>
          Array.isArray(valor) ? valor.filter((x) => has(x)).length > 0 : has(valor),
        );
      if (conteudo.length === 0) return;

      sectionTitle(bloco.titulo, i === 0 ? 4 : 7);
      conteudo.forEach(({ campo, valor }) => {
        if (Array.isArray(valor)) {
          valor.filter((x) => has(x)).forEach((item) => bullet(item));
          return;
        }
        if (bloco.campos.length === 1) {
          paragraph(valor as string);
        } else {
          ensure(7);
          const n = labelValue(`${campo.label}:`, valor as string, ML, CONTENT_W);
          y += n * 5.2 + 2;
        }
      });
    });
  } else {
    if (has(data.descricao_sumaria)) {
      sectionTitle("Descrição sumária", 4);
      paragraph(data.descricao_sumaria as string);
    }

    if (has(data.grupo_organizacional)) {
      sectionTitle("Grupo organizacional");
      paragraph(data.grupo_organizacional as string);
    }

    if (has(data.nivel_maturidade)) {
      sectionTitle("Nível/Maturidade do Cargo");
      if (has(data.maturidade)) {
        ensure(7);
        const n = labelValue(`${data.maturidade}:`, data.nivel_maturidade as string, ML, CONTENT_W);
        y += n * 5.2;
      } else {
        paragraph(data.nivel_maturidade as string);
      }
    }

    const resps = (data.responsabilidades || []).filter((r) => has(r));
    if (resps.length > 0) {
      sectionTitle("Principais Responsabilidades");
      resps.forEach((r) => bullet(r));
    }

    const temCompetencias =
      has(data.formacao_academica) ||
      has(data.cursos_necessarios) ||
      has(data.cursos_desejaveis) ||
      has(data.habilidades_comportamentais);

    if (temCompetencias) {
      if (y > FOOTER_LIMIT - 60) newPage();
      sectionTitle("Competências");

      if (has(data.formacao_academica)) {
        ensure(7);
        const n = labelValue(
          "Nível de Formação acadêmica:",
          data.formacao_academica as string,
          ML,
          CONTENT_W,
        );
        y += n * 5.2 + 2;
      }

      if (has(data.cursos_necessarios) || has(data.cursos_desejaveis)) {
        ensure(7);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Cursos e/ou Certificações:", ML, y);
        y += 6;
        if (has(data.cursos_necessarios)) bullet(data.cursos_necessarios as string, "Necessários:");
        if (has(data.cursos_desejaveis)) bullet(data.cursos_desejaveis as string, "Desejáveis:");
        y += 1;
      }

      if (has(data.habilidades_comportamentais)) {
        ensure(7);
        const n = labelValue(
          "Habilidades comportamentais:",
          data.habilidades_comportamentais as string,
          ML,
          CONTENT_W,
        );
        y += n * 5.2 + 2;
      }
    }

    const fatores: Array<[string, string | null | undefined]> = [
      ["Fator experiência", data.fator_experiencia],
      ["Fator complexidade", data.fator_complexidade],
      ["Fator responsabilidades por erros", data.fator_responsabilidade_erros],
      ["Fator responsabilidade por informações sigilosas", data.fator_responsabilidade_sigilo],
    ];
    for (const [titulo, valor] of fatores) {
      if (!has(valor)) continue;
      sectionTitle(titulo);
      paragraph(valor as string);
    }
  }


  const nome = sanitizeFileName(
    `${data.funcao || "descricao_cargo"}${data.maturidade ? ` - ${data.maturidade}` : ""}`,
  );

  if (output === "blob") return doc.output("blob");
  doc.save(`${nome}.pdf`);
}
