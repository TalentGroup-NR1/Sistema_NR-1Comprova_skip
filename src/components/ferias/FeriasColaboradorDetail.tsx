import { useState, useMemo, useEffect, useRef } from "react";
import { format, parseISO, addYears, addMonths, differenceInDays, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, User, Briefcase, Building2, Calendar, AlertTriangle, Plus, Edit, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeriasColaborador, useDeleteFeriasGozo, useDeletePeriodoAquisitivo, useSyncPeriodosAquisitivos, useAprovarFeriasGozo, useMarcarFeriasGozadas, FeriasGozo, PeriodoAquisitivo } from "@/hooks/useFerias";
import { calcularDiasDireitoProporcional, isVinculoElegivelFerias } from "@/lib/feriasEngine";


import { FeriasGozoForm } from "./FeriasGozoForm";
import { RecusarFeriasDialog } from "./RecusarFeriasDialog";
import { LancarFeriasPassadasDialog } from "./LancarFeriasPassadasDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeriasColaboradorDetailProps {
  colaboradorId: string;
  onBack: () => void;
  readOnly?: boolean;
}

const statusLabels: Record<string, string> = {
  planejado: 'Planejado',
  aprovado: 'Aprovado',
  gozado: 'Gozado',
  cancelado: 'Cancelado'
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  planejado: 'outline',
  aprovado: 'default',
  gozado: 'secondary',
  cancelado: 'destructive'
};

