import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  CircleDashed,
  History,
  Search,
  Building2,
  X,
} from 'lucide-react';
import { useColaboradoresMilestones } from '@/hooks/useFeedbackCycles';
import { MilestoneCard } from './MilestoneCard';
import { ComparativeAnalysis } from './ComparativeAnalysis';
import { ptBR } from 'date-fns/locale';

interface MilestonesDashboardProps {
  statusFilter?: 'ATIVO' | 'DESLIGADO';
}

export function MilestonesDashboard({ statusFilter = 'ATIVO' }: MilestonesDashboardProps) {
  const { data: colaboradores, isLoading } = useColaboradoresMilestones(statusFilter);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);

  const SEM_EMPRESA = '__SEM_EMPRESA__';

  const empresasClienteOptions = useMemo(() => {
    if (!colaboradores) return [] as { value: string; label: string }[];
    const set = new Set<string>();
    let hasEmpty = false;
    colaboradores.forEach(c => {
      const v = c.empresa_cliente?.trim();
      if (v) set.add(v);
      else hasEmpty = true;
    });
    const opts = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map(v => ({ value: v, label: v }));
    if (hasEmpty) opts.push({ value: SEM_EMPRESA, label: '(Sem empresa cliente)' });
    return opts;
  }, [colaboradores]);

  const colaboradoresFiltrados = useMemo(() => {
    if (!colaboradores) return [];
    const term = searchTerm.trim().toLowerCase();
    return colaboradores.filter(c => {
      if (term && !c.full_name.toLowerCase().includes(term)) return false;
      if (empresasSelecionadas.length > 0) {
        const empresa = c.empresa_cliente?.trim();
        const key = empresa || SEM_EMPRESA;
        if (!empresasSelecionadas.includes(key)) return false;
      }
      return true;
    });
  }, [colaboradores, searchTerm, empresasSelecionadas]);

  const hasActiveFilters = searchTerm.trim().length > 0 || empresasSelecionadas.length > 0;
  const clearFilters = () => {
    setSearchTerm('');
    setEmpresasSelecionadas([]);
  };
  const toggleEmpresa = (v: string) => {
    setEmpresasSelecionadas(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]
    );
  };

  // Scroll para colaborador específico vindo do dashboard (?colaborador=ID)
  useEffect(() => {
    if (isLoading || !colaboradores?.length) return;
    const params = new URLSearchParams(window.location.search);
    const colabId = params.get('colaborador');
    if (!colabId) return;
    const el = document.getElementById(`colab-${colabId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-primary');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2500);
    }
  }, [isLoading, colaboradores]);

  const stats = useMemo(() => {
    if (!colaboradores) return { upcoming: 0, overdue: 0, inProgress: 0, completed: 0, notStarted: 0 };

    let upcoming = 0;
    let overdue = 0;
    let inProgress = 0;
    let completed = 0;
    let notStarted = 0;

    colaboradores.forEach(colab => {
      colab.milestones.forEach(m => {
        if (m.isOverdue) overdue++;
        else if (m.isUpcoming) upcoming++;
        else if (m.isNotStarted) notStarted++;
        else if (['LINKS_GERADOS', 'COLAB_RESPONDIDO', 'GESTOR_RESPONDIDO'].includes(m.status)) inProgress++;
        else if (m.status === 'CONCLUIDO') completed++;
      });
    });

    return { upcoming, overdue, inProgress, completed, notStarted };
  }, [colaboradores]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleViewAnalysis = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setAnalysisOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="space-y-6">
            {/* Stats Cards - Only show for active employees */}
            {statusFilter === 'ATIVO' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-warning/10">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
                      <p className="text-sm text-muted-foreground">Atrasados</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-info/10">
                      <Clock className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
                      <p className="text-sm text-muted-foreground">Próximos 7 Dias</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-muted">
                      <CircleDashed className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.notStarted}</p>
                      <p className="text-sm text-muted-foreground">Não Iniciados</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                      <p className="text-sm text-muted-foreground">Em Andamento</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-success/10">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                      <p className="text-sm text-muted-foreground">Concluídos</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Histórico Header */}
            {statusFilter === 'DESLIGADO' && (
              <Card className="shadow-card mb-6 border-l-4 border-l-muted-foreground">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Histórico de Colaboradores Desligados</p>
                      <p className="text-sm text-muted-foreground">
                        Visualize o histórico de feedbacks de colaboradores que não estão mais ativos na empresa.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filtros: busca por profissional + empresa cliente */}
            {colaboradores && colaboradores.length > 0 && (
              <Card className="shadow-card mb-4">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar colaborador por nome..."
                      className="pl-9"
                    />
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start sm:w-72">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span className="truncate">
                          {empresasSelecionadas.length === 0
                            ? 'Empresa Cliente: Todas'
                            : `Empresa Cliente (${empresasSelecionadas.length})`}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="end">
                      <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                        {empresasClienteOptions.length === 0 && (
                          <p className="text-sm text-muted-foreground p-2">
                            Nenhuma empresa cliente disponível.
                          </p>
                        )}
                        {empresasClienteOptions.map(opt => {
                          const checked = empresasSelecionadas.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleEmpresa(opt.value)}
                              />
                              <span className="text-sm text-foreground truncate">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      {empresasSelecionadas.length > 0 && (
                        <div className="border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setEmpresasSelecionadas([])}
                          >
                            Limpar seleção
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* All Collaborators with Milestones */}
            {colaboradores && colaboradores.length > 0 ? (
              colaboradoresFiltrados.length > 0 ? (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {statusFilter === 'ATIVO' ? 'Colaboradores Ativos' : 'Colaboradores Desligados'}
                      <Badge variant="secondary" className="ml-2">
                        {colaboradoresFiltrados.length}
                        {hasActiveFilters && ` / ${colaboradores.length}`}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {colaboradoresFiltrados.map(colab => (
                        <div
                          key={colab.id}
                          id={`colab-${colab.id}`}
                          className="p-4 rounded-lg border bg-card scroll-mt-24"
                        >
                          <div className="flex items-start gap-3 mb-4">
                            <Avatar className="h-10 w-10 border-2 border-border">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {getInitials(colab.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{colab.full_name}</p>
                                {colab.status === 'DESLIGADO' && (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                    Desligado
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <span>{colab.job_title}</span>
                                <span>•</span>
                                <span>{colab.department}</span>
                                <span>•</span>
                                <span>Admissão: {colab.admission_date.split('-').reverse().join('/')}</span>
                                {colab.empresa_cliente && (
                                  <>
                                    <span>•</span>
                                    <span>Empresa Cliente: {colab.empresa_cliente}</span>
                                  </>
                                )}
                                {colab.gestao_tecnica && (
                                  <>
                                    <span>•</span>
                                    <span>Gestão Técnica: {colab.gestao_tecnica}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {colab.milestones.map(milestone => (
                              <MilestoneCard
                                key={milestone.cycle_id}
                                milestone={milestone}
                                colaboradorId={colab.id}
                                colaboradorNome={colab.full_name}
                                gestorNamePrefill={colab.gestao_tecnica ?? ''}
                                onViewAnalysis={handleViewAnalysis}
                                isHistorical={colab.status === 'DESLIGADO'}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-card">
                  <CardContent className="p-12 text-center">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Nenhum colaborador corresponde aos filtros
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ajuste a busca ou o filtro de Empresa Cliente para ver mais resultados.
                    </p>
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {statusFilter === 'ATIVO' 
                      ? 'Nenhum colaborador ativo encontrado' 
                      : 'Nenhum colaborador desligado encontrado'}
                  </h3>
                  <p className="text-muted-foreground">
                    {statusFilter === 'ATIVO'
                      ? 'Cadastre colaboradores no módulo "Colaboradores" para visualizar seus marcos de feedback.'
                      : 'Não há histórico de colaboradores desligados com ciclos de feedback.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Comparative Analysis Dialog */}
      <ComparativeAnalysis
        cycleId={selectedCycleId}
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
      />
    </>
  );
}
