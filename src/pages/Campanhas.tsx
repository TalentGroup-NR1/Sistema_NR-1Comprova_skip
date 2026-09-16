import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Calendar, ImageIcon, Sparkles } from "lucide-react";
import { useCampanhasAtivas, type Campanha, type CampanhaStatus } from "@/hooks/useCampanhasComunicados";
import { CampanhaDetailDialog } from "@/components/dashboard/CampanhaDetailDialog";
import { SignedComunicadoImg } from "@/lib/comunicadosMedia";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Campanhas() {
  const { data: campanhas, isLoading } = useCampanhasAtivas();
  const [selected, setSelected] = useState<(Campanha & { status?: CampanhaStatus }) | null>(null);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" />
            Campanhas
          </h1>
          <p className="text-muted-foreground">
            Acompanhe as campanhas ativas de conscientização, saúde e conformidade da sua empresa.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : !campanhas || campanhas.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-12 text-center flex flex-col items-center justify-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h2 className="text-base font-semibold text-foreground">Nenhuma campanha ativa no momento</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Novas campanhas e ações institucionais aparecerão aqui assim que forem lançadas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campanhas.map((c) => (
              <Card
                key={c.id}
                onClick={() => setSelected(c)}
                className="overflow-hidden h-full cursor-pointer transition hover:shadow-md hover:-translate-y-0.5 flex flex-col border-border"
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
                <CardContent className="p-5 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display font-semibold text-base leading-tight line-clamp-2">
                      {c.titulo}
                    </h2>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 shrink-0">
                      ativo
                    </Badge>
                  </div>
                  {c.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{c.descricao}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-auto pt-2 border-t border-border/40">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(parseISO(c.data_inicio), "dd MMM", { locale: ptBR })} —{" "}
                    {format(parseISO(c.data_fim), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CampanhaDetailDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          campanha={selected}
        />
      </div>
    </MainLayout>
  );
}
