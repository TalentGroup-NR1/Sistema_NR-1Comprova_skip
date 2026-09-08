import { Component, lazy, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import { sanitizeRichText } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSignedUrl, type ComunicadoWithAnexos } from "@/hooks/useComunicados";
import { Download, Loader2, FileDown, Maximize2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PdfCanvasViewer = lazy(() =>
  import("./PdfCanvasViewer").then((module) => ({ default: module.PdfCanvasViewer }))
);

class MediaPdfErrorBoundary extends Component<
  { signed: string; nome: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ComunicadoFlyerDetail] erro ao renderizar PDF:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 border border-dashed border-border rounded-md">
          <Download className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center px-4">
            Não foi possível exibir o PDF neste dispositivo.
          </p>
          <a href={this.props.signed} target="_blank" rel="noopener noreferrer" className="text-sm underline text-primary">
            Baixar {this.props.nome}
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}

type MaterialKind = "pdf" | "image" | "video" | "other";

function detectKind(nome: string, tipo?: string | null): MaterialKind {
  const src = `${nome ?? ""}`.toLowerCase();
  const t = (tipo ?? "").toLowerCase();
  if (/\.pdf(\?|$)/.test(src) || t.includes("pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(src) || t.startsWith("image/")) return "image";
  if (/\.(mp4|webm|ogg|mov)(\?|$)/.test(src) || t.startsWith("video/")) return "video";
  return "other";
}

function renderMedia(kind: MaterialKind, url: string, nome: string, fullscreen = false) {
  if (kind === "pdf") {
    return (
      <div className={fullscreen ? "w-full h-full overflow-auto p-3" : "w-full"}>
        <MediaPdfErrorBoundary signed={url} nome={nome}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[60vh] w-full rounded-md border border-border bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <PdfCanvasViewer signed={url} nome={nome} />
          </Suspense>
        </MediaPdfErrorBoundary>
      </div>
    );
  }
  if (kind === "image") {
    return (
      <img
        src={url}
        alt={nome}
        className={fullscreen ? "max-w-full max-h-full object-contain mx-auto" : "w-full rounded-md border border-border object-contain"}
      />
    );
  }
  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        className={fullscreen ? "max-w-full max-h-full mx-auto bg-black" : "w-full rounded-md border border-border bg-black"}
      />
    );
  }
  return null;
}

function FullscreenViewer({
  open,
  onClose,
  kind,
  url,
  nome,
}: {
  open: boolean;
  onClose: () => void;
  kind: MaterialKind;
  url: string;
  nome: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 bg-background border-0 rounded-none flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
          <p className="text-sm font-medium truncate">{nome}</p>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className={`flex-1 ${kind === "image" ? "overflow-auto flex items-center justify-center bg-muted p-4" : "overflow-hidden"}`}>
          {renderMedia(kind, url, nome, true)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MaterialInlineComunicado({
  anexo,
}: {
  anexo: { id: string; nome_arquivo: string; url_arquivo: string; tipo_arquivo?: string | null };
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSignedUrl(anexo.url_arquivo).then((u) => {
      if (!mounted) return;
      setUrl(u);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [anexo.url_arquivo]);

  const kind = detectKind(anexo.nome_arquivo, anexo.tipo_arquivo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 border border-dashed border-border rounded-md">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
        Não foi possível carregar este anexo.
      </div>
    );
  }

  if (kind === "other") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-border rounded-md">
        <Download className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Este formato não pode ser exibido aqui.</p>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4 mr-2" />
            Baixar {anexo.nome_arquivo}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground truncate">{anexo.nome_arquivo}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFullscreen(true)}
              className="h-7 gap-1.5 text-xs"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Tela cheia
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
              <a href={url} target="_blank" rel="noopener noreferrer" download={anexo.nome_arquivo}>
                <Download className="h-3.5 w-3.5" />
                Baixar
              </a>
            </Button>
          </div>
        </div>
        <div
          className="cursor-zoom-in"
          onClick={() => setFullscreen(true)}
          role="button"
          tabIndex={0}
        >
          {renderMedia(kind, url, anexo.nome_arquivo)}
        </div>
      </div>
      <FullscreenViewer
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        kind={kind}
        url={url}
        nome={anexo.nome_arquivo}
      />
    </>
  );
}

interface ComunicadoFlyerDetailProps {
  comunicado: ComunicadoWithAnexos;
  isAdmin?: boolean;
}

export function ComunicadoFlyerDetail({ comunicado, isAdmin = false }: ComunicadoFlyerDetailProps) {
  const printRef = useRef<HTMLDivElement>(null);


  const handleShareWhatsApp = () => {
    const message = `📢 ${comunicado.titulo}\n\nConfira o novo comunicado no portal do colaborador!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${comunicado.titulo}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Manrope', sans-serif; background: white; }
          @page { margin: 10mm; size: A4; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const formattedDate = comunicado.data_publicacao
    ? format(new Date(comunicado.data_publicacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  const logoUrl = `${window.location.origin}/images/Logo_NR1_Transparente.png`;

  return (
    <div className="space-y-4">
      {/* Action Bar - Admin only */}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 no-print">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="gap-2 border-green-500/30 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      )}

      {/* Flyer Card - Printable */}
      <div
        ref={printRef}
        id="comunicado-arte-print"
        style={{ maxWidth: '768px', margin: '0 auto' }}
      >
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          {/* Header - Corporate Red */}
          <div style={{
            background: 'linear-gradient(135deg, #6b0000 0%, #c10000 50%, #8B0000 100%)',
            padding: '20px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src={logoUrl}
                alt="NR1-Pronto"
                style={{ height: '45px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '6px 14px',
              borderRadius: '20px',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Comunicado Oficial
            </div>
          </div>

          {/* Hero Image */}
          {comunicado.image_url && (
            <div style={{ width: '100%', height: '256px', overflow: 'hidden' }}>
              <SignedComunicadoImg
                src={comunicado.image_url}
                alt="Imagem de capa"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '32px' }}>
            {comunicado.is_pinned && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#fef3c7',
                color: '#92400e',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                marginBottom: '12px',
              }}>
                📌 Importante
              </div>
            )}

            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              lineHeight: '1.3',
              marginBottom: '12px',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {comunicado.titulo}
            </h1>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px',
              color: '#6b7280',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                👤 {comunicado.autor_nome}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                📅 {formattedDate}
              </span>
            </div>

            <div style={{ height: '1px', background: '#e5e7eb', marginBottom: '24px' }} />

            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              style={{ color: '#374151', lineHeight: '1.8', fontSize: '15px' }}
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(comunicado.conteudo) }}
            />

            {comunicado.comunicados_anexos && comunicado.comunicados_anexos.length > 0 && (
              <div className="no-print" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                  📎 Anexos
                </p>
                <div className="space-y-5">
                  {comunicado.comunicados_anexos.map((anexo) => (
                    <MaterialInlineComunicado
                      key={anexo.id}
                      anexo={{
                        id: anexo.id,
                        nome_arquivo: anexo.nome_arquivo,
                        url_arquivo: anexo.url_arquivo,
                        tipo_arquivo: anexo.tipo_arquivo,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #e5e7eb',
            padding: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f9fafb',
          }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>
              Gerado via NR1-Pronto
            </span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {formattedDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
