import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, BarChart3, Filter, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useResultadosCiclo, ResultadoResumo } from "@/hooks/useAvaliacaoResultados";
import { useCicloMutations, CicloAvaliacao } from "@/hooks/useAvaliacoes";
import { useToast } from "@/hooks/use-toast";

interface ResultadosCicloTabProps {
  cicloId: string;
  cicloStatus: 'configuracao' | 'ativo' | 'finalizado';
  onStatusChange?: () => void;
}

const statusConfig = {
  nao_iniciada: { label: "Não iniciada", icon: Clock, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", icon: AlertCircle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  concluida: { label: "Concluída", icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

function formatNumber(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return val.toFixed(decimals);
}

function DiscrepancyBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  
  const absValue = Math.abs(value);
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  let className = "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ";
  if (absValue > 1) {
    className += isPositive 
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
  } else {
    className += "bg-muted text-muted-foreground";
  }
  
  return (
    <span className={className}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {value > 0 ? "+" : ""}{formatNumber(value)}
    </span>
  );
}

function StatusBadge({ status, tipo }: { status: 'nao_iniciada' | 'em_andamento' | 'concluida'; tipo: 'auto' | 'gestor' }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge className={config.className} variant="outline">
      <Icon className="h-3 w-3 mr-1" />
      {tipo === 'auto' ? 'A' : 'G'}: {config.label}
    </Badge>
  );
}

