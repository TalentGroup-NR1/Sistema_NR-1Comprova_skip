import { Component, lazy, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSignedComunicadoMediaUrl, SignedComunicadoImg } from "@/lib/comunicadosMedia";
import { sanitizeRichText } from "@/lib/sanitize";
import { AlertCircle, CheckCircle2, Loader2, Paperclip, Megaphone, Download } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/hooks/useComunicados";

const PdfCanvasViewer = lazy(() =>
  import("./PdfCanvasViewer").then((module) => ({ default: module.PdfCanvasViewer }))
);

class PdfErrorBoundary extends Component<
  { signed: string; nome: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[PdfErrorBoundary] erro ao renderizar PDF:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 border border-dashed border-border rounded-md">
          <Download className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center px-4">
            Não foi possível exibir o PDF neste dispositivo.
          </p>
          <a
            href={this.props.signed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline text-primary"
          >
            Baixar {this.props.nome}
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

function MaterialInlineSigned({ anexo }: { anexo: { nome: string; path: string; tipo?: string } }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let m = true;
    setLoading(true);
    getSignedUrl(anexo.path).then((u) => {
      if (!m) return;
      setUrl(u);
      setLoading(false);
    });
    return () => { m = false; };
  }, [anexo.path]);
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 border border-dashed border-border rounded-md">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!url) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md">
        Não foi possível carregar este anexo.
      </div>
    );
  }
  return <MaterialInline material={{ nome: anexo.nome, url, tipo: anexo.tipo }} />;
}

