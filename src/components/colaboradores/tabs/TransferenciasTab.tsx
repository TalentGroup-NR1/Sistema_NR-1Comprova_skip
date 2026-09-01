import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Loader2, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTransferenciasColaborador } from "@/hooks/useTransferenciaColaborador";

interface Props {
  colaboradorId: string;
}

export function TransferenciasTab({ colaboradorId }: Props) {
  const { data, isLoading } = useTransferenciasColaborador(colaboradorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Inbox className="h-8 w-8 mb-2" />
        <p>Nenhuma transferência registrada para este colaborador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((t) => (
        <Card key={t.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{t.empresa_origem_nome}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-primary">{t.empresa_destino_nome}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {format(new Date(t.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Realizada por <strong>{t.transferido_por_nome}</strong>
            </p>
            {t.motivo && (
              <p className="text-sm bg-muted/40 rounded p-2 border border-border">
                <span className="text-muted-foreground">Motivo:</span> {t.motivo}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
