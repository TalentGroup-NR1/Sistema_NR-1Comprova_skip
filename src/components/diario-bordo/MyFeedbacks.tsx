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
import { Calendar, Clock, CheckCircle2, AlertCircle, User, AlertTriangle, Eye } from 'lucide-react';
import { useMyFeedbackCycles } from '@/hooks/useMyFeedbackCycles';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnalysisReportPage } from './analysis/AnalysisReportPage';

export function MyFeedbacks() {
  const { data: cycles, isLoading, colaborador, isColaboradorLinked } = useMyFeedbackCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // If a cycle is selected, show the detailed report
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
      case 'LINKS_GERADOS':
        return {
          label: 'Aguardando minha resposta',
          className: 'bg-warning/10 text-warning border-warning/30',
          icon: <AlertCircle className="h-4 w-4" />,
        };
      case 'COLAB_RESPONDIDO':
        return {
          label: 'Minha resposta enviada',
          className: 'bg-success/10 text-success border-success/30',
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      case 'GESTOR_RESPONDIDO':
        return {
          label: 'Aguardando minha resposta',
          className: 'bg-warning/10 text-warning border-warning/30',
          icon: <AlertCircle className="h-4 w-4" />,
        };
      case 'CONCLUIDO':
        return {
          label: 'Concluído',
          className: 'bg-success/10 text-success border-success/30',
          icon: <CheckCircle2 className="h-4 w-4" />,
        };
      default:
        return {
          label: status,
          className: 'bg-muted text-muted-foreground',
          icon: <Clock className="h-4 w-4" />,
        };
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

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show a clear message when the user isn't linked to a colaborador
  if (!isColaboradorLinked) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-warning mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Usuário não vinculado a um colaborador
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Seu usuário ainda não está vinculado a um registro de colaborador no sistema.
            Entre em contato com o RH ou um Administrador para finalizar seu cadastro.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">



      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>
              Os formulários de feedback são preenchidos através dos links enviados por e-mail ou WhatsApp.
              Aqui você pode acompanhar o status de cada ciclo.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Meus Ciclos de Feedback</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marco</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Questionário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Você não possui ciclos de feedback cadastrados
                  </TableCell>
                </TableRow>
              ) : (
                cycles?.map((cycle) => {
                  const statusInfo = getStatusInfo(cycle.status);
                  const canViewResults = cycle.status === 'CONCLUIDO' || 
                    cycle.status === 'COLAB_RESPONDIDO' || 
                    cycle.status === 'GESTOR_RESPONDIDO';
                  
                  return (
                    <TableRow key={cycle.id}>
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
                        {cycle.collaborator_template?.template_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`flex items-center gap-1 w-fit ${statusInfo.className}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canViewResults ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCycleId(cycle.id)}
                            className="flex items-center gap-1.5 text-primary hover:text-primary/80"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Resultados
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
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
