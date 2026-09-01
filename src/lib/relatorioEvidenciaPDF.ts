import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { getShareBaseUrl } from "@/lib/appUrl";

// Tenta baixar a URL. Se for um link público para um bucket privado do Supabase
// Storage (retorna 400/404 "Bucket not found"), refaz via signed URL.
async function fetchAnexoBytes(url: string): Promise<ArrayBuffer> {
  let res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (m) {
      const bucket = m[1];
      const path = decodeURIComponent(m[2]);
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
      if (!error && data?.signedUrl) {
        res = await fetch(data.signedUrl, { cache: "no-store" });
      }
    }
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.arrayBuffer();
}

export type EvidenciaTipo = "comunicado" | "campanha";

export interface EvidenciaAnexo {
  nome: string;
  url?: string | null;
  tipo?: string | null;
  tamanho?: number | null;
}

export interface EvidenciaRow {
  nome: string;
  cpf?: string | null;
  matricula?: string | null;
  email_pessoal?: string | null;
  departamento?: string | null;
  cargo?: string | null;
  lido: boolean;
  lido_em?: string | null;
}

export interface EvidenciaItem {
  id: string;
  titulo: string;
  // Comunicado
  conteudo_html?: string | null;
  data_publicacao?: string | null;
  autor_nome?: string | null;
  is_pinned?: boolean;
  publico_alvo_tipo?: string | null;
  publico_alvo_valor?: string | null;
  // Campanha
  descricao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  imagem_url?: string | null;
  // Comum
  anexos?: EvidenciaAnexo[] | null;
}

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

export interface GerarRelatorioParams {
  tipo: EvidenciaTipo;
  item: EvidenciaItem;
  rows: EvidenciaRow[];
  empresa: EvidenciaEmpresa;
  emitente: EvidenciaEmitente;
  verificacaoUrlBase?: string; // ex: https://nr1pronto.com.br
}

// Paleta NR1-Pronto
const PRIMARY: [number, number, number] = [139, 0, 0]; // vermelho corporativo #8B0000
const DARK: [number, number, number] = [31, 41, 55]; // cinza escuro #1F2937
const ACCENT: [number, number, number] = [197, 165, 114]; // dourado #C5A572
const MUTED: [number, number, number] = [110, 110, 120];
const SUCCESS: [number, number, number] = [22, 130, 70];
const WARNING: [number, number, number] = [180, 90, 20];
const ZEBRA: [number, number, number] = [248, 249, 251];

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) + " (BRT)";
  } catch {
    return "—";
  }
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

