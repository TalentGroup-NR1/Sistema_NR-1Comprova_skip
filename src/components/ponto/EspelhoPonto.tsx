import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Pencil, Trash2, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { gerarFolhaPontoPDF } from "@/lib/folhaPontoPDF";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { calcularResumoDiario, formatMinutes } from "@/hooks/usePontoResumo";
import { usePontoResumoDB, aplicarResumoDB } from "@/hooks/usePontoResumoDB";
import { usePontoCompensacoes } from "@/hooks/usePontoCompensacoes";
import { PontoRegistro } from "@/hooks/usePontoRegistros";
import { useFeriados } from "@/hooks/useFeriados";
import { useFeriasAtivas } from "@/hooks/useFeriasAtivas";
import { AjustePontoDialog } from "./AjustePontoDialog";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCicloVigente } from "@/lib/bancoHorasCiclo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

export function EspelhoPonto() {
  const companyId = useEffectiveCompanyId();
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { config } = usePontoConfig();
  const { compensacoes } = usePontoCompensacoes();
  const ciclo = getCicloVigente(config, new Date());
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedColaborador, setSelectedColaborador] = useState<string>("");
  // Saneia data yyyy-MM-dd inválida (ex.: 2026-04-31) ajustando para o último dia válido do mês
  const sanitizeDate = (s: string): string => {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return s;
    const lastDay = new Date(y, m, 0).getDate();
    const safeDay = Math.min(Math.max(d, 1), lastDay);
    return `${y}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  };
  const [startDateRaw, setStartDateRaw] = useState(ciclo.inicio);
  const [endDateRaw, setEndDateRaw] = useState(ciclo.fim < todayStr ? ciclo.fim : todayStr);
  const startDate = sanitizeDate(startDateRaw);
  const endDate = sanitizeDate(endDateRaw);
  const setStartDate = (v: string) => setStartDateRaw(v);
  const setEndDate = (v: string) => setEndDateRaw(v);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [editBatidaId, setEditBatidaId] = useState<string | null>(null);
  const [editHora, setEditHora] = useState("");
  const [editData, setEditData] = useState("");
  const [deleteBatidaId, setDeleteBatidaId] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["espelho-ponto"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-resumo-db"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-registros-historico"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-registros-hoje"] });
  };

  const editarMutation = useMutation({
    mutationFn: async ({ id, data, hora }: { id: string; data: string; hora: string }) => {
      // Aplica fuso horário local (-03:00 Brasil) explicitamente
      const localISO = `${data}T${hora}:00`;
      const localDate = new Date(localISO);
      const offsetMin = -localDate.getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const oh = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const om = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      const novoHorario = `${data}T${hora}:00${sign}${oh}:${om}`;
      const { error } = await supabase.rpc("editar_batida_ponto" as any, {
        p_batida_id: id,
        p_novo_horario: novoHorario,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batida atualizada");
      setEditBatidaId(null);
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao editar: " + e.message),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("excluir_batida_ponto" as any, { p_batida_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Batida excluída");
      setDeleteBatidaId(null);
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao excluir: " + e.message),
  });

  const invalidateAprovacoes = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: ["ponto-aprovacoes-pendentes"] });
  };

  const aprovarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ponto_registros")
        .update({
          status_aprovacao: "aprovado",
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcação aprovada");
      invalidateAprovacoes();
    },
    onError: (e: any) => toast.error("Erro ao aprovar: " + e.message),
  });

  const rejeitarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ponto_registros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcação rejeitada e removida");
      invalidateAprovacoes();
    },
    onError: (e: any) => toast.error("Erro ao rejeitar: " + e.message),
  });

  const openEdit = (r: { id: string; data_hora: string }) => {
    const d = new Date(r.data_hora);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setEditBatidaId(r.id);
    setEditData(`${y}-${m}-${day}`);
    setEditHora(`${hh}:${mm}`);
  };



  // Fetch colaboradores
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-ponto", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name, department, job_title, is_banco_horas, jornada_diaria_minutos, matricula, cpf, admission_date, work_schedule_id, ctps_numero, ctps_serie, pis")
        .eq("company_id", companyId)
        .eq("status", "ATIVO")
        .in("contract_type", ["CLT", "Estágio", "Aprendiz", "Temporário"])
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch registros for selected colaborador
  const { data: registros = [], isLoading } = useQuery({
    queryKey: ["espelho-ponto", selectedColaborador, startDate, endDate],
    queryFn: async () => {
      if (!selectedColaborador) return [];
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("colaborador_id", selectedColaborador)
        .gte("data_hora", `${startDate}T00:00:00`)
        .lte("data_hora", `${endDate}T23:59:59`)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data || []) as PontoRegistro[];
    },
    enabled: !!selectedColaborador && !!startDate && !!endDate,
  });

  const { data: empresa } = useQuery({
    queryKey: ["empresa-folha-ponto", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("name, cnpj, logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const days = startDate && endDate
    ? eachDayOfInterval({ start: new Date(startDate + "T12:00:00"), end: new Date(endDate + "T12:00:00") })
    : [];

  const selectedColab = colaboradores.find(c => c.id === selectedColaborador);

  const yearForFeriados = startDate ? new Date(startDate + "T12:00:00").getFullYear() : new Date().getFullYear();
  const { feriadosMap } = useFeriados(yearForFeriados);
  const { feriasDates } = useFeriasAtivas(selectedColaborador || null, startDate, endDate);

  const { data: workScheduleData } = useQuery({
    queryKey: ["work-schedule-info", (selectedColab as any)?.work_schedule_id],
    enabled: !!(selectedColab as any)?.work_schedule_id,
    queryFn: async () => {
      const wsId = (selectedColab as any)?.work_schedule_id;
      if (!wsId) return null;
      const { data, error } = await supabase
        .from("work_schedules")
        .select("dias_semana, trabalha_feriados")
        .eq("id", wsId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: resumoDB } = usePontoResumoDB(selectedColaborador, startDate, endDate);

  const { data: abonosPeriodo } = useQuery({
    queryKey: ["ponto-abonos-espelho", selectedColaborador, startDate, endDate],
    enabled: !!selectedColaborador && !!startDate && !!endDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ponto_abonos")
        .select("data_inicio, data_fim, modalidade, minutos_abonados, status, ponto_tipos_abono!inner(abona_horas)")
        .eq("colaborador_id", selectedColaborador)
        .eq("status", "ativo")
        .lte("data_inicio", endDate)
        .gte("data_fim", startDate);
      if (error) throw error;
      return data as any[];
    },
  });

  const jornadaBase = selectedColab?.jornada_diaria_minutos ?? config?.jornada_diaria_minutos ?? 480;
  const abonoMinPorDia = new Map<string, number>();
  for (const a of abonosPeriodo || []) {
    if (!a.ponto_tipos_abono?.abona_horas) continue;
    if (a.modalidade === "horas") {
      abonoMinPorDia.set(a.data_inicio, (abonoMinPorDia.get(a.data_inicio) || 0) + (a.minutos_abonados || 0));
    } else {
      const start = new Date(a.data_inicio + "T12:00:00");
      const end = new Date(a.data_fim + "T12:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = format(d, "yyyy-MM-dd");
        abonoMinPorDia.set(key, (abonoMinPorDia.get(key) || 0) + jornadaBase);
      }
    }
  }

  const resumos = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const client = calcularResumoDiario(registros, config || null, dayStr, selectedColab?.jornada_diaria_minutos, compensacoes, feriadosMap, feriasDates, (workScheduleData as any) ?? null, (selectedColab as any)?.admission_date ?? null);
    return aplicarResumoDB(client, resumoDB);
  }).reverse();

  // Totals for the period
  const totalSaldo = resumos.reduce((acc, r) => acc + r.saldoMin, 0);
  const totalExtras = resumos.reduce((acc, r) => acc + r.horasExtrasMin, 0);
  const totalAbono = resumos.reduce((acc, r) => acc + (abonoMinPorDia.get(r.data) || 0), 0);
  const totalPrevisto = resumos.reduce((acc, r) => acc + (r.horasPrevistasMin || 0), 0);
  const totalTrabalhado = resumos.reduce((acc, r) => acc + (r.horasTrabalhadasMin || 0), 0);

  const handleGerarPDF = async () => {
    if (!selectedColab || !empresa) {
      toast.error("Dados da empresa ou colaborador indisponíveis");
      return;
    }
    try {
      const resumosAsc = [...resumos].reverse();
      await gerarFolhaPontoPDF({
        empresa: {
          razao_social: empresa.name,
          cnpj: empresa.cnpj,
          endereco: null,
          logo_url: empresa.logo_url,
        },
        colaborador: {
          full_name: selectedColab.full_name,
          matricula: (selectedColab as any).matricula,
          admission_date: (selectedColab as any).admission_date,
          department: selectedColab.department,
          job_title: selectedColab.job_title,
          cpf: (selectedColab as any).cpf,
          ctps: (selectedColab as any).ctps_numero,
          ctps_serie: (selectedColab as any).ctps_serie,
          pis: (selectedColab as any).pis,
        },
        periodoInicio: startDate,
        periodoFim: endDate,
        resumos: resumosAsc,
      });
      toast.success("Folha de ponto gerada");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1 min-w-[250px]">
              <Label className="text-xs">Colaborador</Label>
              <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            {selectedColaborador && (
              <>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setAjusteOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Ajuste Manual
                </Button>
                <Button variant="default" size="sm" className="gap-1" onClick={handleGerarPDF}>
                  <FileText className="h-4 w-4" />
                  Folha de Ponto (PDF)
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedColaborador && selectedColab && (
        <Card>
          <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
              Espelho de Ponto — {selectedColab.full_name}
              <Badge variant="secondary" className={selectedColab.is_banco_horas ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}>
                {selectedColab.is_banco_horas ? "Banco de Horas" : "Horas Extras"}
              </Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Jornada: {Math.floor((selectedColab.jornada_diaria_minutos || 480) / 60)}h{((selectedColab.jornada_diaria_minutos || 480) % 60) > 0 ? ` ${(selectedColab.jornada_diaria_minutos || 480) % 60}min` : ""} diárias
              {" · "}
              {selectedColab.is_banco_horas
                ? `Saldo do período: ${formatMinutes(totalSaldo)}`
                : `Extras no período: ${formatMinutes(totalExtras)}`
              }
              {selectedColab.is_banco_horas && config?.banco_horas_inicio && config?.banco_horas_fim && (
                <>
                  {" · "}
                  <span className="font-medium">Ciclo: {format(new Date(config.banco_horas_inicio + "T12:00:00"), "dd/MM/yyyy")} - {format(new Date(config.banco_horas_fim + "T12:00:00"), "dd/MM/yyyy")}</span>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Período {/^\d{4}-\d{2}-\d{2}$/.test(startDate) ? format(new Date(startDate + "T12:00:00"), "dd/MM/yyyy") : "—"} a {/^\d{4}-\d{2}-\d{2}$/.test(endDate) ? format(new Date(endDate + "T12:00:00"), "dd/MM/yyyy") : "—"}
              {" · "}Previsto: <span className="font-medium">{formatMinutes(totalPrevisto)}</span>
              {" · "}Trabalhado: <span className="font-medium">{formatMinutes(totalTrabalhado)}</span>
              {" · "}Abonado: <span className="font-medium">{formatMinutes(totalAbono)}</span>
              {" · "}
              {selectedColab.is_banco_horas
                ? <>Saldo: <span className="font-medium">{formatMinutes(totalSaldo)}</span></>
                : <>Extras: <span className="font-medium">{formatMinutes(totalExtras)}</span></>}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead className="text-center">Trabalhado</TableHead>
                      <TableHead className="text-center">Intervalo</TableHead>
                      <TableHead className="text-center" title="Horas dentro da faixa noturna (22h–05h por padrão)">Noturno</TableHead>
                      <TableHead className="text-center">Extras</TableHead>
                      <TableHead className="text-center" title="Horas abonadas no dia (parciais ou dia inteiro)">Abono</TableHead>
                      <TableHead className="text-center">Saldo</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...resumos].sort((a, b) => a.data.localeCompare(b.data)).map((resumo) => {
                      const dt = new Date(resumo.data + "T12:00:00");
                      const dow = dt.getDay();
                      const isDimDay = dow === 0 || dow === 6 || resumo.status === "FOLGA" || resumo.status === "FERIADO" || resumo.status === "FERIAS";
                      return (
                      <TableRow key={resumo.data}>
                        <TableCell className={`font-medium whitespace-nowrap ${isDimDay ? "text-muted-foreground" : ""}`}>
                          {format(dt, "dd/MM (EEE)", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {resumo.registros.length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                          <div className="flex gap-1 flex-wrap">
                            {resumo.registros.map((r) => {
                              const isAuto = (r as any).is_auto === true;
                              const isEditing = editBatidaId === r.id;
                              const statusAprov = (r as any).status_aprovacao as string | undefined;
                              const isManualAprovada = r.ajuste_manual && statusAprov === "aprovado";
                              const isManualPendente = r.ajuste_manual && statusAprov === "pendente";
                              const isManualRejeitada = r.ajuste_manual && statusAprov === "rejeitado";
                              const badgeVariant = isAuto
                                ? "outline"
                                : isManualPendente
                                  ? "destructive"
                                  : "secondary";
                              const badgeClass = isAuto
                                ? "text-muted-foreground border-dashed"
                                : isManualAprovada
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                                  : isManualRejeitada
                                    ? "bg-slate-100 text-slate-500 line-through border border-slate-300"
                                    : "";
                              const tipoLabel = r.tipo === "ENTRADA" ? "Entrada" : r.tipo === "SAIDA" ? "Saída" : String(r.tipo);
                              const statusLabel = isAuto
                                ? "Criado automaticamente pois a jornada ultrapassou 00:00"
                                : isManualAprovada
                                  ? "Aprovado"
                                  : isManualPendente
                                    ? "Aguardando aprovação"
                                    : isManualRejeitada
                                      ? "Rejeitado"
                                      : null;
                              const badgeTitle = statusLabel ? `${tipoLabel} · ${statusLabel}` : tipoLabel;
                              return (
                                <div key={r.id} className="inline-flex items-center gap-0.5">
                                  <Badge
                                    variant={badgeVariant}
                                    className={`text-xs font-mono inline-flex items-center gap-1 ${badgeClass}`}
                                    title={badgeTitle}
                                  >
                                    {format(new Date(r.data_hora), "HH:mm")}
                                    {isAuto && " ·auto"}
                                  </Badge>
                                  {isAuto && isAdmin && (
                                    <button
                                      onClick={() => setDeleteBatidaId(r.id)}
                                      className="p-0.5 text-muted-foreground hover:text-destructive"
                                      title="Excluir batida automática"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                  {!isAuto && (
                                    <>
                                      <Popover open={isEditing} onOpenChange={(o) => !o && setEditBatidaId(null)}>
                                        <PopoverTrigger asChild>
                                          <button
                                            onClick={() => openEdit(r)}
                                            className="p-0.5 text-muted-foreground hover:text-primary"
                                            title="Editar horário"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3 space-y-2">
                                          <p className="text-xs font-medium">Editar horário da batida</p>
                                          <div className="flex gap-2">
                                            <Input
                                              type="date"
                                              value={editData}
                                              onChange={(e) => setEditData(e.target.value)}
                                              className="h-8 text-xs"
                                            />
                                            <Input
                                              type="time"
                                              value={editHora}
                                              onChange={(e) => setEditHora(e.target.value)}
                                              className="h-8 text-xs w-24"
                                            />
                                          </div>
                                          <div className="flex justify-end gap-2 pt-1">
                                            <Button size="sm" variant="ghost" onClick={() => setEditBatidaId(null)}>
                                              Cancelar
                                            </Button>
                                            <Button
                                              size="sm"
                                              disabled={editarMutation.isPending || !editHora || !editData}
                                              onClick={() =>
                                                editarMutation.mutate({ id: r.id, data: editData, hora: editHora })
                                              }
                                            >
                                              {editarMutation.isPending ? "Salvando..." : "Salvar"}
                                            </Button>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      <button
                                        onClick={() => setDeleteBatidaId(r.id)}
                                        className="p-0.5 text-muted-foreground hover:text-destructive"
                                        title="Excluir batida"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                      {isManualPendente && (
                                        <>
                                          <button
                                            onClick={() => aprovarMutation.mutate(r.id)}
                                            disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
                                            className="p-0.5 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                            title="Aprovar marcação"
                                          >
                                            <Check className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => rejeitarMutation.mutate(r.id)}
                                            disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
                                            className="p-0.5 text-red-600 hover:text-red-700 disabled:opacity-50"
                                            title="Rejeitar marcação"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          )}
                        </TableCell>


                        <TableCell className="text-center font-mono">{formatMinutes(resumo.horasTrabalhadasMin)}</TableCell>
                        <TableCell className="text-center font-mono">{formatMinutes(resumo.horasIntervaloMin)}</TableCell>
                        <TableCell className="text-center font-mono text-indigo-600">{formatMinutes(resumo.horasNoturnasMin)}</TableCell>
                        <TableCell className="text-center font-mono text-emerald-600">{formatMinutes(resumo.horasExtrasMin)}</TableCell>
                        <TableCell className="text-center font-mono text-blue-600">
                          {abonoMinPorDia.get(resumo.data) ? formatMinutes(abonoMinPorDia.get(resumo.data)!) : "—"}
                        </TableCell>
                        <TableCell className={`text-center font-mono font-medium ${resumo.saldoMin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatMinutes(resumo.saldoMin)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={
                            resumo.status === "REGULAR" ? "bg-emerald-100 text-emerald-700" :
                            resumo.status === "INCONSISTENTE" ? "bg-amber-100 text-amber-700" :
                            resumo.status === "ABONADO" ? "bg-blue-100 text-blue-700" :
                            resumo.status === "FERIAS" ? "bg-purple-100 text-purple-700" :
                            resumo.status === "FERIADO" ? "bg-blue-50 text-blue-700" :
                            resumo.status === "FOLGA" ? "bg-slate-100 text-slate-600" :
                            resumo.status === "PRE_ADMISSAO" ? "bg-slate-100 text-slate-500" :
                            "bg-red-100 text-red-700"
                          } title={resumo.tipoAbono || (resumo.status === "PRE_ADMISSAO" ? "Anterior à data de admissão" : undefined)}>
                            {resumo.status === "REGULAR" ? "OK" :
                             resumo.status === "INCONSISTENTE" ? "Inconsist." :
                             resumo.status === "ABONADO" ? "Abonado" :
                             resumo.status === "FERIAS" ? "Férias" :
                             resumo.status === "FERIADO" ? "Feriado" :
                             resumo.status === "FOLGA" ? "Folga" :
                             resumo.status === "PRE_ADMISSAO" ? "Pré-admissão" :
                             "Falta"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );})}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedColaborador && companyId && (
        <AjustePontoDialog
          open={ajusteOpen}
          onOpenChange={setAjusteOpen}
          colaboradorId={selectedColaborador}
          companyId={companyId}
        />
      )}

      <AlertDialog open={!!deleteBatidaId} onOpenChange={(o) => !o && setDeleteBatidaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir batida de ponto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O saldo do dia será recalculado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBatidaId && excluirMutation.mutate(deleteBatidaId)}
              disabled={excluirMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluirMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

