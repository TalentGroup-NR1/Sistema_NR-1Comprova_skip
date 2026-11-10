import { Download, ExternalLink, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  sanitizeExternalUrl,
  useCuidarCapaUrl,
  type CuidarConteudo,
} from "@/hooks/useCuidarConteudos";
import {
  TIPO_META,
  gradientePorCategoria,
  podeBaixar,
  useDownloadConteudo,
} from "./conteudoUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conteudo: CuidarConteudo;
  /** Ação principal (abrir player/leitor ou link externo). */
  onAbrir: () => void;
}

export function ConteudoDetailModal({ open, onOpenChange, conteudo, onAbrir }: Props) {
  const { data: capaUrl } = useCuidarCapaUrl(open ? conteudo.capa_path : null);
  const { baixar, baixando } = useDownloadConteudo();
  const meta = TIPO_META[conteudo.tipo];
  const Icon = meta.icon;
  const parceiroUrl = sanitizeExternalUrl(conteudo.parceiro_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Capa */}
        <div className="relative h-44 w-full overflow-hidden rounded-t-lg">
          {capaUrl ? (
            <img
              src={capaUrl}
              alt={`Capa do material ${conteudo.titulo}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientePorCategoria(
                conteudo.categoria,
              )}`}
            >
              <Icon className="h-12 w-12 text-primary/70" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="space-y-5 px-6 pb-6">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {meta.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {conteudo.categoria}
              </Badge>
              {conteudo.duracao_min ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock className="h-2.5 w-2.5" />
                  {conteudo.duracao_min} min
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-xl leading-tight">{conteudo.titulo}</DialogTitle>
            {conteudo.descricao && (
              <DialogDescription className="text-sm">{conteudo.descricao}</DialogDescription>
            )}
          </DialogHeader>

          {conteudo.conteudo_detalhado && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Sobre este material</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {conteudo.conteudo_detalhado}
              </p>
            </div>
          )}

          {parceiroUrl && (
            <>
              <Separator />
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Parceiro
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {conteudo.parceiro_nome || "Acesso externo"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Conteúdo complementar disponibilizado por um parceiro do programa.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <a href={parceiroUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    {conteudo.parceiro_cta?.trim() || "Acessar site do parceiro"}
                  </a>
                </Button>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                onAbrir();
              }}
            >
              <Icon className="mr-2 h-4 w-4" />
              {meta.acao}
            </Button>
            {podeBaixar(conteudo) && (
              <Button variant="outline" disabled={baixando} onClick={() => baixar(conteudo)}>
                {baixando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Baixar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
