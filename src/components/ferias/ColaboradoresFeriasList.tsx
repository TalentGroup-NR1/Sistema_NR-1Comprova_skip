import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Calendar, AlertTriangle, CheckCircle, Clock, XCircle, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useColaboradoresComFerias, getStatusFerias } from "@/hooks/useFerias";
import { useAuth } from "@/hooks/useAuth";
import { ImportarUltimasFeriasDialog } from "./ImportarUltimasFeriasDialog";
import {
  calcularPeriodoAquisitivoAtual,
  calcularStatusColaborador,
  contarPorColaborador,
} from "@/lib/feriasEngine";

export type FiltroFerias = 'todas' | 'vencidas' | 'a_vencer';

interface ColaboradoresFeriasListProps {
  onSelectColaborador: (id: string) => void;
  filtroFerias?: FiltroFerias;
  onLimparFiltro?: () => void;
  totalEsperadoDivergencia?: number;
}

export function ColaboradoresFeriasList({
  onSelectColaborador,
  filtroFerias = 'todas',
  onLimparFiltro,
  totalEsperadoDivergencia,
}: ColaboradoresFeriasListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const { data: colaboradores, isLoading } = useColaboradoresComFerias();
  const { role } = useAuth();
  const canImport = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';

  const colaboradoresComStatus = useMemo(() =>
    (colaboradores || []).map((c) => ({
      ...c,
      statusFeriasCalculado: calcularStatusColaborador(
        (c.periodos_aquisitivos || []).map((p: any) => ({
          ...p,
          gozos: (c.ferias_gozo || []).filter(
            (g: any) => g.periodo_aquisitivo_id === p.id && g.status !== 'cancelado'
          ),
        }))
      ),
    })),
    [colaboradores]
  );

  const colaboradoresFiltrados = useMemo(() => {
    let lista = colaboradoresComStatus;
    if (filtroFerias === 'vencidas') {
      lista = lista.filter((c) => c.statusFeriasCalculado.vencidos > 0);
    } else if (filtroFerias === 'a_vencer') {
      lista = lista.filter((c) => c.statusFeriasCalculado.aVencer > 0);
    }

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(t) ||
          c.department?.toLowerCase().includes(t) ||
          c.job_title?.toLowerCase().includes(t)
      );
    }
    return lista;
  }, [colaboradoresComStatus, filtroFerias, searchTerm]);

  const totalDashboardEsperado = useMemo(() => {
    if (totalEsperadoDivergencia !== undefined) {
      return totalEsperadoDivergencia;
    }
    if (filtroFerias === 'todas') return 0;
    const colabsFormatados = (colaboradores || []).map((c) => ({
      id: c.id,
      periodos: (c.periodos_aquisitivos || []).map((p: any) => ({
        ...p,
        gozos: (c.ferias_gozo || []).filter(
          (g: any) => g.periodo_aquisitivo_id === p.id && g.status !== 'cancelado'
        ),
      })),
    }));
    const contagem = contarPorColaborador(colabsFormatados);
    return filtroFerias === 'vencidas' ? contagem.colaboradoresVencidos : contagem.colaboradoresAVencer;
  }, [colaboradores, filtroFerias, totalEsperadoDivergencia]);

  const temDivergencia =
    filtroFerias !== 'todas' && colaboradoresFiltrados.length === 0 && totalDashboardEsperado > 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'vencido':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'adquirido':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'gozado':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestão de Férias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestão de Férias
          </CardTitle>
          {canImport && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Importar férias passadas (CSV)
            </Button>
          )}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {filtroFerias !== 'todas' && (
            <div className="flex items-center">
              {filtroFerias === 'vencidas' ? (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                  onClick={onLimparFiltro}
                  data-testid="chip-filtro-vencidas"
                >
                  <span>Férias vencidas</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLimparFiltro?.();
                    }}
                    className="hover:opacity-75 focus:outline-none"
                    aria-label="Limpar filtro de férias vencidas"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-sm bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100 cursor-pointer"
                  onClick={onLimparFiltro}
                  data-testid="chip-filtro-avencer"
                >
                  <span>A vencer (90 dias)</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLimparFiltro?.();
                    }}
                    className="hover:opacity-75 focus:outline-none"
                    aria-label="Limpar filtro de férias a vencer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {temDivergencia && (
          <div
            role="alert"
            data-testid="alerta-divergencia"
            className="p-3 mb-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm font-medium flex items-center gap-2"
          >
            <span>
              ⚠️ Divergência detectada: o painel indica {totalDashboardEsperado} colaborador(es) mas a lista está vazia. Reporte este caso ao suporte.
            </span>
          </div>
        )}

        {colaboradoresFiltrados.length === 0 ? (
          filtroFerias === 'vencidas' ? (
            <div className="text-center py-8 text-muted-foreground space-y-3" data-testid="empty-vencidas">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-foreground">Nenhum colaborador com férias vencidas.</p>
              {onLimparFiltro && (
                <Button variant="outline" size="sm" onClick={onLimparFiltro}>
                  Limpar filtro
                </Button>
              )}
            </div>
          ) : filtroFerias === 'a_vencer' ? (
            <div className="text-center py-8 text-muted-foreground space-y-3" data-testid="empty-avencer">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium text-foreground">Nenhum colaborador com férias a vencer nos próximos 90 dias.</p>
              {onLimparFiltro && (
                <Button variant="outline" size="sm" onClick={onLimparFiltro}>
                  Limpar filtro
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="empty-todas">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum colaborador encontrado</p>
            </div>
          )
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="hidden md:table-cell">Cargo</TableHead>
                  <TableHead className="hidden lg:table-cell">Departamento</TableHead>
                  <TableHead className="hidden xl:table-cell">Data Admissão</TableHead>
                  <TableHead className="hidden md:table-cell">Período Aquisitivo Atual</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradoresFiltrados.map((colaborador) => {
                  const periodo = calcularPeriodoAquisitivoAtual({
                    admission_date: colaborador.admission_date,
                    ultima_ferias_inicio: (colaborador as any).ultima_ferias_inicio,
                    ultima_ferias_fim: (colaborador as any).ultima_ferias_fim,
                    data_corte_ferias: (colaborador as any).data_corte_ferias,
                  });
                  const statusFeriasLegado = getStatusFerias(
                    {
                      admission_date: colaborador.admission_date,
                      ultima_ferias_inicio: (colaborador as any).ultima_ferias_inicio,
                      ultima_ferias_fim: (colaborador as any).ultima_ferias_fim,
                      data_corte_ferias: (colaborador as any).data_corte_ferias,
                    },
                    colaborador.periodos_aquisitivos,
                    colaborador.ferias_gozo
                  );

                  const { vencidos, aVencer } = colaborador.statusFeriasCalculado;
                  const temBadgesCalculados = vencidos > 0 || aVencer > 0;

                  return (
                    <TableRow
                      key={colaborador.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onSelectColaborador(colaborador.id)}
                    >
                      <TableCell className="font-medium">{colaborador.full_name}</TableCell>
                      <TableCell className="hidden md:table-cell">{colaborador.job_title}</TableCell>
                      <TableCell className="hidden lg:table-cell">{colaborador.department}</TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {format(parseISO(colaborador.admission_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {format(periodo.inicio, "dd/MM/yyyy", { locale: ptBR })} - {format(periodo.fim, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        {temBadgesCalculados ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {vencidos > 0 && (
                              <Badge variant="destructive" className="w-fit">
                                {vencidos === 1 ? "Férias vencidas" : `${vencidos} períodos vencidos`}
                              </Badge>
                            )}
                            {aVencer > 0 && (
                              <Badge
                                variant="outline"
                                className="w-fit bg-yellow-50 text-yellow-800 border-yellow-300"
                              >
                                {aVencer === 1 ? "A vencer (90d)" : `${aVencer} períodos a vencer`}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant={statusFeriasLegado.color} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(statusFeriasLegado.status)}
                            {statusFeriasLegado.label}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <ImportarUltimasFeriasDialog open={importOpen} onOpenChange={setImportOpen} />
    </Card>
  );
}
