import { useState } from "react";
import { Info, ExternalLink, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCuidarCapaUrl,
  type CuidarConteudo,
} from "@/hooks/useCuidarConteudos";
import { ConteudoPreviewModal } from "./ConteudoPreviewModal";
import { ConteudoDetailModal } from "./ConteudoDetailModal";
import {
  TIPO_META,
  abreEmModal,
  gradientePorCategoria,
  youtubeIdDoConteudo,
} from "./conteudoUtils";

interface Props {
  conteudo: CuidarConteudo;
  /** Card maior usado na faixa de destaques. */
  destaque?: boolean;
}

export function ConteudoCard({ conteudo, destaque = false }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const { data: capaUrl } = useCuidarCapaUrl(conteudo.capa_path);

  const meta = TIPO_META[conteudo.tipo];
  const Icon = meta.icon;
  const youtubeId = youtubeIdDoConteudo(conteudo);
  const emModal = abreEmModal(conteudo);

  const abrir = () => {
    if (emModal) {
      setPreviewOpen(true);
    } else if (conteudo.url) {
      window.open(conteudo.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:shadow-lg">
        {/* Capa */}
        <button
          type="button"
          onClick={abrir}
          aria-label={`${meta.acao}: ${conteudo.titulo}`}
          className={`relative w-full overflow-hidden text-left ${
            destaque ? "h-44" : "h-36"
          }`}
        >
          {capaUrl ? (
            <img
              src={capaUrl}
              alt={`Capa do material ${conteudo.titulo}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientePorCategoria(
                conteudo.categoria,
              )}`}
            >
              <Icon className="h-10 w-10 text-primary/70" strokeWidth={1.5} />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/60 to-transparent" />

          {conteudo.duracao_min ? (
            <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1.5">
              <Badge className="gap-1 bg-background/90 text-[10px] font-medium text-foreground hover:bg-background/90">
                <Clock className="h-2.5 w-2.5" />
                {conteudo.duracao_min} min
              </Badge>
            </div>
          ) : null}

          {destaque && (
            <Badge className="absolute left-2 top-2 gap-1 bg-primary text-[10px] text-primary-foreground">
              <Star className="h-2.5 w-2.5" />
              Destaque
            </Badge>
          )}
        </button>

        {/* Botão de informação */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDetailOpen(true);
          }}
          aria-label={`Saiba mais sobre ${conteudo.titulo}`}
          title="Saiba mais"
          className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 text-foreground shadow-sm transition-colors hover:bg-background"
        >
          <Info className="h-4 w-4" />
        </button>

        {/* Corpo */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h4
            className={`line-clamp-2 font-semibold text-foreground ${
              destaque ? "text-base" : "text-sm"
            }`}
          >
            {conteudo.titulo}
          </h4>
          {conteudo.descricao && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {conteudo.descricao}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
            <Button size="sm" className="h-8 px-3 text-xs" onClick={abrir}>
              {emModal ? meta.acao : "Acessar"}
              {!emModal && <ExternalLink className="ml-1.5 h-3 w-3" />}
            </Button>
          </div>
        </div>
      </Card>

      {emModal && (
        <ConteudoPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          conteudo={conteudo}
          youtubeId={youtubeId}
        />
      )}
      <ConteudoDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        conteudo={conteudo}
        onAbrir={abrir}
      />
    </>
  );
}
