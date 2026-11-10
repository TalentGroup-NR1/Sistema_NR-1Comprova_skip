import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Briefcase, Building2, FileText, MessageSquare, Clock } from 'lucide-react';
import { parseISODate } from '@/lib/validators/colaborador';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const TIPOS_DESLIGAMENTO_LABELS: Record<string, string> = {
  pedido_demissao: 'Pedido de demissão',
  sem_justa_causa: 'Sem justa causa',
  justa_causa: 'Justa causa',
  termino_contrato: 'Término de contrato',
  acordo: 'Acordo',
  outros: 'Outros',
};

interface DetalhesDesligamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: any | null;
}

export function DetalhesDesligamentoDialog({ open, onOpenChange, colaborador }: DetalhesDesligamentoDialogProps) {
  if (!colaborador) return null;

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISODate(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Desligamento</DialogTitle>
          <DialogDescription>Informações completas sobre o desligamento do colaborador.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{colaborador.full_name}</p>
              <p className="text-sm text-muted-foreground">{colaborador.job_title || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm">{colaborador.department || '-'}</p>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Data de desligamento</p>
              <p className="text-sm font-medium">{formatDate(colaborador.termination_date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tipo de desligamento</p>
              <Badge variant="secondary">
                {TIPOS_DESLIGAMENTO_LABELS[colaborador.tipo_desligamento || ''] || colaborador.tipo_desligamento || '-'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Motivo</p>
              <p className="text-sm whitespace-pre-line break-words">{colaborador.motivo_desligamento || '-'}</p>
            </div>
          </div>

          {colaborador.motivo_detalhado && (
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Observações adicionais</p>
                <p className="text-sm whitespace-pre-line break-words">{colaborador.motivo_detalhado}</p>
              </div>
            </div>
          )}

          {colaborador.desligado_em && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Registro criado em</p>
                  <p className="text-sm">{formatDateTime(colaborador.desligado_em)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
