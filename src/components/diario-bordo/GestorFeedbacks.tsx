import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Clock, CheckCircle2, AlertCircle, Users, ExternalLink, Eye } from 'lucide-react';
import { useGestorFeedbackCycles } from '@/hooks/useGestorFeedbackCycles';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnalysisReportPage } from './analysis/AnalysisReportPage';

export function GestorFeedbacks() {
  const { data: cycles, isLoading } = useGestorFeedbackCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  if (selectedCycleId) {
    return (
      <AnalysisReportPage
        cycleId={selectedCycleId}
        onBack={() => setSelectedCycleId(null)}
        isColaboradorView={true}
      />
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'NAO_INICIADO':
        return { label: 'Não Iniciado', className: 'bg-muted text-muted-foreground', icon: <Clock className="h-4 w-4" /> };
      case 'LINKS_GERADOS':
        return { label: 'Aguardando respostas', className: 'bg-warning/10 text-warning border-warning/30', icon: <AlertCircle className="h-4 w-4" /> };
      case 'COLAB_RESPONDIDO':
        return { label: 'Aguardando gestor', className: 'bg-primary/10 text-primary border-primary/30', icon: <AlertCircle className="h-4 w-4" /> };
      case 'GESTOR_RESPONDIDO':
        return { label: 'Gestor respondeu', className: 'bg-success/10 text-success border-success/30', icon: <CheckCircle2 className="h-4 w-4" /> };
      case 'CONCLUIDO':
        return { label: 'Concluído', className: 'bg-success/10 text-success border-success/30', icon: <CheckCircle2 className="h-4 w-4" /> };
      default:
        return { label: status, className: 'bg-muted text-muted-foreground', icon: <Clock className="h-4 w-4" /> };
    }
  };

  const getMilestoneLabel = (type: string) => {
    switch (type) {
      case '30_DIAS': return '30 Dias';
      case '80_DIAS': return '80 Dias';
      case '120_DIAS': return '120 Dias';
      default: return type;
    }
  };

  const canRespond = (status: string) =>
    status === 'LINKS_GERADOS' || status === 'COLAB_RESPONDIDO';

  const canViewResults = (status: string) =>
    status === 'CONCLUIDO';

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Diário de Bordo da Equipe</p>
              <p className="text-sm text-muted-foreground">
                Acompanhe e responda os ciclos de feedback dos seus colaboradores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Ciclos da Minha Equipe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Marco</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!cycles?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum ciclo de feedback encontrado para sua equipe
                  </TableCell>
                </TableRow>
              ) : (
                cycles.map((cycle) => {
                  const statusInfo = getStatusInfo(cycle.status);
                  return (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">
                        {cycle.colaborador?.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getMilestoneLabel(cycle.milestone_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(parseISO(cycle.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${statusInfo.className}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canRespond(cycle.status) && cycle.gestor_token && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => window.open(`/feedback/${cycle.gestor_token}`, '_blank')}
                              className="flex items-center gap-1.5"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Responder
                            </Button>
                          )}
                          {canViewResults(cycle.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCycleId(cycle.id)}
                              className="flex items-center gap-1.5 text-primary hover:text-primary/80"
                            >
                              <Eye className="h-4 w-4" />
                              Resultados
                            </Button>
                          )}
                          {!canRespond(cycle.status) && !canViewResults(cycle.status) && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
