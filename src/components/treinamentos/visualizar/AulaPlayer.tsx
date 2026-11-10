import { useEffect, useState, useRef, useCallback } from "react";
import {
  Download,
  ExternalLink,
  FileType2,
  AlertTriangle,
  Copy,
  CheckCircle,
  FileText,
  Clock,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AulaTreinamento, ProgressoAula } from "@/hooks/useProgressoAula";
import { getSignedUrlTreinamento, isStoragePath } from "@/hooks/useTreinamentoStorage";

interface AulaPlayerProps {
  aula: AulaTreinamento;
  progresso?: ProgressoAula | null;
  onConcluirAula?: (dados?: {
    autodeclarado?: boolean;
    termoAceito?: boolean;
    termoIp?: string | null;
    percentual?: number;
  }) => Promise<void> | void;
  onAtualizarProgresso?: (percentual: number) => void;
  isPending?: boolean;
}

export function AulaPlayer({
  aula,
  progresso,
  onConcluirAula,
  onAtualizarProgresso,
  isPending = false,
}: AulaPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  // Estados específicos para link externo
  const [modalLinkOpen, setModalLinkOpen] = useState(false);
  const [declaracaoLinkChecked, setDeclaracaoLinkChecked] = useState(false);

  // Estados específicos para texto com tempo mínimo
  const [tempoRestante, setTempoRestante] = useState<number>(aula.tempo_minimo_segundos || 0);

  // Referência do vídeo e controle de throttle
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ultimoProgressoSalvoRef = useRef<number>(0);
  const ultimoSaveTimestampRef = useRef<number>(0);

  const isFile = isStoragePath(aula.url_conteudo);
  const isConcluida = !!progresso?.concluida;

  // Carregar signedUrl se for storage
  useEffect(() => {
    let active = true;
    const fetchUrl = async () => {
      setSignedUrl(null);
      if (!isFile || !aula.url_conteudo) return;
      setLoadingUrl(true);
      try {
        const url = await getSignedUrlTreinamento(aula.url_conteudo);
        if (active) setSignedUrl(url);
      } catch (err) {
        console.error("Erro ao obter signed URL:", err);
      } finally {
        if (active) setLoadingUrl(false);
      }
    };
    fetchUrl();
    return () => {
      active = false;
    };
  }, [aula.id, aula.url_conteudo, isFile]);

  // Contagem regressiva para aula tipo texto
  useEffect(() => {
    if (aula.tipo !== "texto" || isConcluida) {
      setTempoRestante(0);
      return;
    }

    const tempoInicial = aula.tempo_minimo_segundos || 0;
    setTempoRestante(tempoInicial);

    if (tempoInicial <= 0) return;

    const interval = setInterval(() => {
      setTempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [aula.id, aula.tipo, aula.tempo_minimo_segundos, isConcluida]);

  // Extrair domínio para links externos
  const getExternalDomain = (url?: string | null): string => {
    if (!url) return "instituição externa";
    try {
      const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "instituição externa";
    }
  };

  // Video timeupdate com throttle de 10s e auto-conclusão aos 90%
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || isConcluida) return;

    const percent = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
    const now = Date.now();

    // Throttle de 10 segundos para persistir progresso
    if (now - ultimoSaveTimestampRef.current > 10000 && percent !== ultimoProgressoSalvoRef.current) {
      ultimoSaveTimestampRef.current = now;
      ultimoProgressoSalvoRef.current = percent;
      onAtualizarProgresso?.(percent);
    }

    // Auto-conclusão ao atingir 90%
    if (percent >= 90 && !isConcluida) {
      onConcluirAula?.({ percentual: 100 });
      toast.success("Aula concluída automaticamente (90% assistido)!");
    }
  }, [isConcluida, onAtualizarProgresso, onConcluirAula]);

  const handleVideoEnded = useCallback(() => {
    if (!isConcluida) {
      onConcluirAula?.({ percentual: 100 });
      toast.success("Aula concluída!");
    }
  }, [isConcluida, onConcluirAula]);

  const handleConfirmarAutodeclaracaoLink = async () => {
    if (!declaracaoLinkChecked || !onConcluirAula) return;
    try {
      await onConcluirAula({
        autodeclarado: true,
        termoAceito: true,
        percentual: 100,
      });
      setModalLinkOpen(false);
      toast.success("Estudo da aula registrado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar estudo.");
    }
  };

  // ==========================================
  // RENDER: TEXTO
  // ==========================================
  if (aula.tipo === "texto") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
            {aula.url_conteudo || aula.descricao || "Sem conteúdo de texto informado."}
          </div>
        </div>

        {tempoRestante > 0 && !isConcluida && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 p-3 rounded-lg border">
            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>
              Tempo mínimo de leitura restante: <strong>{tempoRestante}s</strong> para poder concluir.
            </span>
          </div>
        )}

        <div className="flex justify-end">
          {isConcluida ? (
            <Button variant="outline" disabled className="gap-2 text-green-700 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Aula lida e concluída
            </Button>
          ) : (
            <Button
              onClick={() => onConcluirAula?.({ percentual: 100 })}
              disabled={tempoRestante > 0 || isPending}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {tempoRestante > 0 ? `Aguarde ${tempoRestante}s` : "Marcar como lido"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: VÍDEO
  // ==========================================
  if (aula.tipo === "video") {
    if (isFile) {
      return (
        <div className="space-y-4">
          <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-md flex items-center justify-center">
            {loadingUrl ? (
              <p className="text-sm text-muted-foreground animate-pulse">Carregando vídeo...</p>
            ) : signedUrl ? (
              <video
                ref={videoRef}
                src={signedUrl}
                controls
                className="h-full w-full"
                controlsList="nodownload"
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              >
                Seu navegador não suporta este formato de vídeo.
              </video>
            ) : (
              <Alert variant="destructive" className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Não foi possível carregar o vídeo da aula.</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>A aula será concluída automaticamente ao atingir 90% do vídeo.</span>
            {isConcluida && (
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Concluída
              </span>
            )}
          </div>
        </div>
      );
    }

    // Vídeo externo (YouTube / Vimeo / link)
    const embedUrl = (aula.url_conteudo || "").replace("watch?v=", "embed/");
    return (
      <div className="space-y-4">
        <div className="aspect-video overflow-hidden rounded-xl bg-muted shadow-md">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            title={aula.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (aula.url_conteudo) {
                  navigator.clipboard.writeText(aula.url_conteudo);
                  toast.success("Link do vídeo copiado!");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
            </Button>
            {aula.url_conteudo && (
              <Button asChild variant="outline" size="sm">
                <a href={aula.url_conteudo} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir no navegador
                </a>
              </Button>
            )}
          </div>
          {!isConcluida ? (
            <Button size="sm" onClick={() => onConcluirAula?.({ percentual: 100 })} disabled={isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> Marcar como assistido
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Aula concluída
            </span>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: PDF
  // ==========================================
  if (aula.tipo === "pdf") {
    const pdfUrl = signedUrl || aula.url_conteudo;
    return (
      <div className="space-y-4">
        {loadingUrl ? (
          <div className="aspect-[4/3] bg-muted rounded-xl flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Carregando documento...</p>
          </div>
        ) : pdfUrl ? (
          <>
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs text-amber-800">
                Se o PDF não renderizar dentro do quadro, extensões de bloqueio (AdBlock) podem estar impedindo o iframe. Use os botões abaixo para baixar ou abrir externamente.
              </AlertDescription>
            </Alert>
            <div className="aspect-[4/3] bg-muted rounded-xl overflow-hidden border">
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full"
                title={`Documento: ${aula.titulo}`}
              />
            </div>
          </>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Arquivo PDF não disponível para esta aula.</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pdfUrl}
              onClick={() => {
                if (pdfUrl) window.open(pdfUrl, "_blank");
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Baixar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pdfUrl}
              onClick={() => {
                if (pdfUrl) {
                  navigator.clipboard.writeText(pdfUrl);
                  toast.success("Link do PDF copiado!");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copiar link
            </Button>
          </div>

          {!isConcluida ? (
            <Button size="sm" onClick={() => onConcluirAula?.({ percentual: 100 })} disabled={isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> Concluir leitura do PDF
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Leitura concluída
            </span>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: PPT / ARQUIVO
  // ==========================================
  if (aula.tipo === "ppt" || aula.tipo === "arquivo") {
    const fileUrl = signedUrl || aula.url_conteudo;
    const isPpt = aula.tipo === "ppt";

    return (
      <div className="space-y-4">
        <div className="p-8 border rounded-xl bg-muted/40 text-center space-y-3">
          {isPpt ? (
            <FileType2 className="h-16 w-16 mx-auto text-orange-500" />
          ) : (
            <FileText className="h-16 w-16 mx-auto text-primary" />
          )}
          <h3 className="text-base font-semibold">{aula.titulo}</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isPpt
              ? "Faça o download do arquivo de apresentação para acompanhar os slides no seu computador."
              : "Faça o download do arquivo do material para realizar a leitura e estudo."}
          </p>
          <div className="pt-2">
            <Button
              onClick={() => {
                if (fileUrl) window.open(fileUrl, "_blank");
              }}
              disabled={!fileUrl || loadingUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              {loadingUrl ? "Preparando arquivo..." : isPpt ? "Baixar Apresentação" : "Baixar Arquivo"}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          {!isConcluida ? (
            <Button size="sm" onClick={() => onConcluirAula?.({ percentual: 100 })} disabled={isPending}>
              <CheckCircle className="h-4 w-4 mr-1" /> Marcar como estudado
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Material estudado
            </span>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LINK EXTERNO (Etapa 8.7)
  // ==========================================
  if (aula.tipo === "link") {
    const domain = getExternalDomain(aula.url_conteudo);

    return (
      <div className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800">
          <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
            Conteúdo hospedado externamente ({domain}). O certificado deste treinamento é emitido pela instituição responsável na própria plataforma de origem. Ao finalizar seus estudos, registre sua autodeclaração.
          </AlertDescription>
        </Alert>

        <div className="rounded-xl border bg-card p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Acesse o conteúdo no portal oficial da instituição parceira:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <a href={aula.url_conteudo || "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Acessar Link
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (aula.url_conteudo) {
                  navigator.clipboard.writeText(aula.url_conteudo);
                  toast.success("Link copiado!");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar link
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          {!isConcluida ? (
            <Button
              onClick={() => {
                setDeclaracaoLinkChecked(false);
                setModalLinkOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Marcar como estudado
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-blue-700 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Estudado (autodeclarado)
            </span>
          )}
        </div>

        {/* Modal de autodeclaração para aula de link externo */}
        <Dialog open={modalLinkOpen} onOpenChange={setModalLinkOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar estudo do conteúdo externo</DialogTitle>
              <DialogDescription className="space-y-2 pt-2 text-xs">
                <span>
                  Esta aula ocorre na plataforma externa <strong>{domain}</strong>.
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex items-start space-x-3 rounded-lg border border-border p-3.5 bg-muted/40">
                <Checkbox
                  id="check-aula-declaracao"
                  checked={declaracaoLinkChecked}
                  onCheckedChange={(checked) => setDeclaracaoLinkChecked(checked === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="check-aula-declaracao"
                  className="text-xs font-medium leading-relaxed cursor-pointer select-none"
                >
                  Declaro que acessei e estudei o conteúdo indicado neste treinamento.
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalLinkOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmarAutodeclaracaoLink}
                disabled={!declaracaoLinkChecked || isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? "Registrando..." : "Confirmar conclusão"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>Formato de aula não suportado.</AlertDescription>
    </Alert>
  );
}
