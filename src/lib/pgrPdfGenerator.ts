import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadImageAsDataUrl } from "./descricaoCargoPDF";
import type { PgrDocumento } from "@/hooks/usePgrDocumento";
import type { PgrAlteracao, PgrSecao } from "@/hooks/usePgrSecoes";
import type { PgrDadosAutomaticos } from "@/hooks/usePgrDadosAutomaticos";
import type { PgrDadosPsicossociais } from "@/hooks/usePgrDadosPsicossociais";

/* ---------------------------------------------------------------- layout */

const PAGE_W = 210;
const PAGE_H = 297;
const M = 12; // margem reduzida para aproveitar melhor a página
const CONTENT_W = PAGE_W - M * 2;
const HEADER_H = 15; // altura reservada para o cabeçalho (linha em y=15)
const SECTION_TITLE_TOP_GAP = 8; // espaço entre a linha do cabeçalho e a faixa da seção
const SECTION_CONTENT_TOP_GAP = 10; // espaço entre o fim da faixa e o conteúdo
const SECTION_TITLE_HEIGHT = 8;
const FOOTER_Y = PAGE_H - 12;
const BODY_LIMIT = PAGE_H - 20;

const RED: [number, number, number] = [200, 16, 46]; // crimson NR1-Pronto
const NAVY: [number, number, number] = [10, 22, 40];
const GREY: [number, number, number] = [110, 110, 110];
const LIGHT_GREY: [number, number, number] = [150, 150, 150];

/** Cores da matriz 5x5 (fundo, texto) por classificação. */
const CORES_NIVEL: Record<string, { fill: [number, number, number]; text: [number, number, number] }> = {
  irrelevante: { fill: [209, 250, 229], text: [6, 95, 70] },
  baixo: { fill: [224, 242, 254], text: [7, 89, 133] },
  moderado: { fill: [254, 243, 199], text: [120, 53, 15] },
  alto: { fill: [255, 226, 197], text: [124, 45, 18] },
  critico: { fill: [254, 226, 226], text: [153, 27, 27] },
  crítico: { fill: [254, 226, 226], text: [153, 27, 27] },
};

function corNivel(label: string | null | undefined) {
  return CORES_NIVEL[(label ?? "").toLowerCase().trim()] ?? { fill: [245, 245, 245] as [number, number, number], text: [60, 60, 60] as [number, number, number] };
}

export function nivelLabel(nivel: number | null | undefined): string {
  if (nivel == null) return "—";
  if (nivel <= 2) return "Irrelevante";
  if (nivel <= 4) return "Baixo";
  if (nivel <= 9) return "Moderado";
  if (nivel <= 14) return "Alto";
  return "Crítico";
}

/* ---------------------------------------------------------------- helpers */