function ComunicadoAnexosBlock({ comunicadoId }: { comunicadoId: string }) {
  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ["blocker-comunicado-anexos", comunicadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comunicados_anexos")
        .select("id, nome_arquivo, url_arquivo, tipo_arquivo")
        .eq("comunicado_id", comunicadoId);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (isLoading) {
    return (
      <div className="mt-4 flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (anexos.length === 0) return null;
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        Anexos ({anexos.length})
      </p>
      <div className="space-y-4">
        {anexos.map((a) => (
          <div key={a.id} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground truncate">{a.nome_arquivo}</p>
            <MaterialInlineSigned
              anexo={{ nome: a.nome_arquivo, path: a.url_arquivo, tipo: a.tipo_arquivo ?? undefined }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type MaterialKind = "pdf" | "image" | "video" | "other";
function detectKind(m: { nome: string; url: string; tipo?: string }): MaterialKind {
  const src = `${m.nome ?? ""} ${m.url ?? ""}`.toLowerCase();
  if (/\.pdf(\?|$)/.test(src) || m.tipo?.includes("pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/.test(src) || m.tipo?.startsWith("image/")) return "image";
  if (/\.(mp4|webm|ogg|mov)(\?|$)/.test(src) || m.tipo?.startsWith("video/")) return "video";
  return "other";
}

function MaterialInline({ material }: { material: { nome: string; url: string; tipo?: string } }) {
  const signed = useSignedComunicadoMediaUrl(material.url);
  const kind = detectKind(material);

  if (!signed) return <div className="h-40 w-full rounded-md border border-dashed border-border bg-muted/30 animate-pulse" />;

  if (kind === "pdf") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <a
            href={signed}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-primary inline-flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Abrir em nova aba
          </a>
        </div>
        <PdfErrorBoundary signed={signed} nome={material.nome}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[60vh] w-full rounded-md border border-border bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <PdfCanvasViewer signed={signed} nome={material.nome} />
          </Suspense>
        </PdfErrorBoundary>
      </div>
    );
  }
  if (kind === "image") return <img src={signed} alt={material.nome} className="w-full rounded-md border border-border object-contain" />;
  if (kind === "video") return <video src={signed} controls className="w-full rounded-md border border-border bg-black" />;
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 border border-dashed border-border rounded-md">
      <Download className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Este formato não pode ser exibido aqui.</p>
      <a href={signed} target="_blank" rel="noopener noreferrer" download className="text-sm underline">
        Baixar {material.nome}
      </a>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useComunicadosPendentes,
  useRegistrarLeitura,
} from "@/hooks/useComunicadosObrigatorios";
import {
  useCampanhasPendentes,
  useRegistrarLeituraCampanha,
} from "@/hooks/useCampanhasObrigatorias";

type QueueItem =
  | {
      kind: "comunicado";
      id: string;
      titulo: string;
      subtitle: string;
      image_url: string | null;
      html: string;
      materiais?: undefined;
    }
  | {
      kind: "campanha";
      id: string;
      titulo: string;
      subtitle: string;
      image_url: string | null;
      html: string;
      materiais: Array<{ nome: string; url: string; tipo?: string }>;
    };

/**
 * Fila global de hard-blockers: comunicados + campanhas obrigatórias.
 * - Sem botão X, não fecha ao clicar fora.
 * - "Entendido" só habilita após o usuário rolar até o final do conteúdo.
 * - Avança automaticamente para o próximo item da fila.
 */
export function GlobalBlockerModal() {
  const { data: comunicados = [], isLoading: loadingC } = useComunicadosPendentes();
  const { data: campanhas = [], isLoading: loadingK } = useCampanhasPendentes();
  const registrarComunicado = useRegistrarLeitura();
  const registrarCampanha = useRegistrarLeituraCampanha();
  const { toast } = useToast();

  const queue: QueueItem[] = useMemo(() => {
    const com: QueueItem[] = comunicados.map((c) => ({
      kind: "comunicado",
      id: c.id,
      titulo: c.titulo,
      subtitle: `Por ${c.autor_nome}`,
      image_url: c.image_url,
      html: c.conteudo,
    }));
    const camp: QueueItem[] = campanhas.map((k) => {
      const safeDescricao = k.descricao
        ? sanitizeRichText(k.descricao).replace(/\n/g, "<br/>")
        : "";
      return {
        kind: "campanha" as const,
        id: k.id,
        titulo: k.titulo,
        subtitle: `Campanha · ${format(parseISO(k.data_inicio), "dd MMM", { locale: ptBR })} — ${format(parseISO(k.data_fim), "dd MMM yyyy", { locale: ptBR })}`,
        image_url: k.imagem_url,
        html: safeDescricao ? `<p>${safeDescricao}</p>` : "<p><em>Veja os materiais abaixo.</em></p>",
        materiais: Array.isArray(k.materiais) ? k.materiais : [],
      };
    });
    return [...com, ...camp];
  }, [comunicados, campanhas]);

  const [index, setIndex] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const atual = queue[index];

  useEffect(() => {
    setReachedEnd(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [atual?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !atual) return;
    const check = () => {
      if (el.scrollHeight <= el.clientHeight + 10) setReachedEnd(true);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [atual?.id]);

  useEffect(() => {
    if (atual) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [!!atual]);

  if (loadingC || loadingK || !atual) return null;

  const total = queue.length;
  const isComunicado = atual.kind === "comunicado";
  const pending = isComunicado ? registrarComunicado.isPending : registrarCampanha.isPending;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) setReachedEnd(true);
  };

  const handleConfirm = async () => {
    try {
      if (atual.kind === "comunicado") {
        await registrarComunicado.mutateAsync(atual.id);
      } else {
        await registrarCampanha.mutateAsync(atual.id);
      }
      if (index + 1 < total) setIndex((i) => i + 1);
      else setIndex(0);
    } catch (err: any) {
      toast({
        title: "Erro ao registrar leitura",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md md:p-4"
    >
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl flex flex-col rounded-none md:rounded-xl border-0 md:border md:border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isComunicado ? "bg-warning/10" : "bg-primary/10"}`}>
              {isComunicado ? (
                <AlertCircle className="h-5 w-5 text-warning" />
              ) : (
                <Megaphone className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wider ${isComunicado ? "text-warning" : "text-primary"}`}>
                {isComunicado ? "Comunicado obrigatório" : "Campanha obrigatória"}
              </p>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {atual.titulo}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{atual.subtitle}</p>
            </div>
          </div>
          {total > 1 && (
            <Badge variant="outline" className="shrink-0">
              {index + 1} de {total}
            </Badge>
          )}
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5"
        >
          {atual.image_url && (
            <SignedComunicadoImg
              src={atual.image_url}
              alt=""
              className="w-full rounded-lg mb-4 object-cover max-h-64"
            />
          )}
          <div
            className="prose prose-sm max-w-none text-foreground [&_*]:!text-foreground"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(atual.html) }}
          />
          {atual.kind === "campanha" && atual.materiais.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Materiais ({atual.materiais.length})
              </p>
              <div className="space-y-4">
                {atual.materiais.map((m, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground truncate">{m.nome}</p>
                    <MaterialInline material={m} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {atual.kind === "comunicado" && <ComunicadoAnexosBlock comunicadoId={atual.id} />}
          <div className="h-4" />
          {!reachedEnd && (
            <p className="text-center text-xs text-muted-foreground italic mt-4">
              Role até o final para habilitar a confirmação.
            </p>
          )}
        </div>

        <div className="px-4 py-3 md:px-6 md:py-4 border-t border-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-card">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {reachedEnd ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Leitura completa
              </>
            ) : (
              "Aguardando rolagem completa..."
            )}
          </p>
          <Button
            onClick={handleConfirm}
            disabled={!reachedEnd || pending}
            size="lg"
            className="w-full sm:w-auto min-h-[44px]"
          >
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
