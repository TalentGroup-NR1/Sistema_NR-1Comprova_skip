import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { HeatmapPsicoData } from "@/hooks/usePsicoHeatmap";
import type { PlanoAcao } from "@/hooks/usePlanosAcao";
import type { PsicoAvaliacao } from "@/hooks/usePsicoAvaliacoes";
import { RGB_RISCO, ROTULO_RISCO, classificarRisco, faixasTexto } from "@/lib/psicoRiscos";

export interface EmpresaRelatorio {
  name: string;
  cnpj?: string | null;
  logo_url?: string | null;
}

export interface RelatorioPsicoParams {
  campanha: PsicoAvaliacao;
  heatmap: HeatmapPsicoData;
  planos: PlanoAcao[];
  empresa: EmpresaRelatorio | null;
  responsavelTecnico: { nome: string; registro: string | null; cargo: string | null };
  emitente: { nome: string; cargo: string | null; email: string };
}

const NAVY: [number, number, number] = [10, 22, 40];
const GRAY: [number, number, number] = [100, 116, 139];

function fmtBR(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

async function loadImage(url?: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarRelatorioPsicoPDF(p: RelatorioPsicoParams): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;
  let y = M;

  const logo = await loadImage(p.empresa?.logo_url);

  // ---------- Capa / cabeçalho ----------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 32, "F");
  if (logo) {
    try {
      doc.addImage(logo, "PNG", M, 6, 20, 20);
    } catch {
      /* ignore */
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Relatório de Avaliação de Riscos Psicossociais", logo ? M + 25 : M, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NR-1 · Gerenciamento de Riscos Ocupacionais (GRO/PGR)", logo ? M + 25 : M, 22);
  doc.text(p.empresa?.name ?? "—", logo ? M + 25 : M, 27);
  doc.setTextColor(0, 0, 0);
  y = 40;

  // ---------- Identificação ----------
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [["Identificação da avaliação", ""]],
    body: [
      ["Empresa", p.empresa?.name ?? "—"],
      ["CNPJ", p.empresa?.cnpj ?? "—"],
      ["Campanha", p.campanha.titulo],
      ["Instrumento aplicado", p.campanha.instrumento_nome],
      ["Período", `${fmtBR(p.campanha.data_inicio)} a ${fmtBR(p.campanha.data_fim)}`],
      ["Modo de coleta", p.campanha.modo_anonimato ? "Anônimo (agregado por grupo)" : "Identificado"],
      ["Agrupamento", p.heatmap.agrupamento === "ghe" ? "GHE" : "Departamento"],
      [
        "Adesão",
        `${p.heatmap.total_respondidos} de ${p.heatmap.total_atribuidos} convidados (${
          p.heatmap.total_atribuidos ? Math.round((p.heatmap.total_respondidos / p.heatmap.total_atribuidos) * 100) : 0
        }%)`,
      ],
      ["Responsável técnico", p.responsavelTecnico.nome || "—"],
      ["Registro profissional", p.responsavelTecnico.registro || "—"],
      ["Emitido por", `${p.emitente.nome}${p.emitente.cargo ? ` — ${p.emitente.cargo}` : ""}`],
      ["Data de emissão", new Date().toLocaleDateString("pt-BR")],
    ],
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---------- Metodologia ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. Metodologia e critérios de classificação", M, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  const metodo = doc.splitTextToSize(
    `As respostas foram coletadas em escala Likert e convertidas em um índice de 0 a 100 pela fórmula (média - 1) x 25. ` +
      `A leitura respeita o tipo de cada dimensão: em dimensões negativas, índices maiores indicam maior risco; em dimensões ` +
      `positivas, índices menores indicam maior risco. Os pontos de corte são parametrizados por dimensão no instrumento. ` +
      `Grupos com menos de ${p.heatmap.min_respondentes} respondentes foram omitidos para preservar o anonimato ` +
      `(${p.heatmap.grupos_omitidos} grupo(s) omitido(s) nesta apuração).`,
    W - M * 2
  );
  doc.text(metodo, M, y);
  y += metodo.length * 4 + 6;
  doc.setTextColor(0, 0, 0);

  // ---------- Dimensões e faixas ----------
  autoTable(doc, {
    startY: y,
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [["Dimensão", "Tipo", "Faixas de classificação"]],
    body: p.heatmap.dimensoes.map((d) => [
      d.dimensao,
      d.tipo_dimensao === "positiva" ? "Positiva" : "Negativa",
      faixasTexto(d.tipo_dimensao, d.corte_medio, d.corte_alto)
        .map((f) => `${f.nivel}: ${f.texto}`)
        .join("  |  ")
        .replace(/≥/g, ">=")
        .replace(/≤/g, "<="),

    ]),
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ---------- Matriz de riscos ----------
  if (y > 230) {
    doc.addPage();
    y = M;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("2. Matriz de riscos por grupo", M, y);
  y += 4;

  const head = [
    [p.heatmap.agrupamento === "ghe" ? "GHE" : "Departamento", "Resp.", ...p.heatmap.dimensoes.map((d) => d.dimensao)],
  ];
  const body = p.heatmap.linhas.map((l) => [
    l.grupo_nome,
    String(l.respondentes),
    ...p.heatmap.dimensoes.map((d) => {
      const c = l.celulas.find((x) => x.dimensao_id === d.dimensao_id);
      return c?.indice != null ? c.indice.toFixed(0) : "—";
    }),
  ]);

  autoTable(doc, {
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 7, halign: "center", cellPadding: 1.5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 6.5 },
    columnStyles: { 0: { halign: "left", cellWidth: 38, fontStyle: "bold" } },
    head,
    body,
    margin: { left: M, right: M },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index < 2) return;
      const dim = p.heatmap.dimensoes[data.column.index - 2];
      const linha = p.heatmap.linhas[data.row.index];
      const c = linha?.celulas.find((x) => x.dimensao_id === dim?.dimensao_id);
      const nivel = classificarRisco(dim?.tipo_dimensao ?? "negativa", c?.indice, dim?.corte_medio, dim?.corte_alto);
      if (nivel) {
        data.cell.styles.fillColor = RGB_RISCO[nivel];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(
    Object.entries(ROTULO_RISCO)
      .map(([k, v]) => `${k} = ${v}`)
      .join("      "),
    M,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 8;

  // ---------- Planos de ação ----------
  if (y > 230) {
    doc.addPage();
    y = M;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("3. Plano de ação e medidas de controle", M, y);

  const statusLabel: Record<string, string> = {
    pendente: "Pendente",
    planejado: "Planejado",
    em_andamento: "Em andamento",
    atrasado: "Atrasado",
    concluido: "Concluído",
  };
  const nivelLabel: Record<string, string> = {
    primaria: "Primária",
    secundaria: "Secundária",
    terciaria: "Terciária",
  };

  autoTable(doc, {
    startY: y + 3,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 1.8, valign: "top" },
    headStyles: { fillColor: NAVY, textColor: 255 },
    head: [["Grupo", "Dimensão", "Risco", "Ação", "Nível", "Prazo", "Status"]],
    body:
      p.planos.length === 0
        ? [["—", "—", "—", "Nenhum plano registrado para esta campanha.", "—", "—", "—"]]
        : p.planos.map((pl) => [
            pl.grupo_nome ?? pl.departamento ?? "—",
            pl.dimensao_nome ?? "—",
            ({ alto: "Alto", medio: "Médio", baixo: "Baixo" } as Record<string, string>)[
              String(pl.nivel_risco ?? "").toLowerCase()
            ] ?? (pl.nivel_risco || "—"),

            pl.titulo ?? "—",
            pl.nivel_intervencao ? nivelLabel[pl.nivel_intervencao] : "—",
            fmtBR(pl.prazo),
            statusLabel[pl.status] ?? pl.status,
          ]),
    columnStyles: { 3: { cellWidth: 55 } },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // ---------- Assinatura ----------
  if (y > 250) {
    doc.addPage();
    y = M + 10;
  }
  doc.setDrawColor(...GRAY);
  doc.line(M, y, M + 70, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(p.responsavelTecnico.nome || p.emitente.nome, M, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    p.responsavelTecnico.registro
      ? `Responsável técnico · ${p.responsavelTecnico.registro}`
      : p.responsavelTecnico.cargo || p.emitente.cargo || "Responsável técnico",
    M,
    y + 10
  );

  // ---------- Rodapé ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(
      `${p.empresa?.name ?? ""} · ${p.campanha.titulo} · Documento gerado em ${new Date().toLocaleString("pt-BR")}`,
      M,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(`Página ${i} de ${pages}`, W - M, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  const slug = p.campanha.titulo.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
  doc.save(`relatorio-nr1-${slug}.pdf`);
}
