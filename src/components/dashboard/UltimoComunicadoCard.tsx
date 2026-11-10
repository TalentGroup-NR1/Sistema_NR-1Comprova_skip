import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Megaphone, ArrowRight, Pin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useDashboardComunicados,
  useMarkComunicadoAsRead,
} from "@/hooks/useDashboardComunicados";
import { useComunicado } from "@/hooks/useComunicados";
import { ComunicadoFlyerDetail } from "@/components/comunicados/ComunicadoFlyerDetail";

/**
 * Card visual de "Último Comunicado" para o dashboard do colaborador.
 * Apenas leitura — consome hooks existentes.
 */
export function UltimoComunicadoCard() {
  const { data: comunicados, isLoading } = useDashboardComunicados(1);
  const markAsRead = useMarkComunicadoAsRead();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: comunicadoFull } = useComunicado(openId);

  const ultimo = comunicados?.[0];

  const handleOpen = () => {
    if (!ultimo) return;
    setOpenId(ultimo.id);
    if (!ultimo.is_read) markAsRead.mutate(ultimo.id);
  };

  return (
    <>
      <Card className="border-border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[20px] font-semibold text-foreground leading-tight">
                  Comunicados
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Fique por dentro das novidades.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/comunicados">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5">
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : !ultimo ? (
              <p className="text-sm text-muted-foreground py-3">
                Sem novidades por aqui ainda. Quando algo novo surgir, avisamos!
              </p>
            ) : (
              <button
                onClick={handleOpen}
                className="w-full text-left rounded-md border border-border bg-background-alt/40 p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-base truncate ${
                          !ultimo.is_read
                            ? "font-semibold text-foreground"
                            : "text-foreground/90"
                        }`}
                      >
                        {ultimo.titulo}
                      </p>
                      {ultimo.is_pinned && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-accent/50"
                        >
                          <Pin className="h-3 w-3 mr-0.5" />
                          Fixado
                        </Badge>
                      )}
                      {!ultimo.is_read && (
                        <Badge className="text-[10px] bg-primary/90">Novo</Badge>
                      )}
                    </div>
                    {ultimo.resumo && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ultimo.resumo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {ultimo.autor_nome ? `${ultimo.autor_nome} • ` : ""}
                      {ultimo.data_publicacao
                        ? format(new Date(ultimo.data_publicacao), "dd 'de' MMM 'de' yyyy", {
                            locale: ptBR,
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {comunicadoFull && <ComunicadoFlyerDetail comunicado={comunicadoFull} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