export function ResultadosCicloTab({ cicloId, cicloStatus, onStatusChange }: ResultadosCicloTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: resultados, isLoading } = useResultadosCiclo(cicloId);
  const { updateCiclo } = useCicloMutations();
  
  // Filters
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("all");
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  const [gestorFilter, setGestorFilter] = useState<string>("all");

  const handleViewResult = (avaliacaoId: string) => {
    navigate(`/avaliacao/resultado/${avaliacaoId}`);
  };

  const handleEncerrarCiclo = async () => {
    try {
      await updateCiclo.mutateAsync({ id: cicloId, status: 'finalizado' });
      toast({ title: "Ciclo encerrado com sucesso!", description: "Novas respostas não serão mais aceitas." });
      onStatusChange?.();
    } catch (error) {
      toast({ title: "Erro ao encerrar ciclo", variant: "destructive" });
    }
  };

  const handleReabrirCiclo = async () => {
    try {
      await updateCiclo.mutateAsync({ id: cicloId, status: 'ativo' });
      toast({ title: "Ciclo reaberto com sucesso!" });
      onStatusChange?.();
    } catch (error) {
      toast({ title: "Erro ao reabrir ciclo", variant: "destructive" });
    }
  };

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    if (!resultados) return { departamentos: [], cargos: [], gestores: [] };
    
    const departamentos = [...new Set(resultados.map(r => r.colaboradorDepartamento).filter(Boolean))];
    const cargos = [...new Set(resultados.map(r => r.colaboradorCargo).filter(Boolean))];
    const gestores = [...new Set(resultados.map(r => r.gestorNome).filter(Boolean))];
    
    return { departamentos, cargos, gestores };
  }, [resultados]);

  // Apply filters
  const filteredResultados = useMemo(() => {
    if (!resultados) return [];
    
    return resultados.filter(r => {
      if (departamentoFilter !== "all" && r.colaboradorDepartamento !== departamentoFilter) return false;
      if (cargoFilter !== "all" && r.colaboradorCargo !== cargoFilter) return false;
      if (gestorFilter !== "all" && r.gestorNome !== gestorFilter) return false;
      return true;
    });
  }, [resultados, departamentoFilter, cargoFilter, gestorFilter]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const totalAvaliacoes = resultados?.length || 0;
  const completasAmbas = resultados?.filter(
    r => r.statusAutoavaliacao === 'concluida' && r.statusAvaliacaoGestor === 'concluida'
  ).length || 0;
  
  const avaliacoesComDiscrepancia = resultados?.filter(r => r.discrepancia !== null) || [];
  const avgDiscrepancia = avaliacoesComDiscrepancia.length > 0
    ? avaliacoesComDiscrepancia.reduce((acc, r) => acc + (r.discrepancia || 0), 0) / avaliacoesComDiscrepancia.length
    : null;

  const avgMediaColab = resultados?.filter(r => r.mediaColaborador !== null).reduce((acc, r, _, arr) => 
    acc + (r.mediaColaborador || 0) / arr.length, 0) || null;
  const avgMediaGestor = resultados?.filter(r => r.mediaGestor !== null).reduce((acc, r, _, arr) => 
    acc + (r.mediaGestor || 0) / arr.length, 0) || null;

  return (
    <div className="space-y-6">
      {/* Cycle Status Banner */}
      {cicloStatus === 'finalizado' && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">Ciclo Finalizado</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Este ciclo foi encerrado e não aceita mais respostas.
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Unlock className="h-4 w-4 mr-2" />
                    Reabrir Ciclo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reabrir ciclo de avaliação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao reabrir o ciclo, colaboradores e gestores poderão editar suas respostas novamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReabrirCiclo}>
                      Reabrir Ciclo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{completasAmbas}/{totalAvaliacoes}</p>
              <p className="text-sm text-muted-foreground">Avaliações Completas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {avgMediaColab !== null ? formatNumber(avgMediaColab) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Média Geral Auto</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {avgMediaGestor !== null ? formatNumber(avgMediaGestor) : "—"}
              </p>
              <p className="text-sm text-muted-foreground">Média Geral Gestor</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-1">Discrepância Média</p>
              {avgDiscrepancia !== null ? (
                <DiscrepancyBadge value={avgDiscrepancia} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {resultados && resultados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos departamentos</SelectItem>
                    {filterOptions.departamentos.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={cargoFilter} onValueChange={setCargoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos cargos</SelectItem>
                    {filterOptions.cargos.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={gestorFilter} onValueChange={setGestorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos gestores</SelectItem>
                    {filterOptions.gestores.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(departamentoFilter !== "all" || cargoFilter !== "all" || gestorFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setDepartamentoFilter("all");
                    setCargoFilter("all");
                    setGestorFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resultados por Colaborador
                {filteredResultados.length !== resultados?.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filteredResultados.length} de {resultados?.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Clique em "Ver detalhes" para visualizar a comparação completa de respostas
              </CardDescription>
            </div>
            {cicloStatus === 'ativo' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    Encerrar Ciclo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar ciclo de avaliação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao encerrar o ciclo, novas respostas não serão mais aceitas. 
                      Colaboradores e gestores que ainda não responderam verão uma mensagem informando que o ciclo foi finalizado.
                      Você pode reabrir o ciclo posteriormente se necessário.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEncerrarCiclo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Encerrar Ciclo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!resultados || resultados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma avaliação encontrada</p>
              <p className="text-sm">Aplique o ciclo para gerar avaliações</p>
            </div>
          ) : filteredResultados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum resultado para os filtros selecionados</p>
              <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Média Auto</TableHead>
                  <TableHead className="text-center">Média Gestor</TableHead>
                  <TableHead className="text-center">Discrepância</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResultados.map((resultado) => (
                  <TableRow key={resultado.avaliacaoId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{resultado.colaboradorNome}</p>
                        <p className="text-sm text-muted-foreground">
                          {resultado.colaboradorCargo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resultado.colaboradorDepartamento}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{resultado.gestorNome}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={resultado.statusAutoavaliacao} tipo="auto" />
                        <StatusBadge status={resultado.statusAvaliacaoGestor} tipo="gestor" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {resultado.hasNumericMetrics 
                        ? formatNumber(resultado.mediaColaborador)
                        : <span className="text-xs text-muted-foreground">N/A</span>
                      }
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {resultado.hasNumericMetrics 
                        ? formatNumber(resultado.mediaGestor)
                        : <span className="text-xs text-muted-foreground">N/A</span>
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      {resultado.hasNumericMetrics ? (
                        <DiscrepancyBadge value={resultado.discrepancia} />
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewResult(resultado.avaliacaoId)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