function fmtBytes(n?: number | null) {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// Remove emojis e caracteres fora do WinAnsi (helvetica do jsPDF não renderiza,
// resultando em glifos "lixo" como 'dþ e quebras de largura inesperadas).
function sanitizeText(input?: string | null): string {
  if (input == null) return "";
  let s = String(input);
  // Remove surrogate pairs (emojis fora do BMP)
  s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "");
  // Remove pictográficos/símbolos no BMP que não existem no WinAnsi
  s = s.replace(/[\u2600-\u27BF\u2B00-\u2BFF\u2300-\u23FF\uFE0F\u200D]/g, "");
  // Substitui qualquer outro caractere fora do Latin-1 (>0xFF) por espaço
  s = s.replace(/[^\x00-\xFF]/g, " ");
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

function mascararCPF(cpf?: string | null): string {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function publicoAlvoLabel(tipo?: string | null, valor?: string | null) {
  if (!tipo || tipo === "todos") return "Todos os colaboradores";
  if (tipo === "departamento") return `Departamento: ${valor || "—"}`;
  if (tipo === "cargo") return `Cargo: ${valor || "—"}`;
  return `${tipo}${valor ? `: ${valor}` : ""}`;
}

// Parser HTML → segmentos com formatação básica
type Segment = { text: string; bold?: boolean; italic?: boolean; bullet?: boolean; heading?: boolean };

function htmlToSegments(html?: string | null): Segment[] {
  if (!html || !html.trim()) return [];
  let s = html
    .replace(/\r\n?/g, "\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<(ul|ol)[^>]*>/gi, "\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<(strong|b)>/gi, "[[B]]")
    .replace(/<\/(strong|b)>/gi, "[[/B]]")
    .replace(/<(em|i)>/gi, "[[I]]")
    .replace(/<\/(em|i)>/gi, "[[/I]]")
    .replace(/<h[1-6][^>]*>/gi, "[[H]]")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = s.split("\n");
  const segs: Segment[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      segs.push({ text: "" });
      continue;
    }
    const heading = line.startsWith("[[H]]");
    const bullet = line.trimStart().startsWith("•");
    const cleaned = line.replace(/\[\[H\]\]/g, "");
    // Detect bold/italic at line level (simple heuristic: any marker)
    const hasBold = /\[\[B\]\]/.test(cleaned);
    const hasItalic = /\[\[I\]\]/.test(cleaned);
    const text = sanitizeText(cleaned.replace(/\[\[\/?[BIH]\]\]/g, ""));
    segs.push({ text, bold: heading || hasBold, italic: hasItalic, bullet, heading });
  }
  return segs;
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256HexFromBytes(bytes: ArrayBuffer): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface LoadedImage {
  dataUrl: string;
  w: number;
  h: number;
}

async function loadImage(url?: string | null): Promise<LoadedImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
    if (!dataUrl) return null;
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    if (!dims.w || !dims.h) return null;
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

async function fetchHash(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return await sha256HexFromBytes(buf);
  } catch {
    return null;
  }
}

function fitImage(img: LoadedImage, maxW: number, maxH: number) {
  const ratio = img.w / img.h;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return { w, h };
}

export async function gerarRelatorioEvidenciaPDF(params: GerarRelatorioParams) {
  const { tipo, rows, verificacaoUrlBase } = params;
  // Sanitiza campos vindos do usuário (remove emojis e chars fora do WinAnsi)
  const item: EvidenciaItem = {
    ...params.item,
    titulo: sanitizeText(params.item.titulo),
    autor_nome: sanitizeText(params.item.autor_nome),
    publico_alvo_valor: sanitizeText(params.item.publico_alvo_valor),
  };
  const empresa: EvidenciaEmpresa = {
    ...params.empresa,
    name: sanitizeText(params.empresa.name),
  };
  const emitente: EvidenciaEmitente = {
    ...params.emitente,
    nome: sanitizeText(params.emitente.nome),
    cargo: sanitizeText(params.emitente.cargo),
  };
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;

  const now = new Date();
  const geradoEm = fmtDateTime(now.toISOString());
  const tipoLabel = tipo === "comunicado" ? "Comunicado Interno" : "Campanha de Comunicação";

  const conteudoSegments =
    tipo === "comunicado"
      ? htmlToSegments(item.conteudo_html)
      : htmlToSegments(item.descricao);

  const conteudoTextoIntegridade = conteudoSegments.map((s) => s.text).join("\n").trim();

  const hashConteudo = await sha256Hex(
    `${tipo}|${item.id}|${item.titulo}|${conteudoTextoIntegridade}`
  );
  const docId = `${tipo.toUpperCase()}-${item.id.slice(0, 8).toUpperCase()}-${format(
    now,
    "yyyyMMddHHmmss"
  )}`;
  const hashCurto = hashConteudo.slice(0, 16).toUpperCase();

  const talentLogo = await loadImage("/images/nr1-pronto-logo.png");

  // QR Code de verificação (renderizado no rodapé da ÚLTIMA página)
  const baseUrl = params.verificacaoUrlBase || getShareBaseUrl();
  const verificacaoPayload = `TALENT-EVID|${tipo}|${docId}|${hashCurto}|${baseUrl}/comunicados?verificar=${docId}`;
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(verificacaoPayload, {
      margin: 1,
      width: 220,
      color: { dark: "#1F2937", light: "#FFFFFF" },
    });
  } catch {
    qrDataUrl = null;
  }

  // Estatísticas
  const total = rows.length;
  const lidos = rows.filter((r) => r.lido).length;
  const pendentes = total - lidos;
  const pct = total ? Math.round((lidos / total) * 100) : 0;

  // ============================================================
  // CAPA — Cabeçalho compacto (50pt) com logo + nome filial
  // ============================================================
  const HEADER_H = 50;
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, HEADER_H, "F");
  doc.setFillColor(...ACCENT);
  doc.rect(0, HEADER_H, pageW, 2, "F");

  // Logo institucional NR1-Pronto (esquerda) — altura máx 30pt
  if (talentLogo) {
    const { w, h } = fitImage(talentLogo, 130, 30);
    try {
      doc.addImage(talentLogo.dataUrl, "PNG", M, (HEADER_H - h) / 2, w, h);
    } catch {
      /* ignore */
    }
  }

  // Nome da empresa filial + CNPJ (direita)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const empNomeWrap = doc.splitTextToSize((empresa.name || "—").toUpperCase(), pageW / 2 - M);
  doc.text(empNomeWrap[0] || "—", pageW - M, 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`CNPJ: ${empresa.cnpj || "—"}`, pageW - M, 36, { align: "right" });

  // Título
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("RELATÓRIO DE EVIDÊNCIA", pageW / 2, 100, { align: "center" });
  doc.text("DE LEITURA", pageW / 2, 126, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(tipoLabel.toUpperCase(), pageW / 2, 152, { align: "center" });

  // Box de identificação — altura calculada dinamicamente
  const idBoxY = 180;
  const idLabelW = 160;
  const idValueW = pageW - M * 2 - idLabelW - 16;

  const emitenteLinha = emitente.cargo
    ? `${emitente.nome} — ${emitente.cargo}`
    : emitente.nome;

  const linhas: Array<[string, string]> = [
    ["Identificador:", docId],
    ["Assunto:", item.titulo],
    ["Emitido em:", geradoEm],
    ["Emitido por:", emitenteLinha],
    ["E-mail do emitente:", emitente.email],
    ["Empresa:", `${empresa.name || "—"} — CNPJ ${empresa.cnpj || "—"}`],
    ["Hash SHA-256 (conteúdo):", hashCurto + "…"],
  ];

  const lineGap = 14;
  let idContentH = 0;
  const wrappedRows = linhas.map(([k, v]) => {
    const wrapped = doc.splitTextToSize(v, idValueW);
    const h = Math.max(lineGap, wrapped.length * lineGap) + 4;
    idContentH += h;
    return { k, wrapped, h };
  });
  const idBoxH = idContentH + 44;

  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, idBoxY, pageW - M * 2, idBoxH, 6, 6, "S");

  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFICAÇÃO DO DOCUMENTO", M + 16, idBoxY + 22);

  let y = idBoxY + 44;
  wrappedRows.forEach(({ k, wrapped, h }) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.text(k, M + 16, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(wrapped, M + 16 + idLabelW, y);
    y += h;
  });

  // Bloco INFORMAÇÕES DA PUBLICAÇÃO — posicionado após box de identificação
  const pubY = idBoxY + idBoxH + 16;
  const pubLinhas: Array<[string, string]> = [];
  if (tipo === "comunicado") {
    pubLinhas.push(["Publicado em:", fmtDateTime(item.data_publicacao)]);
    pubLinhas.push(["Público-alvo:", publicoAlvoLabel(item.publico_alvo_tipo, item.publico_alvo_valor)]);
    pubLinhas.push(["Prioridade:", item.is_pinned ? "Fixado / Prioritário" : "Padrão"]);
  } else {
    pubLinhas.push(["Início da vigência:", fmtDate(item.data_inicio)]);
    pubLinhas.push(["Fim da vigência:", fmtDate(item.data_fim)]);
  }
  pubLinhas.push([
    "Adesão:",
    `${lidos} de ${total} colaboradores (${pct}%) — ${pendentes} pendente(s)`,
  ]);

  // Pré-calcular altura
  const pubWrapped = pubLinhas.map(([k, v]) => {
    const wrapped = doc.splitTextToSize(v, pageW - M * 2 - idLabelW - 16);
    return { k, wrapped, h: Math.max(lineGap, wrapped.length * lineGap) + 2 };
  });
  const pubBoxH = pubWrapped.reduce((acc, r) => acc + r.h, 0) + 40;

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(M, pubY, pageW - M * 2, pubBoxH, 6, 6, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10);
  doc.text("INFORMAÇÕES DA PUBLICAÇÃO", M + 16, pubY + 22);

  let py = pubY + 42;
  pubWrapped.forEach(({ k, wrapped, h }) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    doc.text(k, M + 16, py);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(wrapped, M + 16 + idLabelW, py);
    py += h;
  });

  // Finalidade
  const finY = pubY + pubBoxH + 24;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10);
  doc.text("FINALIDADE", M, finY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  const finalidade =
    "Este documento constitui evidência eletrônica da ciência inequívoca do conteúdo abaixo identificado " +
    "por parte dos colaboradores listados, registrada por meio de login autenticado na plataforma Talent. " +
    "Tem finalidade probatória para fins administrativos, internos e em eventual fiscalização trabalhista, " +
    "em conformidade com a CLT e com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). A integridade " +
    "do conteúdo divulgado é assegurada pelo hash criptográfico SHA-256 registrado nesta capa.";
  doc.text(doc.splitTextToSize(finalidade, pageW - M * 2), M, finY + 18);

  // (QR Code removido da capa — agora renderizado no rodapé da última página)


  // ============================================================
  // PÁGINA 2 — CONTEÚDO
  // ============================================================
  doc.addPage();
  drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);

  let cy = 75;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(14);
  doc.text("1. CONTEÚDO DIVULGADO", M, cy);
  cy += 8;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(1);
  doc.line(M, cy, M + 80, cy);
  cy += 22;

  // Tag fixado
  if (tipo === "comunicado" && item.is_pinned) {
    const tagText = "COMUNICADO PRIORITÁRIO — FIXADO";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const tw = doc.getTextWidth(tagText) + 16;
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(M, cy - 12, tw, 18, 9, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(tagText, M + 8, cy);
    cy += 22;
  }

  // Tipo / título
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.text("TIPO", M, cy);
  doc.text("TÍTULO", M + 160, cy);
  cy += 14;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.text(tipoLabel, M, cy);
  const tituloWrap = doc.splitTextToSize(item.titulo, pageW - M * 2 - 160);
  doc.text(tituloWrap, M + 160, cy);
  cy += Math.max(18, tituloWrap.length * 12) + 12;

  // Metadados
  const meta: Array<[string, string]> = [];
  if (tipo === "comunicado") {
    meta.push(["Autor / Responsável", item.autor_nome || "—"]);
    meta.push(["Data de publicação", fmtDateTime(item.data_publicacao)]);
    meta.push(["Público-alvo", publicoAlvoLabel(item.publico_alvo_tipo, item.publico_alvo_valor)]);
  } else {
    meta.push(["Início da campanha", fmtDate(item.data_inicio)]);
    meta.push(["Fim da campanha", fmtDate(item.data_fim)]);
  }

  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...MUTED);
    doc.setFontSize(8.5);
    doc.text(k.toUpperCase(), M, cy);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    const wrap = doc.splitTextToSize(v, pageW - M * 2 - 180);
    doc.text(wrap, M + 180, cy);
    cy += Math.max(16, wrap.length * 12) + 4;
  });

  cy += 14;

  // Conteúdo integral
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(11);
  doc.text("Conteúdo integral divulgado:", M, cy);
  cy += 16;

  const lineH = 14;
  const renderSegments = (segments: Segment[]) => {
    if (!segments.length || segments.every((s) => !s.text.trim())) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text("Conteúdo não disponível no banco — consultar a plataforma.", M + 12, cy);
      cy += lineH;
      return;
    }
    segments.forEach((seg) => {
      if (!seg.text.trim()) {
        cy += lineH / 2;
        return;
      }
      const fontStyle =
        seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(seg.heading ? 12 : 10);
      doc.setTextColor(...DARK);
      const indent = seg.bullet ? 24 : 12;
      const maxW = pageW - M * 2 - indent - 12;
      const lines = doc.splitTextToSize(seg.text, maxW);
      lines.forEach((ln: string) => {
        if (cy > pageH - 90) {
          doc.addPage();
          drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
          cy = 75;
        }
        doc.text(ln, M + indent, cy);
        cy += lineH;
      });
    });
  };
  renderSegments(conteudoSegments);
  cy += 14;

  // Pré-visualização de anexos de imagem (PNG/JPG/WEBP) — embed inline
  const anexosTodos = item.anexos || [];
  const isImg = (a: EvidenciaAnexo) => {
    const t = (a.tipo || "").toLowerCase();
    const n = (a.nome || "").toLowerCase();
    return t.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(n);
  };
  const anexosImagens = anexosTodos.filter(isImg);
  if (anexosImagens.length) {
    if (cy > pageH - 200) {
      doc.addPage();
      drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
      cy = 75;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRIMARY);
    doc.setFontSize(11);
    doc.text("Pré-visualização de anexos:", M, cy);
    cy += 14;

    for (const anx of anexosImagens) {
      const loaded = await loadImage(anx.url);
      if (!loaded) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(
          `• ${anx.nome || "anexo"} — anexo indisponível para visualização no momento`,
          M + 12,
          cy
        );
        cy += 14;
        continue;
      }
      const maxW = Math.min(pageW - M * 2, 360); // ~500px ≈ 360pt
      const maxH = pageH - 140;
      const { w, h } = fitImage(loaded, maxW, maxH);
      if (cy + h + 24 > pageH - 70) {
        doc.addPage();
        drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
        cy = 75;
      }
      const x = (pageW - w) / 2;
      try {
        const fmt = (anx.tipo || "").toLowerCase().includes("jpeg") || /\.jpe?g$/i.test(anx.nome || "")
          ? "JPEG"
          : "PNG";
        doc.addImage(loaded.dataUrl, fmt, x, cy, w, h);
      } catch {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(`• ${anx.nome || "anexo"} — falha ao incorporar imagem`, M + 12, cy);
        cy += 14;
        continue;
      }
      cy += h + 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(anx.nome || "anexo", pageW / 2, cy, { align: "center" });
      cy += 18;
    }
  }


  // ============================================================
  // ANEXOS
  // ============================================================
  const anexos = item.anexos || [];
  if (anexos.length) {
    if (cy > pageH - 200) {
      doc.addPage();
      drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
      cy = 75;
    }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PRIMARY);
    doc.setFontSize(12);
    doc.text("DOCUMENTO(S) ANEXO(S)", M, cy);
    cy += 6;
    doc.setDrawColor(...ACCENT);
    doc.line(M, cy, M + 60, cy);
    cy += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      "Arquivos originais armazenados na plataforma. Hash SHA-256 abaixo permite verificação de integridade.",
      M,
      cy
    );
    cy += 14;

    // Calcular hashes em paralelo
    const hashes = await Promise.all(anexos.map((a) => fetchHash(a.url)));

    const body = anexos.map((a, i) => [
      String(i + 1),
      a.nome || "—",
      a.tipo || "—",
      fmtBytes(a.tamanho),
      hashes[i] ? hashes[i]!.slice(0, 32) + "…" : "hash indisponível",
    ]);

    autoTable(doc, {
      startY: cy,
      head: [["#", "Arquivo", "Tipo", "Tamanho", "SHA-256"]],
      body,
      styles: { fontSize: 8, cellPadding: 5, valign: "middle", lineColor: [220, 220, 225], lineWidth: 0.3 },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { cellWidth: 22, halign: "center" },
        1: { cellWidth: 180 },
        2: { cellWidth: 80 },
        3: { cellWidth: 60, halign: "right" },
        4: { cellWidth: "auto", font: "courier", fontSize: 7 },
      },
      margin: { left: M, right: M, bottom: 60 },
      didDrawPage: () => drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo),
    });
    cy = (doc as any).lastAutoTable.finalY + 18;
  }

  // Hash integridade do conteúdo
  if (cy > pageH - 90) {
    doc.addPage();
    drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
    cy = 75;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10);
  doc.text("Hash de integridade do conteúdo (SHA-256):", M, cy);
  cy += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(doc.splitTextToSize(hashConteudo, pageW - M * 2), M, cy);

  // ============================================================
  // EVIDÊNCIAS DE LEITURA
  // ============================================================
  doc.addPage();
  drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);

  let ty = 75;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(14);
  doc.text("2. EVIDÊNCIAS DE LEITURA", M, ty);
  ty += 8;
  doc.setDrawColor(...ACCENT);
  doc.line(M, ty, M + 80, ty);
  ty += 24;

  const cardW = (pageW - M * 2 - 24) / 4;
  const cardH = 52;
  const resumo: Array<[string, string, [number, number, number]]> = [
    ["Destinatários", String(total), DARK],
    ["Lidos", String(lidos), SUCCESS],
    ["Pendentes", String(pendentes), WARNING],
    ["Adesão", `${pct}%`, PRIMARY],
  ];
  resumo.forEach(([label, val, color], i) => {
    const x = M + i * (cardW + 8);
    doc.setDrawColor(220, 220, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, ty, cardW, cardH, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.setFontSize(18);
    doc.text(val, x + 12, ty + 28);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text(label, x + 12, ty + 44);
  });
  ty += cardH + 24;

  const sorted = [...rows].sort((a, b) => {
    if (a.lido !== b.lido) return a.lido ? -1 : 1;
    return a.nome.localeCompare(b.nome);
  });

  const body = sorted.map((r, i) => [
    String(i + 1),
    sanitizeText(r.nome) || "—",
    mascararCPF(r.cpf),
    sanitizeText(r.matricula) || "—",
    sanitizeText(r.email_pessoal) || "—",
    [sanitizeText(r.departamento) || "—", sanitizeText(r.cargo) || "—"].join("\n"),
    r.lido ? "LIDO" : "PENDENTE",
    r.lido_em ? fmtDateTime(r.lido_em) : "—",
  ]);

  autoTable(doc, {
    startY: ty,
    head: [["#", "Colaborador", "CPF", "Matrícula", "Login (e-mail)", "Depto / Cargo", "Status", "Data/hora da leitura"]],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      valign: "middle",
      lineColor: [225, 225, 230],
      lineWidth: 0.25,
    },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 95 },
      2: { cellWidth: 70 },
      3: { cellWidth: 50 },
      4: { cellWidth: 105 },
      5: { cellWidth: 80 },
      6: { cellWidth: 50, halign: "center", fontStyle: "bold" },
      7: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const v = String(data.cell.raw);
        if (v === "LIDO") data.cell.styles.textColor = SUCCESS;
        else data.cell.styles.textColor = WARNING;
      }
    },
    margin: { left: M, right: M, bottom: 130 },
    didDrawPage: () => drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo),
  });


  // QR Code de verificação — rodapé da ÚLTIMA página
  if (qrDataUrl) {
    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    let qy = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : pageH - 200;
    const qrSize = 80;
    if (qy + qrSize + 40 > pageH - 60) {
      doc.addPage();
      drawHeader(doc, pageW, M, empresa.name || "", empresa.cnpj || "", docId, talentLogo);
      qy = 100;
    }
    const qrX = (pageW - qrSize) / 2;
    try {
      doc.addImage(qrDataUrl, "PNG", qrX, qy, qrSize, qrSize);
    } catch {
      /* ignore */
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(
      "Escaneie o QR Code para verificar a autenticidade deste documento na plataforma Talent.",
      pageW / 2,
      qy + qrSize + 16,
      { align: "center" }
    );
  }

  // Rodapé em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, pageW, pageH, M, geradoEm, hashCurto, p, totalPages);
  }


  const fileSafe = item.titulo.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").slice(0, 60);
  const fileName = `Evidencia_${tipo}_${fileSafe}_${format(now, "yyyyMMdd_HHmm")}.pdf`;

  // ============================================================
  // ANEXAR DOCUMENTOS ORIGINAIS (PDFs) AO FINAL DO RELATÓRIO
  // ============================================================
  const isPdf = (a: EvidenciaAnexo) => {
    const t = (a.tipo || "").toLowerCase();
    const n = (a.nome || "").toLowerCase();
    return t.includes("pdf") || /\.pdf$/i.test(n);
  };
  const anexosPdf = (item.anexos || []).filter((a) => a.url && isPdf(a));

  if (!anexosPdf.length) {
    doc.save(fileName);
    return;
  }

  try {
    const baseBytes = doc.output("arraybuffer");
    const merged = await PDFDocument.load(baseBytes);
    const helvBold = await merged.embedFont(StandardFonts.HelveticaBold);
    const helv = await merged.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < anexosPdf.length; i++) {
      const anx = anexosPdf[i];
      // Página separadora
      const sep = merged.addPage([595.28, 841.89]); // A4
      const { width, height } = sep.getSize();
      sep.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: rgb(0.545, 0, 0) });
      sep.drawText(`ANEXO ${i + 1} DE ${anexosPdf.length}`, {
        x: 60, y: height - 120, size: 10, font: helvBold, color: rgb(0.545, 0, 0),
      });
      sep.drawText("DOCUMENTO ORIGINAL ANEXADO", {
        x: 60, y: height - 145, size: 18, font: helvBold, color: rgb(0.12, 0.16, 0.21),
      });
      sep.drawRectangle({ x: 60, y: height - 158, width: 80, height: 2, color: rgb(0.772, 0.647, 0.447) });

      const nomeWrap = sanitizeText(anx.nome || "arquivo.pdf");
      sep.drawText("Nome do arquivo:", { x: 60, y: height - 200, size: 9, font: helvBold, color: rgb(0.43, 0.43, 0.47) });
      sep.drawText(nomeWrap.slice(0, 90), { x: 60, y: height - 215, size: 11, font: helv, color: rgb(0.12, 0.16, 0.21) });

      sep.drawText("Identificador do relatório:", { x: 60, y: height - 250, size: 9, font: helvBold, color: rgb(0.43, 0.43, 0.47) });
      sep.drawText(docId, { x: 60, y: height - 265, size: 10, font: helv, color: rgb(0.12, 0.16, 0.21) });

      sep.drawText(
        "As páginas a seguir reproduzem o conteúdo integral do arquivo original,",
        { x: 60, y: 120, size: 9, font: helv, color: rgb(0.43, 0.43, 0.47) }
      );
      sep.drawText(
        "preservado para fins de evidência e auditoria.",
        { x: 60, y: 108, size: 9, font: helv, color: rgb(0.43, 0.43, 0.47) }
      );

      // Mesclar páginas do PDF anexo
      try {
        const bytes = await fetchAnexoBytes(anx.url!);
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copied = await merged.copyPages(src, src.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
      } catch (e: any) {
        console.error("[Evidencia] falha ao incorporar anexo PDF:", anx.nome, e);
        const errPage = merged.addPage([595.28, 841.89]);
        const { height: eh } = errPage.getSize();
        errPage.drawText("Não foi possível incorporar este anexo ao relatório.", {
          x: 60, y: eh - 200, size: 11, font: helvBold, color: rgb(0.7, 0.1, 0.1),
        });
        errPage.drawText(`Arquivo: ${sanitizeText(anx.nome || "anexo.pdf")}`, {
          x: 60, y: eh - 220, size: 10, font: helv, color: rgb(0.12, 0.16, 0.21),
        });
        errPage.drawText(`Motivo: ${sanitizeText(e?.message || "erro desconhecido")}`, {
          x: 60, y: eh - 236, size: 9, font: helv, color: rgb(0.43, 0.43, 0.47),
        });
      }
    }

    const finalBytes = await merged.save();
    const blob = new Blob([finalBytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) {
    // Fallback: salva sem mesclar
    doc.save(fileName);
  }
}

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
  // Faixa fina vermelha
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 3, "F");

  // Logo institucional NR1-Pronto (esquerda) — altura máx 25pt
  if (talentLogo) {
    const { w, h } = fitImage(talentLogo, 95, 25);
    try {
      doc.addImage(talentLogo.dataUrl, "PNG", M, 8 + (25 - h) / 2, w, h);
    } catch {
      /* ignore */
    }
  }

  // Empresa filial + CNPJ (direita) — centralizado verticalmente
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
  doc.line(M, pageH - 50, pageW - M, pageH - 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Documento gerado eletronicamente pela plataforma Talent — ${geradoEm}`,
    M,
    pageH - 34
  );
  doc.text(`Hash: ${hashCurto}…`, M, pageH - 22);
  doc.text(`Página ${page} de ${total}`, pageW - M, pageH - 22, { align: "right" });
}
