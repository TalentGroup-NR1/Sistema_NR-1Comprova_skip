import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePontoRegistros, usePontoHistorico, PontoRegistroTipo } from "@/hooks/usePontoRegistros";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { calcularResumoDiario, formatMinutes, ResumoDiario } from "@/hooks/usePontoResumo";
import { usePontoResumoDB, aplicarResumoDB } from "@/hooks/usePontoResumoDB";
import { usePontoCompensacoes } from "@/hooks/usePontoCompensacoes";
import { useColaboradorWorkSchedule } from "@/hooks/useColaboradorWorkSchedule";
import { useFeriados } from "@/hooks/useFeriados";
import { useFeriasAtivas } from "@/hooks/useFeriasAtivas";
import { useColaboradorAdmissionDate } from "@/hooks/useColaboradorAdmissionDate";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { LancarPontoManualDialog } from "./LancarPontoManualDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
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

const getTipoColor = (tipo: string) => {
  if (tipo === "ENTRADA") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (tipo === "SAIDA") {
    return "bg-red-100 text-red-700";
  }
  return "bg-muted text-muted-foreground";
};

const getTipoLabel = (tipo: string) => {
  switch (tipo) {
    case "ENTRADA": return "E";
    case "SAIDA": return "S";
    default: return tipo;
  }
};

