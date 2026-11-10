import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, PlayCircle, CheckCircle, Pause, Eye, Calendar,
  User, UserCheck, TrendingUp, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePDIsByCiclo, PDI, PDIStatus } from "@/hooks/usePDI";
import { useAvaliacoesCiclo } from "@/hooks/useAvaliacoesAplicadas";

const statusConfig: Record<PDIStatus, { label: string; icon: React.ElementType; className: string }> = {
  rascunho: { label: "Rascunho", icon: FileText, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em Andamento", icon: PlayCircle, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  concluido: { label: "Concluído", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  cancelado: { label: "Cancelado", icon: Pause, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

interface PDIsCicloTabProps {
  cicloId: string;
}

export function PDIsCicloTab({ cicloId }: PDIsCicloTabProps) {
  const navigate = useNavigate();
  const { data: pdis, isLoading } = usePDIsByCiclo(cicloId);
  const { data: avaliacoes } = useAvaliacoesCiclo(cicloId);
  
  const totalAvaliacoes = avaliacoes?.length || 0;
  const pdisCriados = pdis?.length || 0;
  const percentualCriados = totalAvaliacoes > 0 ? Math.round((pdisCriados / totalAvaliacoes) * 100) : 0;
  
  const pdisPorStatus = {
    rascunho: pdis?.filter(p => p.status === 'rascunho').length || 0,
    em_andamento: pdis?.filter(p => p.status === 'em_andamento').length || 0,
    concluido: pdis?.filter(p => p.status === 'concluido').length || 0,
    cancelado: pdis?.filter(p => p.status === 'cancelado').length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">PDIs Criados</p>
              <p className="text-2xl font-bold">{pdisCriados}/{totalAvaliacoes}</p>
              <Progress value={percentualCriados} className="h-1 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{percentualCriados}%</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Rascunho</p>
              <p className="text-2xl font-bold">{pdisPorStatus.rascunho}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{pdisPorStatus.em_andamento}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Concluídos</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{pdisPorStatus.concluido}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Cancelados</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{pdisPorStatus.cancelado}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PDIs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            PDIs do Ciclo
          </CardTitle>
          <CardDescription>
            Planos de Desenvolvimento Individual criados a partir das avaliações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pdis && pdis.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdis.map(pdi => {
                  const statusInfo = statusConfig[pdi.status];
                  const StatusIcon = statusInfo.icon;
                  const colaboradorData = pdi.colaborador as { full_name: string; job_title: string; department: string } | null;
                  const gestorData = pdi.gestor as { full_name: string } | null;
                  
                  return (
                    <TableRow key={pdi.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{colaboradorData?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {colaboradorData?.job_title} • {colaboradorData?.department}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{gestorData?.full_name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className} variant="outline">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{pdi._count_itens || 0} itens</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pdi._progresso_medio || 0} className="w-16 h-2" />
                          <span className="text-sm">{pdi._progresso_medio || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {pdi.data_fim_prevista ? (
                          <span className="text-sm">
                            {format(new Date(pdi.data_fim_prevista), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/pdi/${pdi.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum PDI criado para este ciclo ainda.</p>
              <p className="text-sm mt-1">
                Os PDIs são criados a partir da tela de Resultados de cada avaliação.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
