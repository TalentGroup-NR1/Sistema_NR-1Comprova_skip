import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
// Vite-native: copia o worker do pacote pdfjs-dist para os assets do build com hash,
// garantindo que a URL final resolva tanto em dev quanto em produção (Vercel/Lovable).
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch (err) {
    // Fallback CDN com a mesma versão do pdfjs-dist instalado.
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
}

export function PdfCanvasViewer({ signed, nome }: { signed: string; nome: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    setPageNumber(1);
    setFailed(false);
    setNumPages(0);
  }, [signed]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fileMemo = useMemo(() => ({ url: signed }), [signed]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 border border-dashed border-border rounded-md">
        <Download className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">
          Não foi possível carregar o PDF neste dispositivo.
        </p>
        <a href={signed} target="_blank" rel="noopener noreferrer" className="text-sm underline text-primary">
          Baixar {nome}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full max-h-[70vh] overflow-auto rounded-md border border-border bg-muted/30 flex justify-center"
      >
        <Document
          file={fileMemo}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={(err) => {
            console.error("[PdfCanvasViewer] erro pdf.js:", err);
            setFailed(true);
          }}
          loading={
            <div className="flex items-center justify-center h-[60vh] w-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
          error={<div className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar o PDF.</div>}
        >
          {width > 0 && (
            <Page
              pageNumber={pageNumber}
              width={Math.min(width - 8, 900)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="flex items-center justify-center h-[60vh] w-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            />
          )}
        </Document>
      </div>
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Página {pageNumber} de {numPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
