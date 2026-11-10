import { sanitizeRichText } from "@/lib/sanitize";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Calendar, Clock, Edit, Trash2, User } from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FeedbackColaborador } from '@/hooks/useFeedbacksColaboradores';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedbackTimelineProps {
  feedbacks: FeedbackColaborador[];
  isLoading: boolean;
  onEdit: (feedback: FeedbackColaborador) => void;
  onDelete: (feedback: FeedbackColaborador) => void;
  isDeleting: boolean;
}

export function FeedbackTimeline({ feedbacks, isLoading, onEdit, onDelete, isDeleting }: FeedbackTimelineProps) {
  const { user, isAdminMaster, isAdminEmpresa, role } = useAuth();

  const canEditDelete = (feedback: FeedbackColaborador) => {
    // Admin master e admin empresa podem editar/excluir qualquer feedback
    if (isAdminMaster || isAdminEmpresa) return true;
    // Administrador Operacional pode editar/excluir qualquer feedback
    if (role === 'analista_rh') return true;
    // Gestor só pode editar/excluir seus próprios feedbacks
    return feedback.registrado_por_user_id === user?.id;
  };

  const getPrazoStatus = (prazoRetorno: string | null) => {
    if (!prazoRetorno) return null;
    const prazoDate = new Date(prazoRetorno);
    
    if (isPast(prazoDate) && !isToday(prazoDate)) {
      return { label: 'Vencido', variant: 'destructive' as const };
    }
    if (isToday(prazoDate)) {
      return { label: 'Hoje', variant: 'default' as const };
    }
    if (isFuture(prazoDate)) {
      return { label: 'Pendente', variant: 'secondary' as const };
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Feedbacks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Feedbacks ({feedbacks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {feedbacks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhum feedback registrado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback, index) => {
              const prazoStatus = getPrazoStatus(feedback.prazo_retorno);
              
              return (
                <div key={feedback.id}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(feedback.data_feedback), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                        {prazoStatus && (
                          <Badge variant={prazoStatus.variant} className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Retorno: {format(new Date(feedback.prazo_retorno!), "dd/MM/yyyy", { locale: ptBR })} - {prazoStatus.label}
                          </Badge>
                        )}
                        {feedback.alerta && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Alerta
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-semibold text-lg">{feedback.assunto}</h4>

                      <div 
                        className="prose prose-sm max-w-none text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichText(feedback.detalhes_conversa) }}
                      />

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Registrado por: {feedback.registrado_por_nome}</span>
                      </div>
                    </div>

                    {canEditDelete(feedback) && (
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => onEdit(feedback)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(feedback)}
                                disabled={isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  {index < feedbacks.length - 1 && <Separator className="my-4" />}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
