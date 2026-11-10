import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquareText,
  Lightbulb,
  HelpCircle,
  Clock,
  CheckCircle2,
  Lock,
  Plus,
} from "lucide-react";
import {
  FaleConoscoStatus,
  useMinhasMensagensFaleConosco,
} from "@/hooks/useFaleConosco";
import { FaleConoscoDrawer } from "@/components/denuncias/FaleConoscoDrawer";

const STATUS_LABEL: Record<FaleConoscoStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  respondido: "Respondido",
  arquivado: "Arquivado",
};

const STATUS_VARIANT: Record<FaleConoscoStatus, "default" | "secondary" | "outline"> = {
  recebido: "secondary",
  em_analise: "default",
  respondido: "outline",
  arquivado: "outline",
};

export default function MinhasMensagensFaleConosco() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading } = useMinhasMensagensFaleConosco();

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquareText className="h-6 w-6 text-primary" />
              Minhas Mensagens ao RH
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Acompanhe suas sugestões e dúvidas enviadas com identificação e leia as respostas do RH.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setDrawerOpen(true)}
            className="gap-1.5 text-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Nova mensagem
          </Button>
        </div>

        {/* Card informativo de anonimato */}
        <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Mensagens enviadas de forma anônima não são associadas à sua conta e não aparecem aqui para proteger sua identidade.
          </span>
        </div>

        {/* Lista de mensagens */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Você ainda não possui mensagens enviadas ao RH.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerOpen(true)}
                  className="text-xs"
                >
                  Enviar uma sugestão ou dúvida
                </Button>
              </CardContent>
            </Card>
          ) : (
            data.map((item) => {
              const isSugestao = item.tipo === "sugestao";
              return (
                <Card key={item.id} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`gap-1 text-xs font-normal ${
                            isSugestao
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300"
                          }`}
                        >
                          {isSugestao ? (
                            <Lightbulb className="h-3 w-3" />
                          ) : (
                            <HelpCircle className="h-3 w-3" />
                          )}
                          {isSugestao ? "Sugestão" : "Dúvida"}
                        </Badge>
                        <CardTitle className="text-base font-semibold">{item.titulo}</CardTitle>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[item.status]} className="text-xs">
                          {STATUS_LABEL[item.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="rounded-md border bg-muted/20 p-3 leading-relaxed whitespace-pre-wrap">
                      {item.mensagem}
                    </div>

                    {item.resposta ? (
                      <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Resposta do RH
                          </span>
                          {item.respondido_em && (
                            <span className="text-muted-foreground font-normal">
                              {format(new Date(item.respondido_em), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {item.resposta}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Aguardando retorno do time de RH.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <FaleConoscoDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    </MainLayout>
  );
}

