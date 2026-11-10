import { useEffect } from "react";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Calendar, ImageIcon } from "lucide-react";
import { useCampanhasAtivas } from "@/hooks/useCampanhasComunicados";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useRef } from "react";
import { CampanhaDetailDialog } from "./CampanhaDetailDialog";
import type { Campanha, CampanhaStatus } from "@/hooks/useCampanhasComunicados";

export function CampanhasAtivasCarousel() {
  const { data: campanhas, isLoading } = useCampanhasAtivas();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState<(Campanha & { status?: CampanhaStatus }) | null>(null);
  const autoplay = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );


  useEffect(() => {
    if (!api) return;
    // ensure autoplay re-evaluates when slides change
    api.reInit();
  }, [api, campanhas?.length]);

  if (isLoading) {
    return <Skeleton className="w-full h-56 rounded-xl" />;
  }
  if (!campanhas || campanhas.length === 0) return null;

  return (
    <section aria-label="Campanhas ativas" className="space-y-2">

      <Carousel
        opts={{ loop: campanhas.length > 1, align: "start" }}
        plugins={campanhas.length > 1 ? [autoplay.current] : []}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {campanhas.map((c) => (
            <CarouselItem key={c.id} className="md:basis-1/2 lg:basis-1/2">
              <Card
                onClick={() => setSelected(c)}
                className="overflow-hidden h-full cursor-pointer transition hover:shadow-md hover:-translate-y-0.5 flex flex-col"
              >
                <div className="w-full aspect-[16/9] bg-muted overflow-hidden">
                  {c.imagem_url ? (
                    <SignedComunicadoImg
                      src={c.imagem_url}
                      alt={c.titulo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-semibold text-base leading-tight line-clamp-2">
                      {c.titulo}
                    </h3>
                    <Badge>ativo</Badge>
                  </div>
                  {c.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.descricao}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(c.data_inicio), "dd MMM", { locale: ptBR })} —{" "}
                    {format(parseISO(c.data_fim), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {campanhas.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>

      <CampanhaDetailDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        campanha={selected}
      />
    </section>

  );
}