export function HistoricoPonto() {
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRegistroId, setDeleteRegistroId] = useState("");
  const [deleteMotivo, setDeleteMotivo] = useState("");

  const { colaboradorId, lancarPontoManual, solicitarExclusao } = usePontoRegistros();
  const { data: registros = [], isLoading } = usePontoHistorico(colaboradorId, startDate, endDate);
  const { config } = usePontoConfig();
  const { compensacoes } = usePontoCompensacoes();
  const { data: workSchedule } = useColaboradorWorkSchedule(colaboradorId);

  const { data: resumoDB } = usePontoResumoDB(colaboradorId, startDate, endDate);

  const { feriadosMap } = useFeriados(parseISO(startDate).getFullYear());
  const { feriasDates } = useFeriasAtivas(colaboradorId, startDate, endDate);
  const { data: admissionDate } = useColaboradorAdmissionDate(colaboradorId);

  const feriadosLookup = (() => {
    const m = new Map<string, { nome: string }>();
    feriadosMap.forEach((v, k) => m.set(k, { nome: v.nome }));
    return m;
  })();

  const days = startDate && endDate
    ? eachDayOfInterval({ start: new Date(startDate + "T12:00:00"), end: new Date(endDate + "T12:00:00") })
    : [];

  const resumos: ResumoDiario[] = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const client = calcularResumoDiario(registros, config || null, dayStr, undefined, compensacoes, feriadosLookup, feriasDates, workSchedule ?? null, admissionDate ?? null);
    return aplicarResumoDB(client, resumoDB);
  }).reverse();

  const totalSaldo = resumos.reduce((acc, r) => acc + r.saldoMin, 0);
  const totalExtras = resumos.reduce((acc, r) => acc + r.horasExtrasMin, 0);
  const temNoturno = resumos.some((r) => r.horasNoturnasMin > 0);

  const statusBadge = (status: string, tipoAbono?: string) => {
    switch (status) {
      case "REGULAR": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Regular</Badge>;
      case "INCONSISTENTE": return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Inconsistente</Badge>;
      case "FALTA": return <Badge variant="secondary" className="bg-red-100 text-red-700">Falta</Badge>;
      case "FOLGA": return <Badge variant="secondary" className="bg-slate-100 text-slate-600">Folga</Badge>;
      case "FERIAS": return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Férias</Badge>;
      case "FERIADO": return <Badge variant="secondary" className="bg-blue-50 text-blue-700">Feriado</Badge>;
      case "ABONADO": return <Badge variant="secondary" className="bg-blue-100 text-blue-700" title={tipoAbono || "Ausência abonada"}>Abonado</Badge>;
      case "PRE_ADMISSAO": return <Badge variant="secondary" className="bg-slate-100 text-slate-500" title="Anterior à data de admissão">Pré-admissão</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleOpenDialog = (data: string) => {
    setDialogDate(data);
    setDialogOpen(true);
  };

  const handleSubmitManual = (params: {
    tipo: PontoRegistroTipo;
    data_hora: string;
    justificativa: string;
    observacao?: string;
  }) => {
    lancarPontoManual.mutate(params, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleOpenDeleteDialog = (registroId: string) => {
    setDeleteRegistroId(registroId);
    setDeleteMotivo("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteMotivo.trim()) return;
    solicitarExclusao.mutate(
      { registroId: deleteRegistroId, motivo: deleteMotivo },
      { onSuccess: () => setDeleteDialogOpen(false) }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="ml-auto flex gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Saldo Período</p>
                <p className={`text-lg font-bold ${totalSaldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatMinutes(totalSaldo)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Horas Extras</p>
                <p className="text-lg font-bold text-emerald-600">{formatMinutes(totalExtras)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto text-xs [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:text-[10px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead className="text-center">Previsto</TableHead>
                    <TableHead className="text-center">Trabalhado</TableHead>
                    <TableHead className="text-center">Intervalo</TableHead>
                    <TableHead className="text-center">Extras</TableHead>
                    {temNoturno && <TableHead className="text-center">Noturno</TableHead>}
                    <TableHead className="text-center">Saldo</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumos.map((resumo) => (
                    <TableRow key={resumo.data} className="group/reg">
                      <TableCell className="font-medium whitespace-nowrap w-[100px] text-xs">
                        {format(new Date(resumo.data + "T12:00:00"), "dd/MM (EEE)", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 flex-nowrap">
                          <TooltipProvider>
                          {resumo.registros.map((r) => {
                            const isPendingDelete = (r as any).exclusao_pendente;
                            const isManual = (r as any).ajuste_manual;
                            const isAuto = (r as any).is_auto === true;
                            const isPending = (r as any).status_aprovacao === "pendente";

                            let badgeClass = getTipoColor(r.tipo);
                            if (isAuto) badgeClass = "bg-muted text-muted-foreground border border-dashed";
                            else if (isPendingDelete) badgeClass = "bg-orange-100 text-orange-700 line-through";
                            else if (isManual) badgeClass = "bg-orange-100 text-orange-700";

                            const tooltipText = isAuto
                              ? "Criado automaticamente pois a jornada ultrapassou 00:00"
                              : isPendingDelete
                                ? "Exclusão pendente de aprovação"
                                : isPending && isManual
                                  ? "Lançamento manual pendente de aprovação"
                                  : isManual
                                    ? "Lançamento manual aprovado"
                                    : getTipoLabel(r.tipo);

                            return (
                              <Tooltip key={r.id}>
                                <TooltipTrigger asChild>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-medium ${badgeClass}`}
                                  >
                                    <span className="text-[10px] opacity-70">{getTipoLabel(r.tipo)}</span>
                                    {format(new Date(r.data_hora), "HH:mm")}
                                    {!isAuto && !isPendingDelete && (r as any).status_aprovacao === "aprovado" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(r.id); }}
                                        className="ml-0.5 opacity-0 group-hover/reg:opacity-100 hover:text-destructive transition-opacity"
                                        title="Solicitar exclusão"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{tooltipText}</TooltipContent>
                              </Tooltip>
                            );
                          })}
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenDialog(resumo.data)}
                            title="Adicionar marcação"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">{formatMinutes(resumo.horasPrevistasMin)}</TableCell>
                      <TableCell className="text-center font-mono font-medium">{formatMinutes(resumo.horasTrabalhadasMin)}</TableCell>
                      <TableCell className="text-center font-mono">{formatMinutes(resumo.horasIntervaloMin)}</TableCell>
                      <TableCell className="text-center font-mono text-emerald-600">{formatMinutes(resumo.horasExtrasMin)}</TableCell>
                      {temNoturno && <TableCell className="text-center font-mono">{formatMinutes(resumo.horasNoturnasMin)}</TableCell>}
                      <TableCell className={`text-center font-mono font-medium ${resumo.saldoMin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatMinutes(resumo.saldoMin)}
                      </TableCell>
                      <TableCell className="text-center">{statusBadge(resumo.status, resumo.tipoAbono)}</TableCell>
                    </TableRow>
                  ))}
                  {resumos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={temNoturno ? 9 : 8} className="text-center text-muted-foreground py-8">
                        Nenhum registro no período selecionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <LancarPontoManualDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmitManual}
        isPending={lancarPontoManual.isPending}
        defaultDate={dialogDate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar exclusão de marcação</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão será enviada para aprovação do administrador. Informe o motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da exclusão (ex: marcação duplicada, erro de horário...)"
            value={deleteMotivo}
            onChange={(e) => setDeleteMotivo(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!deleteMotivo.trim() || solicitarExclusao.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {solicitarExclusao.isPending ? "Enviando..." : "Solicitar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
