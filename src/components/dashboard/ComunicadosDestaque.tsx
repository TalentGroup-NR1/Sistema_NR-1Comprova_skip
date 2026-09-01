import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Megaphone, ArrowRight, Pin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDashboardComunicados, useMarkComunicadoAsRead, useUnreadCount } from "@/hooks/useDashboardComunicados";
import { useComunicado } from "@/hooks/useComunicados";
import { ComunicadoFlyerDetail } from "@/components/comunicados/ComunicadoFlyerDetail";

export function ComunicadosDestaque() {
  const navigate = useNavigate();
  const { data: comunicados, isLoading } = useDashboardComunicados();
  const markAsRead = useMarkComunicadoAsRead();
  const unreadCount = useUnreadCount(comunicados);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: comunicadoFull } = useComunicado(selectedId);

  const handleOpen = (id: string, isRead: boolean) => {
    setSelectedId(id);
    if (!isRead) {
      markAsRead.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!comunicados || comunicados.length === 0) return null;

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">Comunicados</CardTitle>
              <CardDescription className="text-xs">Novidades e avisos importantes</CardDescription>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs">
              {unreadCount} {unreadCount === 1 ? "novo" : "novos"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {comunicados.map((c) => (
            <button
              key={c.id}
              onClick={() => handleOpen(c.id, c.is_read)}
              className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${!c.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {c.titulo}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.data_publicacao
                    ? format(new Date(c.data_publicacao), "dd MMM yyyy", { locale: ptBR })
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {c.is_pinned && (
                  <Badge variant="outline" className="text-[10px] border-accent/50 text-accent-foreground">
                    <Pin className="h-3 w-3 mr-0.5" />
                    Fixado
                  </Badge>
                )}
                {!c.is_read && (
                  <Badge className="text-[10px] bg-primary/90">Novo</Badge>
                )}
              </div>
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => navigate("/comunicados")}
          >
            Ver todos <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          {comunicadoFull && (
            <ComunicadoFlyerDetail comunicado={comunicadoFull} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
