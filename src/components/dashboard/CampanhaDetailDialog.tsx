import { Component, lazy, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ImageIcon, Paperclip, Download, CheckCircle2, Loader2, Maximize2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Campanha, CampanhaStatus, CampanhaMaterial } from "@/hooks/useCampanhasComunicados";
import { useRegistrarLeituraCampanha } from "@/hooks/useCampanhasObrigatorias";
import { toast } from "sonner";

const PdfCanvasViewer = lazy(() =>
  import("@/components/comunicados/PdfCanvasViewer").then((module) => ({ default: module.PdfCanvasViewer }))
);

class CampanhaPdfErrorBoundary extends Component<
  { signed: string; nome: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[CampanhaDetailDialog] erro ao renderizar PDF:", error);
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campanha: (Campanha & { status?: CampanhaStatus }) | null;
}

type MaterialKind = "pdf" | "image" | "video" | "other";

function detectKind(m: CampanhaMaterial): MaterialKind {
  const src = `${m.nome ?? ""} ${m.url ?? ""}`.toLowerCase();
  if (/\.pdf(\?|$)/.test(src) || m.tipo?.includes("pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(src) || m.tipo?.startsWith("image/")) return "image";
  if (/\.(mp4|webm|ogg|mov)(\?|$)/.test(src) || m.tipo?.startsWith("video/")) return "video";
  return "other";
}

function renderMedia(kind: MaterialKind, url: string, nome: string, fullscreen = false) {
  if (kind === "pdf") {
    return (
      <div className={fullscreen ? "h-full w-full overflow-auto bg-muted p-3" : "w-full"}>
        <CampanhaPdfErrorBoundary signed={url} nome={nome}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[60vh] w-full rounded-md border border-border bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <PdfCanvasViewer signed={url} nome={nome} />
          </Suspense>
        </CampanhaPdfErrorBoundary>
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
        <div className={`flex-1 ${kind === "image" ? "overflow-auto flex items-center justify-center bg-muted p-4" : "overflow-auto"}`}>
          {renderMedia(kind, url, nome, true)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MaterialInline({ material }: { material: CampanhaMaterial }) {
  const [fullscreen, setFullscreen] = useState(false);
  const signed = useSignedComunicadoMediaUrl(material.url);
  const kind = detectKind(material);

  if (!signed) {
    return <div className="h-40 w-full rounded-md border border-dashed border-border bg-muted/30 animate-pulse" />;
  }

  if (kind === "other") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 border border-dashed border-border rounded-md">
        <Download className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Este formato não pode ser exibido aqui.</p>
        <Button asChild variant="outline" size="sm">
          <a href={signed} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4 mr-2" />
            Baixar {material.nome}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-end gap-1">
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
            <a href={signed} target="_blank" rel="noopener noreferrer" download={material.nome}>
              <Download className="h-3.5 w-3.5" />
              Baixar
            </a>
          </Button>
        </div>
        <div
          className="cursor-zoom-in"
          onClick={() => setFullscreen(true)}
          role="button"
          tabIndex={0}
        >
          {renderMedia(kind, signed, material.nome)}
        </div>
      </div>
      <FullscreenViewer
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        kind={kind}
        url={signed}
        nome={material.nome}
      />
    </>
  );
}

export function CampanhaDetailDialog({ open, onOpenChange, campanha }: Props) {
  const registrar = useRegistrarLeituraCampanha();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const materiais: CampanhaMaterial[] = useMemo(
    () => (Array.isArray(campanha?.materiais) ? (campanha!.materiais as CampanhaMaterial[]) : []),
    [campanha],
  );

  useEffect(() => {
    if (!open) return;
    setReachedEnd(false);
    setConfirmed(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open, campanha?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const check = () => {
      if (el.scrollHeight <= el.clientHeight + 10) setReachedEnd(true);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, campanha?.id, materiais.length]);

  if (!campanha) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) setReachedEnd(true);
  };

  const handleConfirm = async () => {
    try {
      await registrar.mutateAsync(campanha.id);
      setConfirmed(true);
      toast.success("Leitura confirmada!");
      setTimeout(() => onOpenChange(false), 800);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao confirmar leitura");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="w-full bg-muted shrink-0">
          {campanha.imagem_url ? (
            <SignedComunicadoImg
              src={campanha.imagem_url}
              alt={campanha.titulo}
              className="w-full max-h-64 object-cover"
            />
          ) : (
            <div className="w-full h-40 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="font-display text-2xl leading-tight">
                {campanha.titulo}
              </DialogTitle>
              {campanha.status && <Badge className="capitalize">{campanha.status}</Badge>}
            </div>
            <DialogDescription className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {format(parseISO(campanha.data_inicio), "dd 'de' MMMM", { locale: ptBR })} —{" "}
              {format(parseISO(campanha.data_fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {campanha.descricao ? (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
              {campanha.descricao}
            </p>
          ) : null}

          {materiais.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Material ({materiais.length})
              </h4>
              <div className="space-y-4">
                {materiais.map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground truncate">{m.nome}</p>
                    <MaterialInline material={m} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!reachedEnd && (
            <p className="text-center text-xs text-muted-foreground italic pt-4">
              Role até o final para habilitar a confirmação de leitura.
            </p>
          )}
          <div className="h-2" />
        </div>

        <div className="px-6 py-4 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-card shrink-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {confirmed ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Leitura registrada
              </>
            ) : reachedEnd ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Pronto para confirmar
              </>
            ) : (
              "Aguardando rolagem completa..."
            )}
          </p>
          <Button
            onClick={handleConfirm}
            disabled={!reachedEnd || registrar.isPending || confirmed}
            size="lg"
            className="w-full sm:w-auto min-h-[44px]"
          >
            {registrar.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmed ? "Leitura confirmada" : "Confirmar leitura"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
