import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Eye, TrendingUp, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { parseISODate } from '@/lib/validators/colaborador';
import { ptBR } from 'date-fns/locale';
import type { ColaboradorWithMilestones, MilestoneInfo } from '@/hooks/useFeedbackCycles';

interface AnalysisTableProps {
  colaboradores: ColaboradorWithMilestones[];
  isLoading?: boolean;
  onViewAnalysis: (colaboradorId: string, cycleId: string) => void;
  onViewEvolution: (colaboradorId: string) => void;
  showStatusBadge?: boolean;
}

const MILESTONE_LABELS: Record<string, string> = {
  '30_DIAS': '30d',
  '80_DIAS': '80d',
  '120_DIAS': '120d',
};

function getMilestoneBadgeClass(milestone: MilestoneInfo): string {
  if (milestone.status === 'CONCLUIDO') {
    // Check average score if available (could be expanded)
    return 'bg-executive-success text-white';
  }
  if (milestone.status === 'COLAB_RESPONDIDO' || milestone.status === 'GESTOR_RESPONDIDO') {
    return 'bg-executive-warning text-white';
  }
  if (milestone.status === 'LINKS_GERADOS') {
    return 'bg-info text-white';
  }
  if (milestone.isOverdue) {
    return 'bg-executive-danger text-white';
  }
  return 'bg-muted text-muted-foreground';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AnalysisTable({
  colaboradores,
  isLoading,
  onViewAnalysis,
  onViewEvolution,
  showStatusBadge = false,
}: AnalysisTableProps) {
  const [search, setSearch] = useState('');

  const filteredColaboradores = colaboradores.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.job_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.department?.toLowerCase().includes(search.toLowerCase())
  );

  // Get last completed cycle for "Ver Análise" button
  const getLastCompletedCycle = (milestones: MilestoneInfo[]) => {
    const completedCycles = milestones.filter(
      m => m.status === 'CONCLUIDO' || m.status === 'COLAB_RESPONDIDO' || m.status === 'GESTOR_RESPONDIDO'
    );
    return completedCycles.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0];
  };

  // Check if has multiple completed cycles for evolution view
  const hasMultipleCompletedCycles = (milestones: MilestoneInfo[]) => {
    return milestones.filter(m => m.status === 'CONCLUIDO').length >= 2;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador, cargo ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" className="no-print">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-executive overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-navy-900 hover:bg-navy-900">
              <TableHead className="text-white font-semibold">Profissional</TableHead>
              <TableHead className="text-white font-semibold">Cargo</TableHead>
              <TableHead className="text-white font-semibold">Admissão</TableHead>
              <TableHead className="text-white font-semibold text-center">Status dos Marcos</TableHead>
              <TableHead className="text-white font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredColaboradores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum colaborador encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredColaboradores.map((colaborador) => {
                const lastCycle = getLastCompletedCycle(colaborador.milestones);
                const canViewEvolution = hasMultipleCompletedCycles(colaborador.milestones);

                return (
                  <TableRow key={colaborador.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-navy-700 text-white text-sm">
                            {getInitials(colaborador.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{colaborador.full_name}</p>
                            {showStatusBadge && colaborador.status === 'DESLIGADO' && (
                              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">
                                Desligado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{colaborador.department}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-graphite-600">
                      {colaborador.job_title}
                    </TableCell>
                    <TableCell className="text-graphite-600">
                      {format(parseISODate(colaborador.admission_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {['30_DIAS', '80_DIAS', '120_DIAS'].map(milestoneType => {
                          const milestone = colaborador.milestones.find(m => m.type === milestoneType);
                          if (!milestone) {
                            return (
                              <Badge key={milestoneType} variant="outline" className="text-xs opacity-40">
                                {MILESTONE_LABELS[milestoneType]}
                              </Badge>
                            );
                          }
                          return (
                            <Badge
                              key={milestoneType}
                              className={`text-xs cursor-pointer ${getMilestoneBadgeClass(milestone)}`}
                              onClick={() => {
                                if (milestone.status === 'CONCLUIDO' || milestone.status === 'COLAB_RESPONDIDO' || milestone.status === 'GESTOR_RESPONDIDO') {
                                  onViewAnalysis(colaborador.id, milestone.cycle_id);
                                }
                              }}
                            >
                              {MILESTONE_LABELS[milestoneType]}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => lastCycle && onViewAnalysis(colaborador.id, lastCycle.cycle_id)}
                          disabled={!lastCycle}
                          className="text-navy-700 hover:text-navy-900 hover:bg-navy-900/10"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Análise
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onViewEvolution(colaborador.id)}
                          disabled={!canViewEvolution}
                          className="bg-navy-900 hover:bg-navy-700"
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Evolução
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