function htmlParaTexto(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dataBR(iso?: string | null): string {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
}

function slug(s: string): string {
  return (s || "empresa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

interface Ctx {
  doc: jsPDF;
  y: number;
  empresa: string;
  logo: string | null;
  geradoEm: string;
  sumario: Array<{ numero: string; titulo: string; pagina: number }>;
}

function header(ctx: Ctx) {
  const { doc } = ctx;
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, 3, "F"); // faixa fina 0,3cm
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(ctx.empresa, M, 12);
  doc.setFont("helvetica", "bold");
  doc.text("PGR", PAGE_W - M, 12, { align: "right" });
  doc.setDrawColor(225, 225, 225);
  doc.line(M, 15, PAGE_W - M, 15);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
}

function footer(ctx: Ctx) {
  const { doc } = ctx;
  const pg = doc.getNumberOfPages();
  doc.setFillColor(...RED);
  doc.rect(0, PAGE_H - 3, PAGE_W, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text(`Gerado em ${ctx.geradoEm}`, M, FOOTER_Y);
  doc.text("Plataforma Gestão Ativa", PAGE_W / 2, FOOTER_Y, { align: "center" });
  doc.text(`Página ${pg}`, PAGE_W - M, FOOTER_Y, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function novaPagina(ctx: Ctx) {
  footer(ctx);
  ctx.doc.addPage();
  header(ctx);
  ctx.y = HEADER_H + SECTION_TITLE_TOP_GAP;
}

function garanteEspaco(ctx: Ctx, altura: number) {
  if (ctx.y + altura > BODY_LIMIT) novaPagina(ctx);
}

function tituloSecao(ctx: Ctx, numero: string | null, titulo: string, _novaPag = true) {
  // Cada seção do PGR começa sempre no topo de uma nova página
  novaPagina(ctx);

  ctx.sumario.push({ numero: numero ?? "", titulo, pagina: ctx.doc.getNumberOfPages() });
  const { doc } = ctx;
  doc.setFillColor(...NAVY);
  doc.rect(M, ctx.y, CONTENT_W, SECTION_TITLE_HEIGHT, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`${numero ? `${numero}. ` : ""}${titulo}`, M + 3, ctx.y + 5.6);
  doc.setTextColor(0, 0, 0);
  ctx.y += SECTION_TITLE_HEIGHT + SECTION_CONTENT_TOP_GAP;
}


function paragrafo(ctx: Ctx, texto: string, size = 9.5) {
  if (!texto) return;
  const { doc } = ctx;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(30, 30, 30);
  for (const bloco of texto.split("\n")) {
    if (!bloco.trim()) {
      ctx.y += 3;
      continue;
    }
    const linhas = doc.splitTextToSize(bloco.trim(), CONTENT_W) as string[];
    for (const l of linhas) {
      garanteEspaco(ctx, 6);
      doc.text(l, M, ctx.y);
      ctx.y += size * 0.5 + 0.8;
    }
    ctx.y += 1.5;
  }
  doc.setTextColor(0, 0, 0);
}

function subtitulo(ctx: Ctx, texto: string) {
  garanteEspaco(ctx, 12);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9.5);
  ctx.doc.setTextColor(...RED);
  ctx.doc.text(texto, M, ctx.y);
  ctx.doc.setTextColor(0, 0, 0);
  ctx.y += 6;
}

interface TabelaOpts {
  head: string[][];
  body: (string | number)[][];
  widths?: Record<number, number>;
  /** índice da coluna que recebe cor da matriz 5x5 conforme o próprio texto */
  colunaColorida?: number;
}

function tabela(ctx: Ctx, { head, body, widths, colunaColorida }: TabelaOpts) {
  if (!body.length) {
    paragrafo(ctx, "Sem registros.");
    return;
  }
  const columnStyles: Record<number, { cellWidth: number }> = {};
  if (widths) for (const [k, v] of Object.entries(widths)) columnStyles[Number(k)] = { cellWidth: v };

  autoTable(ctx.doc, {
    head,
    body: body.map((r) => r.map((c) => (c == null || c === "" ? "—" : String(c)))),
    startY: ctx.y,
    margin: { left: M, right: M, top: HEADER_H + 4, bottom: 18 },
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: 1.8, overflow: "linebreak", textColor: [35, 35, 35] },
    headStyles: { fillColor: RED, textColor: [255, 255, 255], fontSize: 7.8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles,
    didParseCell: (data) => {
      if (colunaColorida != null && data.section === "body" && data.column.index === colunaColorida) {
        const c = corNivel(String(data.cell.raw ?? "").split(" (")[0]);
        data.cell.styles.fillColor = c.fill;
        data.cell.styles.textColor = c.text;
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: () => {
      /* cabeçalho/rodapé são desenhados manualmente no fim */
    },
  });
  // @ts-expect-error propriedade injetada pelo plugin
  ctx.y = (ctx.doc.lastAutoTable?.finalY ?? ctx.y) + 6;
}

/* ---------------------------------------------------------------- páginas */

/** Desenha "LABEL" + valor (ou "Não informado" em itálico) numa coluna. */
function campo(doc: jsPDF, x: number, y: number, label: string, valor?: string | null, larguraMax = 70) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(102, 102, 102);
  doc.text(label.toUpperCase(), x, y);
  const v = (valor ?? "").toString().trim();
  if (v) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...LIGHT_GREY);
  }
  const linhas = doc.splitTextToSize(v || "Não informado", larguraMax) as string[];
  doc.text(linhas, x, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return y + 5 + linhas.length * 5 + 4;
}

function blocoTitulo(doc: jsPDF, y: number, texto: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text(texto.toUpperCase(), M, y);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.3);
  doc.line(M, y + 2.5, PAGE_W - M, y + 2.5);
  doc.setLineWidth(0.2);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function capa(ctx: Ctx, _doc0: PgrDocumento, empresa: { nome: string; cnpj?: string | null }) {
  const { doc } = ctx;

  /* 1. Faixa superior crimson ~5cm */
  const BAND_H = 50;
  doc.setFillColor(...RED);
  doc.rect(0, 0, PAGE_W, BAND_H, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("P R O G R A M A   D E", PAGE_W / 2, 24, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("GERENCIAMENTO DE RISCOS", PAGE_W / 2, 38, { align: "center" });
  doc.setTextColor(0, 0, 0);

  /* 2. Nome da empresa centralizado */
  const centerY = PAGE_H / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  const nomeLinhas = doc.splitTextToSize(empresa.nome, CONTENT_W) as string[];
  doc.text(nomeLinhas, PAGE_W / 2, centerY, { align: "center" });

  /* 3. Linha separadora fina crimson, 8cm centralizada */
  const lineWidth = 80;
  const lineY = centerY + nomeLinhas.length * 9 + 6;
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.35);
  doc.line((PAGE_W - lineWidth) / 2, lineY, (PAGE_W + lineWidth) / 2, lineY);
  doc.setLineWidth(0.2);

  /* 4. Rodapé fino crimson 0,5cm */
  const FOOTER_BAND_H = 5;
  doc.setFillColor(...RED);
  doc.rect(0, PAGE_H - FOOTER_BAND_H, PAGE_W, FOOTER_BAND_H, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Plataforma Gestão Ativa", PAGE_W / 2, PAGE_H - 1.5, { align: "center" });
  doc.setTextColor(0, 0, 0);
}

/* ---------------------------------------------------------------- público */

export interface GerarPgrPdfParams {
  documento: PgrDocumento;
  empresa: { nome: string; cnpj?: string | null; logo_url?: string | null };
  secoes: PgrSecao[];
  alteracoes: PgrAlteracao[];
  dadosAuto?: PgrDadosAutomaticos | null;
  dadosPsico?: PgrDadosPsicossociais | null;
  output?: "save" | "blob";
}

export async function gerarPgrPdf(params: GerarPgrPdfParams): Promise<Blob | void> {
  const { documento, empresa, secoes, alteracoes, dadosAuto, dadosPsico, output = "save" } = params;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = empresa.logo_url ? await loadImageAsDataUrl(empresa.logo_url) : null;

  const ctx: Ctx = {
    doc,
    y: HEADER_H + 5,
    empresa: empresa.nome,
    logo,
    geradoEm: new Date().toLocaleString("pt-BR"),
    sumario: [],
  };

  // 1. Capa
  capa(ctx, documento, empresa);

  // 2. Sumário (placeholder — página exclusiva, preenchida no fim)
  doc.addPage();
  const paginaSumario = doc.getNumberOfPages();

  // 3. Cada seção abre sua própria página (tituloSecao chama novaPagina)
  ctx.y = HEADER_H + 4;



  const ativas = secoes
    .filter((s) => s.ativo)
    .slice()
    .sort((a, b) => a.ordem - b.ordem);

  const cargos = (dadosAuto?.cargos ?? []) as Array<Record<string, any>>;
  const ghes = (dadosAuto?.ghes ?? []) as Array<Record<string, any>>;
  const descricoes = (dadosAuto?.descricoes_cargo ?? []) as Array<Record<string, any>>;
  const planos = (dadosAuto?.planos_acao ?? []) as Array<Record<string, any>>;

  const psicoRenderizado = { feito: false };

  for (const s of ativas) {
    const chave = s.chave_automatica ?? "";
    const ehPsico = (s.numero ?? "").startsWith("17");

    if (ehPsico) {
      // Sub-seções psicossociais: texto normal; anexa blocos de dados na primeira
      tituloSecao(ctx, s.numero, s.titulo, !psicoRenderizado.feito);
      paragrafo(ctx, htmlParaTexto(s.conteudo));
      if (!psicoRenderizado.feito && dadosPsico) {
        psicoRenderizado.feito = true;
        renderPsicossocial(ctx, dadosPsico);
      }
      continue;
    }

    // Só quebra página antes de blocos visuais grandes (tabelas/cards)
    const blocoGrande = s.tipo === "automatico" && ["inventario_ghe", "plano_acao"].includes(chave);
    tituloSecao(ctx, s.numero, s.titulo, blocoGrande);
    if (s.conteudo) paragrafo(ctx, htmlParaTexto(s.conteudo));


    if (s.tipo !== "automatico") continue;

    if (chave === "caracterizacao") {
      const linhas = cargos.map((c) => {
        const g = ghes.find((x) => x.id === c.ghe_id);
        return [g?.setor ?? "—", c.nome ?? "—", c.headcount ?? 0];
      });
      linhas.push(["Total", "", dadosAuto?.headcount_total ?? 0]);
      tabela(ctx, {
        head: [["Setor", "Cargo", "Nº de funcionários"]],
        body: linhas,
        widths: { 2: 32 },
      });
    } else if (chave === "relacao_cargos") {
      tabela(ctx, {
        head: [["Cargo", "Descrição de atividades"]],
        body: cargos.map((c) => {
          const d = descricoes.find((x) => x.cargo_id === c.id);
          const nome = c.cbo_codigo ? `${c.nome}\nCBO ${c.cbo_codigo}` : c.nome;
          return [nome, d?.descricao_sumaria || c.tarefa_prescrita || c.tarefa_real || "Descrição não cadastrada."];
        }),
        widths: { 0: 50 },
      });
    } else if (chave === "inventario_ghe") {
      renderInventarioGhe(ctx, ghes, cargos);
    } else if (chave === "plano_acao") {
      tabela(ctx, {
        head: [
          ["Nº", "Ação", "Obrigat.", "Responsável", "Método", "Data prev.", "Local", "Status", "Prior. (dias)"],
        ],
        body: planos.map((p, i) => [
          p.numero ?? i + 1,
          p.acao ?? "—",
          p.obrigatoriedade ?? "—",
          p.responsavel ?? "—",
          p.metodo ?? "—",
          dataBR(p.data_prevista),
          p.local ?? "—",
          p.status ?? "—",
          p.prioridade_dias ?? "—",
        ]),
        widths: { 0: 8, 5: 18, 8: 16 },
      });
    }
  }

  // Quadro de alterações
  tituloSecao(ctx, null, "Quadro de alterações", true);
  tabela(ctx, {
    head: [["Nº", "Data", "Histórico"]],
    body: alteracoes.map((a, i) => [a.numero ?? i + 1, dataBR(a.data), a.historico]),
    widths: { 0: 12, 1: 26 },
  });

  footer(ctx);

  // Preenche o sumário
  doc.setPage(paginaSumario);
  const ctxSum: Ctx = { ...ctx, y: HEADER_H + 5 };
  header(ctxSum);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("Sumário", M, ctxSum.y + 4);
  doc.setTextColor(0, 0, 0);
  let ys = ctxSum.y + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const item of ctx.sumario) {
    if (ys > BODY_LIMIT) break;
    const label = `${item.numero ? `${item.numero}. ` : ""}${item.titulo}`;
    const texto = doc.splitTextToSize(label, CONTENT_W - 18)[0] as string;
    doc.text(texto, M, ys);
    doc.setTextColor(...GREY);
    doc.text(String(item.pagina), PAGE_W - M, ys, { align: "right" });
    // linha pontilhada entre título e número
    const inicio = M + doc.getTextWidth(texto) + 2;
    const fimX = PAGE_W - M - 6;
    doc.setFontSize(9.5);
    let px = inicio;
    let pontos = "";
    const wPonto = doc.getTextWidth(".");
    while (px + wPonto < fimX) {
      pontos += ".";
      px += wPonto;
    }
    doc.setTextColor(...LIGHT_GREY);
    doc.text(pontos, inicio, ys);
    doc.setTextColor(0, 0, 0);
    ys += 6;
  }
  footer({ ...ctx, doc });

  const nome = `PGR_${slug(empresa.nome)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  if (output === "blob") return doc.output("blob");
  doc.save(nome);
}

function renderInventarioGhe(ctx: Ctx, ghes: Array<Record<string, any>>, cargos: Array<Record<string, any>>) {
  if (!ghes.length) {
    paragrafo(ctx, "Nenhum GHE cadastrado.");
    return;
  }
  for (const g of ghes) {
    const riscos = (g.riscos ?? []) as Array<Record<string, any>>;
    const cargosGhe = (g.cargos ?? []) as Array<Record<string, any>>;
    const headcount = cargos.filter((c) => c.ghe_id === g.id).reduce((a, c) => a + (c.headcount ?? 0), 0);

    garanteEspaco(ctx, 30);
    subtitulo(ctx, `${g.codigo ? `${g.codigo} — ` : ""}${g.nome ?? "GHE"}`);
    paragrafo(
      ctx,
      [
        `Local / setor: ${g.setor ?? "—"}`,
        `Atividade: ${g.descricao ?? "—"}`,
        `Exposição: ${g.tipo_exposicao ?? "—"}`,
        `Cargos: ${cargosGhe.length ? cargosGhe.map((c) => c.nome).join(", ") : "—"} · Nº de funcionários: ${headcount}`,
      ].join("\n"),
      8.5
    );

    if (!riscos.length) {
      paragrafo(ctx, "Nenhum risco vinculado a este GHE.", 8.5);
      continue;
    }

    tabela(ctx, {
      head: [["Grupo", "Perigo / risco", "S", "P", "Nível"]],
      body: riscos.map((r) => [
        r.categoria ?? "—",
        r.nome_risco ?? "—",
        r.severidade ?? "—",
        r.probabilidade ?? "—",
        `${nivelLabel(r.nivel_risco)}${r.nivel_risco != null ? ` (${r.nivel_risco})` : ""}`,
      ]),
      widths: { 2: 10, 3: 10, 4: 32 },
      colunaColorida: 4,
    });

    for (const r of riscos) {
      const d = (r.detalhes ?? {}) as Record<string, any>;
      const campos: Array<[string, string]> = [
        ["Fundamentação legal", d.fundamentacao_legal],
        ["Lesões / agravos", d.lesoes_agravos],
        ["Fontes e circunstâncias", d.fontes_circunstancias],
        ["Meio de propagação", d.meio_propagacao],
        ["Ações necessárias", d.acoes_necessarias],
        ["Observação", d.observacao],
      ].filter(([, v]) => !!v && String(v).trim()) as Array<[string, string]>;
      if (!campos.length) continue;

      garanteEspaco(ctx, 20);
      ctx.doc.setFont("helvetica", "bold");
      ctx.doc.setFontSize(8.5);
      ctx.doc.text(`Ficha de risco — ${r.nome_risco ?? ""}`, M, ctx.y);
      ctx.y += 4;
      tabela(ctx, { head: [["Campo", "Conteúdo"]], body: campos, widths: { 0: 42 } });
    }
  }
}

function renderPsicossocial(ctx: Ctx, psico: PgrDadosPsicossociais) {
  const dominios = psico.dominios ?? [];
  const setores = psico.resultados_por_setor ?? [];
  const planos = psico.planos_acao ?? [];

  garanteEspaco(ctx, 20);
  subtitulo(
    ctx,
    `Classificação geral: ${psico.classificacao_geral ?? "—"}${
      psico.score_ponderado != null ? ` (score ponderado ${psico.score_ponderado})` : ""
    }`
  );

  subtitulo(ctx, "Domínios psicossociais");
  tabela(ctx, {
    head: [["Domínio", "Grupo", "Peso", "Mediana", "Classificação"]],
    body: dominios.map((d) => [d.nome_dominio, d.grupo, d.peso, d.mediana ?? "—", d.classificacao ?? "—"]),
    widths: { 2: 14, 3: 18, 4: 30 },
    colunaColorida: 4,
  });

  subtitulo(ctx, "Resultados por setor");
  tabela(ctx, {
    head: [["Setor", "Respondentes", "Escala 1", "Escala 2", "Escala 3", "Escala 4"]],
    body: setores.map((s) => [
      s.setor,
      s.respondentes,
      s.escala_1 ?? "—",
      s.escala_2 ?? "—",
      s.escala_3 ?? "—",
      s.escala_4 ?? "—",
    ]),
    widths: { 1: 24 },
  });

  subtitulo(ctx, "Plano de ação psicossocial");
  tabela(ctx, {
    head: [["Nº", "Ação", "Obrigat.", "Responsável", "Método", "Data prev.", "Local", "Status", "Prior. (dias)"]],
    body: planos.map((p, i) => [
      p.numero ?? i + 1,
      p.acao,
      p.obrigatoriedade ?? "—",
      p.responsavel ?? "—",
      p.metodo ?? "—",
      dataBR(p.data_prevista),
      p.local ?? "—",
      p.status ?? "—",
      p.prioridade_dias ?? "—",
    ]),
    widths: { 0: 8, 5: 18, 8: 16 },
  });
}