export function FeriasColaboradorDetail({ colaboradorId, onBack, readOnly = false }: FeriasColaboradorDetailProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingGozo, setEditingGozo] = useState<FeriasGozo | null>(null);
  const [formPeriodoId, setFormPeriodoId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingPeriodoId, setDeletingPeriodoId] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  const [recusarId, setRecusarId] = useState<string | null>(null);
  const [showPassadasDialog, setShowPassadasDialog] = useState(false);
  const formCardRef = useRef<HTMLDivElement>(null);
  const [formHighlight, setFormHighlight] = useState(false);

  // Quando o formulário abre, rola até ele e destaca brevemente.
  useEffect(() => {
    if (showForm && formCardRef.current) {
      formCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setFormHighlight(true);
      const t = setTimeout(() => setFormHighlight(false), 1500);
      return () => clearTimeout(t);
    }
  }, [showForm, formPeriodoId, editingGozo]);
  
  const { data, isLoading, refetch } = useFeriasColaborador(colaboradorId);
  const deleteGozo = useDeleteFeriasGozo();
  const deletePeriodo = useDeletePeriodoAquisitivo();
  const syncPeriodos = useSyncPeriodosAquisitivos();
  const aprovar = useAprovarFeriasGozo();
  const marcarGozadas = useMarcarFeriasGozadas();
  


  // Sync acquisition periods when collaborator data is loaded
  useEffect(() => {
    if (data?.colaborador && !hasSynced && !syncPeriodos.isPending && !readOnly && isVinculoElegivelFerias((data.colaborador as any).contract_type)) {
      syncPeriodos.mutate({
        colaboradorId: data.colaborador.id,
        companyId: data.colaborador.company_id,
        admissionDate: data.colaborador.admission_date,
        ultimaFeriasInicio: (data.colaborador as any).ultima_ferias_inicio,
        ultimaFeriasFim: (data.colaborador as any).ultima_ferias_fim,
        dataCorteFerias: (data.colaborador as any).data_corte_ferias,
      }, {
        onSuccess: () => {
          setHasSynced(true);
          refetch();
        }
      });
    }
    // For read-only, mark as synced immediately
    if (readOnly && !hasSynced) {
      setHasSynced(true);
    }
  }, [data?.colaborador, hasSynced]);

  // Find the active acquisition period from DB
  const periodoAtivoDb = useMemo((): PeriodoAquisitivo | null => {
    if (!data?.periodos || data.periodos.length === 0 || !data.colaborador) return null;

    const today = new Date();
    const periodosOrdenados = [...data.periodos].sort(
      (a, b) => new Date(a.data_inicio_aquisitivo).getTime() - new Date(b.data_inicio_aquisitivo).getTime()
    );

    // Helper: dias de direito efetivos (proporcionais p/ período em andamento)
    const getDireito = (p: PeriodoAquisitivo) =>
      calcularDiasDireitoProporcional(p.data_inicio_aquisitivo, p.data_fim_aquisitivo, today);

    // Helper: saldo do período (usa direito proporcional)
    const saldo = (p: PeriodoAquisitivo) => {
      const usados = data.gozos
        .filter(g => g.periodo_aquisitivo_id === p.id && g.status !== 'cancelado')
        .reduce((sum, g) => sum + g.dias_gozados + (g.abono_pecuniario_dias || 0), 0);
      return getDireito(p) - usados;
    };

    // 1) Prioridade: períodos VENCIDOS com saldo (hoje > limite_gozo)
    for (const p of periodosOrdenados) {
      const limite = parseISO(p.data_limite_gozo);
      if (isAfter(today, limite) && saldo(p) > 0) return p;
    }

    // 2) Período já adquirido (fim <= hoje) com saldo, dentro do limite
    for (const p of periodosOrdenados) {
      const fim = parseISO(p.data_fim_aquisitivo);
      if (!isAfter(fim, today) && saldo(p) > 0) return p;
    }

    // 3) Período EM AQUISIÇÃO (hoje entre inicio e fim)
    const emAquisicao = periodosOrdenados.find(p => {
      const ini = parseISO(p.data_inicio_aquisitivo);
      const fim = parseISO(p.data_fim_aquisitivo);
      return !isAfter(ini, today) && isAfter(fim, today);
    });
    if (emAquisicao) return emAquisicao;

    // 4) Fallback: mais recente
    return periodosOrdenados[periodosOrdenados.length - 1] || null;
  }, [data]);


  // Calculate balance for the active period
  const saldoFerias = useMemo(() => {
    if (!periodoAtivoDb || !data) {
      return { adquiridos: 30, gozados: 0, restantes: 30, fracionamentos: 0 };
    }
    
    const gozosNoPeriodo = data.gozos.filter(
      g => g.periodo_aquisitivo_id === periodoAtivoDb.id && g.status !== 'cancelado'
    );
    const diasGozados = gozosNoPeriodo.reduce((sum, g) => sum + g.dias_gozados + (g.abono_pecuniario_dias || 0), 0);
    const direito = calcularDiasDireitoProporcional(
      periodoAtivoDb.data_inicio_aquisitivo,
      periodoAtivoDb.data_fim_aquisitivo,
      new Date()
    );
    
    return {
      adquiridos: direito,
      gozados: diasGozados,
      restantes: direito - diasGozados,
      fracionamentos: gozosNoPeriodo.length
    };
  }, [data, periodoAtivoDb]);

  const alertaVencimento = useMemo(() => {
    if (!periodoAtivoDb || saldoFerias.restantes <= 0) return null;
    
    const today = new Date();
    const dataLimite = parseISO(periodoAtivoDb.data_limite_gozo);
    const diasParaVencer = differenceInDays(dataLimite, today);
    
    if (diasParaVencer < 0) {
      return { type: 'error', message: 'Férias vencidas! O colaborador deve gozar as férias imediatamente.' };
    }
    if (diasParaVencer < 30) {
      return { type: 'warning', message: `Férias prestes a vencer! Restam ${diasParaVencer} dias para o limite de gozo.` };
    }
    if (diasParaVencer < 90) {
      return { type: 'info', message: `Atenção: ${diasParaVencer} dias para o limite de gozo das férias.` };
    }
    return null;
  }, [periodoAtivoDb, saldoFerias.restantes]);

  const handleDelete = async () => {
    if (deletingId) {
      await deleteGozo.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading || syncPeriodos.isPending) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              {syncPeriodos.isPending ? "Sincronizando períodos aquisitivos..." : "Carregando..."}
            </span>
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data?.colaborador) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Colaborador não encontrado</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const { colaborador, gozos } = data;
  const vinculoElegivel = isVinculoElegivelFerias((colaborador as any).contract_type);

  if (!vinculoElegivel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-xl font-semibold">Férias — {colaborador.full_name}</h2>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Férias não aplicáveis para este tipo de vínculo</AlertTitle>
          <AlertDescription>
            O colaborador está cadastrado como{" "}
            <strong>{(colaborador as any).contract_type ?? "vínculo não informado"}</strong>, que
            não possui direito legal a férias pela CLT. O módulo está disponível apenas para
            vínculos CLT, Aprendiz e Estagiário.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          {!readOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassadasDialog(true)}
                title="Registrar férias já gozadas em períodos anteriores"
              >
                <Plus className="h-4 w-4 mr-2" />
                Lançar férias passadas
              </Button>
            </>
          )}
          <h2 className="text-xl font-semibold">{readOnly ? 'Visualizar Férias' : 'Gestão de Férias'}</h2>
        </div>
      </div>

      {!readOnly && (
        <LancarFeriasPassadasDialog
          open={showPassadasDialog}
          onOpenChange={setShowPassadasDialog}
          colaboradorId={colaboradorId}
          companyId={colaborador.company_id}
          admissionDate={colaborador.admission_date}
          periodos={data.periodos || []}
        />
      )}


      {/* Collaborator Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {colaborador.full_name}
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-4 mt-2">
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {colaborador.job_title}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {colaborador.department}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Admissão: {format(parseISO(colaborador.admission_date), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            {colaborador.manager_name && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Gestor: {colaborador.manager_name}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alert */}
      {alertaVencimento && (
        <Alert variant={alertaVencimento.type === 'error' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {alertaVencimento.type === 'error' ? 'Férias Vencidas' : 'Atenção'}
          </AlertTitle>
          <AlertDescription>{alertaVencimento.message}</AlertDescription>
        </Alert>
      )}

      {/* Current Period & Balance */}
      {periodoAtivoDb ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Período Aquisitivo Ativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Início</p>
                <p className="text-lg font-semibold">
                  {format(parseISO(periodoAtivoDb.data_inicio_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Fim</p>
                <p className="text-lg font-semibold">
                  {format(parseISO(periodoAtivoDb.data_fim_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Limite Gozo</p>
                <p className="text-lg font-semibold">
                  {format(parseISO(periodoAtivoDb.data_limite_gozo), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Dias Adquiridos</p>
                <p className="text-2xl font-bold text-primary">{saldoFerias.adquiridos}</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Saldo Restante</p>
                <p className="text-2xl font-bold text-green-600">{saldoFerias.restantes}</p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Dias gozados: {saldoFerias.gozados}</span>
              <span>Fracionamentos: {saldoFerias.fracionamentos}/3</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sem Período Aquisitivo</AlertTitle>
          <AlertDescription>
            Não há período aquisitivo disponível para lançar férias. O colaborador ainda não completou 1 ano de trabalho.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Vacation Period - Only for admin */}
      {!readOnly && (
        <Card
          ref={formCardRef}
          className={`transition-shadow ${formHighlight ? "ring-2 ring-primary shadow-lg" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Lançar Período de Férias</CardTitle>
            {!showForm && periodoAtivoDb && saldoFerias.restantes > 0 && saldoFerias.fracionamentos < 3 && (
              <Button 
                onClick={() => {
                  setFormPeriodoId(periodoAtivoDb.id);
                  setEditingGozo(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Período
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!periodoAtivoDb && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não há período aquisitivo ativo para lançar férias.
                </AlertDescription>
              </Alert>
            )}
            
            {periodoAtivoDb && saldoFerias.fracionamentos >= 3 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Limite de 3 fracionamentos atingido para este período aquisitivo.
                </AlertDescription>
              </Alert>
            )}
            
            {periodoAtivoDb && saldoFerias.restantes <= 0 && saldoFerias.fracionamentos < 3 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Todos os dias de férias já foram lançados para este período.
                </AlertDescription>
              </Alert>
            )}

            {showForm && (() => {
              const periodoForm = (data.periodos || []).find(p => p.id === (formPeriodoId || periodoAtivoDb?.id));
              if (!periodoForm) return null;
              const usados = data.gozos
                .filter(g => g.periodo_aquisitivo_id === periodoForm.id && g.status !== 'cancelado' && (!editingGozo || g.id !== editingGozo.id))
                .reduce((sum, g) => sum + g.dias_gozados + (g.abono_pecuniario_dias || 0), 0);
              const direitoForm = calcularDiasDireitoProporcional(periodoForm.data_inicio_aquisitivo, periodoForm.data_fim_aquisitivo, new Date());
              const restantes = direitoForm - usados;
              return (
                <FeriasGozoForm
                  colaboradorId={colaboradorId}
                  companyId={colaborador.company_id}
                  periodoAquisitivoId={periodoForm.id}
                  diasRestantes={restantes}
                  editingGozo={editingGozo}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingGozo(null);
                    setFormPeriodoId(null);
                  }}
                  onSuccess={() => {
                    setShowForm(false);
                    setEditingGozo(null);
                    setFormPeriodoId(null);
                  }}
                />
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Vacation History grouped by acquisition period */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Férias</CardTitle>
          <CardDescription>
            Cada bloco representa um período aquisitivo, com os lançamentos vinculados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const today = new Date();
            const periodosOrdenados = [...(data.periodos || [])].sort(
              (a, b) =>
                new Date(b.data_inicio_aquisitivo).getTime() -
                new Date(a.data_inicio_aquisitivo).getTime()
            );
            const gozosSemPeriodo = gozos.filter(
              (g) => !g.periodo_aquisitivo_id || !periodosOrdenados.some((p) => p.id === g.periodo_aquisitivo_id)
            );

            if (periodosOrdenados.length === 0 && gozos.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum período de férias registrado</p>
                </div>
              );
            }

            const renderGozosTable = (gozosDoPeriodo: FeriasGozo[]) => {
              if (gozosDoPeriodo.length === 0) {
                return (
                  <div className="text-center text-sm text-muted-foreground py-4 border-t">
                    Nenhum lançamento neste período
                  </div>
                );
              }
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                      {!readOnly && <TableHead className="text-right">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gozosDoPeriodo
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.data_inicio_gozo).getTime() -
                          new Date(a.data_inicio_gozo).getTime()
                      )
                      .map((gozo) => (
                        <TableRow key={gozo.id}>
                          <TableCell>
                            {format(parseISO(gozo.data_inicio_gozo), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(gozo.data_fim_gozo), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{gozo.dias_gozados}</span>
                            <span className="text-muted-foreground"> de descanso</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[gozo.status]}>
                              {statusLabels[gozo.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {gozo.observacoes || "-"}
                          </TableCell>
                          {!readOnly && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2 flex-wrap">
                                {gozo.status === "planejado" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => aprovar.mutate(gozo.id)}
                                      disabled={aprovar.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setRecusarId(gozo.id)}
                                    >
                                      Recusar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingGozo(gozo);
                                        setFormPeriodoId(gozo.periodo_aquisitivo_id);
                                        setShowForm(true);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeletingId(gozo.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                                {gozo.status === "aprovado" &&
                                  parseISO(gozo.data_fim_gozo) <= new Date() && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => marcarGozadas.mutate(gozo.id)}
                                      disabled={marcarGozadas.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" /> Marcar como Gozado
                                    </Button>
                                  )}
                                {(gozo.status === "gozado" || gozo.status === "aprovado") && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setEditingGozo(gozo);
                                        setFormPeriodoId(gozo.periodo_aquisitivo_id);
                                        setShowForm(true);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                      title="Editar lançamento"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeletingId(gozo.id)}
                                      title="Excluir lançamento"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              );
            };

            return (
              <>
                {periodosOrdenados.map((periodo) => {
                  const gozosDoPeriodo = gozos.filter(
                    (g) => g.periodo_aquisitivo_id === periodo.id && g.status !== "cancelado"
                  );
                  const diasUtilizados = gozosDoPeriodo.reduce(
                    (sum, g) => sum + g.dias_gozados + (g.abono_pecuniario_dias || 0),
                    0
                  );
                  const limite = parseISO(periodo.data_limite_gozo);
                  const fimAq = parseISO(periodo.data_fim_aquisitivo);
                  const diasDireito = calcularDiasDireitoProporcional(
                    periodo.data_inicio_aquisitivo,
                    periodo.data_fim_aquisitivo,
                    today
                  );
                  let statusLabel = "EM ANDAMENTO";
                  let statusTone = "bg-amber-500/10 text-amber-700 border-amber-500/20";
                  if (isAfter(today, limite) && diasUtilizados < diasDireito) {
                    statusLabel = "VENCIDO";
                    statusTone = "bg-destructive/10 text-destructive border-destructive/20";
                  } else if (diasUtilizados >= diasDireito && diasDireito > 0) {
                    statusLabel = "FECHADO";
                    statusTone = "bg-muted text-muted-foreground border-border";
                  } else if (!isAfter(fimAq, today)) {
                    statusLabel = "ADQUIRIDO";
                    statusTone = "bg-primary/10 text-primary border-primary/20";
                  }

                  return (
                    <div key={periodo.id} className="rounded-xl border bg-card overflow-hidden">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/40 text-sm relative">
                        {!readOnly && gozosDoPeriodo.length === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={() => setDeletingPeriodoId(periodo.id)}
                            title="Excluir período aquisitivo"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold mt-1 ${statusTone}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Período</p>
                          <p className="font-medium">
                            {format(parseISO(periodo.data_inicio_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                            {" - "}
                            {format(parseISO(periodo.data_fim_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Vencimento</p>
                          <p className="font-medium">
                            {format(parseISO(periodo.data_limite_gozo), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dias de Direito</p>
                          <p className="font-medium">
                            {diasDireito}
                            {diasDireito < 30 && (
                              <span className="ml-1 text-xs text-muted-foreground">(proporcional)</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Dias Utilizados</p>
                          <p className="font-medium">
                            {diasUtilizados} de descanso
                          </p>
                        </div>
                      </div>
                      {!readOnly && (diasDireito - diasUtilizados) > 0 && gozosDoPeriodo.length < 3 && (
                        <div className="flex justify-end px-4 py-2 bg-muted/20 border-y">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFormPeriodoId(periodo.id);
                              setEditingGozo(null);
                              setShowForm(true);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar descanso ({diasDireito - diasUtilizados} dias restantes)
                          </Button>
                        </div>
                      )}
                      <div className="px-2 py-1 text-center text-xs font-semibold text-muted-foreground bg-muted/20 border-y">
                        Férias no Período
                      </div>
                      {renderGozosTable(gozosDoPeriodo)}
                    </div>
                  );
                })}

                {gozosSemPeriodo.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
                    <div className="p-4 text-sm">
                      <p className="font-semibold text-destructive">Lançamentos sem período vinculado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verifique as datas de início — o sistema reassocia automaticamente ao período aquisitivo correto.
                      </p>
                    </div>
                    {renderGozosTable(gozosSemPeriodo)}
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este período de férias? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingPeriodoId} onOpenChange={() => setDeletingPeriodoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir período aquisitivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este período aquisitivo? Ele deixará de aparecer no modal de lançamento. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingPeriodoId) {
                  await deletePeriodo.mutateAsync(deletingPeriodoId);
                  setDeletingPeriodoId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RecusarFeriasDialog open={!!recusarId} onOpenChange={(o) => !o && setRecusarId(null)} gozoId={recusarId} />
    </div>
  );
}
