import { useEffect, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCuidarSignedUrl, type CuidarConteudo } from "@/hooks/useCuidarConteudos";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conteudo: CuidarConteudo;
  /** Para conteúdo URL do YouTube — usado pelo card. */
  youtubeId?: string | null;
}

function isPdf(mime: string | null | undefined): boolean {
  return !!mime && mime.includes("pdf");
}
function isVideo(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith("video/");
}
function isImage(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith("image/");
}

export function ConteudoPreviewModal({ open, onOpenChange, conteudo, youtubeId }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSignedUrl(null);
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    if (conteudo.origem !== "upload" || !conteudo.storage_path) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    getCuidarSignedUrl(conteudo.storage_path)
      .then(async (url) => {
        if (cancelled) return;
        setSignedUrl(url);
        // PDFs em iframe podem ser bloqueados por políticas de origem —
        // servimos a partir de um blob local.
        if (conteudo.mime_type?.includes("pdf")) {
          const res = await fetch(url);
          if (!res.ok) throw new Error("Falha ao carregar arquivo");
          const blob = await res.blob();
          if (cancelled) return;
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          toast.error(e?.message ?? "Falha ao carregar arquivo");
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, conteudo, onOpenChange]);


  const renderBody = () => {
    // YouTube
    if (youtubeId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title={conteudo.titulo}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (loading || !signedUrl) {
      return (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (isVideo(conteudo.mime_type)) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <video src={signedUrl} controls autoPlay className="h-full w-full" />
        </div>
      );
    }

    if (isPdf(conteudo.mime_type)) {
      if (!blobUrl) {
        return (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        );
      }
      return (
        <iframe
          src={blobUrl}
          title={conteudo.titulo}
          className="h-[70vh] w-full rounded-md border border-border"
        />
      );
    }


    if (isImage(conteudo.mime_type)) {
      return (
        <img
          src={signedUrl}
          alt={conteudo.titulo}
          className="mx-auto max-h-[70vh] rounded-md object-contain"
        />
      );
    }

    // Office docs / outros — abrir em nova aba (download se permitido)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <Download className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Este formato não pode ser pré-visualizado aqui.
        </p>
        <Button asChild>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={conteudo.permite_download !== false ? "" : undefined}
          >
            <Download className="mr-2 h-4 w-4" />
            {conteudo.permite_download !== false ? "Baixar arquivo" : "Abrir arquivo"}
          </a>
        </Button>
      </div>
    );
  };

  const mostrarDownload =
    conteudo.origem === "upload" && conteudo.permite_download !== false && !!signedUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{conteudo.titulo}</DialogTitle>
        </DialogHeader>
        {renderBody()}
        {mostrarDownload && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={signedUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-2 h-4 w-4" />
                Baixar material
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
