import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Lock, Unlock, Download, FileText, RotateCcw, AlertCircle, BarChart3 } from "lucide-react";
import { EvolucaoMensalCiclo } from "./EvolucaoMensalCiclo";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { useFechamentos, useFecharPeriodo, useReabrirPeriodo, useReabrirPeriodoMassa, getFechamentoDownloadUrl, type Fechamento } from "@/hooks/useFechamentos";
import { useAuth } from "@/hooks/useAuth";
import { getCicloVigente, getCicloOffset, getPeriodoLabel, type CicloBancoHoras } from "@/lib/bancoHorasCiclo";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMinutes } from "@/hooks/usePontoResumo";
import { TratativaSaldosDialog } from "./TratativaSaldosDialog";

const TRATATIVA_LABEL: Record<string, string> = {
  pagar: "Pago em folha",
  descontar: "Descontado em folha",
  transferir: "Transferido p/ próximo ciclo",
  perdoar: "Perdoado",
};

interface ColabRow {
  id: string;
  full_name: string;
  matricula: string | null;
  department: string | null;
  empresa_cliente: string | null;
  fechamento?: Fechamento;
}

export function FechamentoPonto() {
  const companyId = useEffectiveCompanyId();
  const { config } = usePontoConfig();
  const today = useMemo(() => new Date(), []);
  const cicloAtual = useMemo(() => getCicloVigente(config, today), [config]);
  const [ciclo, setCiclo] = useState<CicloBancoHoras>(cicloAtual);

  const fechar = useFecharPeriodo();
  const reabrir = useReabrirPeriodo();
  const reabrirMassa = useReabrirPeriodoMassa();
  const { role } = useAuth();
  const podeReabrirMassa = role === "admin_master" || role === "admin_empresa";

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["fechamento-colabs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name, matricula, department, empresa_cliente")
        .eq("company_id", companyId)
        .eq("status", "ATIVO")
        .in("contract_type", ["CLT", "Estágio", "Aprendiz", "Temporário"])
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: fechamentos = [], isLoading } = useFechamentos(ciclo.inicio, ciclo.fim);

  const rows: ColabRow[] = useMemo(() => {
    const map = new Map<string, Fechamento>();
    for (const f of fechamentos) {
      if (f.periodo_inicio === ciclo.inicio && f.periodo_fim === ciclo.fim) {
        map.set(f.colaborador_id, f);
      }
    }
    return colaboradores.map((c) => ({ ...c, fechamento: map.get(c.id) }));
  }, [colaboradores, fechamentos, ciclo]);

  const [empresaClienteFiltro, setEmpresaClienteFiltro] = useState<string>("todos");

  const empresasClientes = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.empresa_cliente) s.add(r.empresa_cliente);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const rowsFiltradas = useMemo(() => {
    if (empresaClienteFiltro === "todos") return rows;
    if (empresaClienteFiltro === "__sem__") return rows.filter((r) => !r.empresa_cliente);
    return rows.filter((r) => r.empresa_cliente === empresaClienteFiltro);
  }, [rows, empresaClienteFiltro]);

  const totalFechados = rowsFiltradas.filter((r) => r.fechamento?.status === "fechado").length;
  const totalReabertos = rowsFiltradas.filter((r) => r.fechamento?.status === "reaberto").length;
  const totalPendentes = rowsFiltradas.length - totalFechados - totalReabertos;

  const [reabrirOpen, setReabrirOpen] = useState<Fechamento | null>(null);
  const [reabrirMassaOpen, setReabrirMassaOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [tratativaOpen, setTratativaOpen] = useState(false);
  const [evolucaoColab, setEvolucaoColab] = useState<ColabRow | null>(null);

  // Ciclo é considerado FECHADO quando todos colaboradores estão fechados (sem pendentes nem reabertos)
  const cicloFechado = rows.length > 0 && totalFechados === rows.length;

  const executarFechamento = () => {
    if (!companyId) return;
    fechar.mutate(
      {
        company_id: companyId,
        periodo_inicio: ciclo.inicio,
        periodo_fim: ciclo.fim,
        colaboradores_ids: null,
      },
      {
        onSuccess: () => setTratativaOpen(false),
        onError: (e: any) => {
          // mantém o dialog aberto para o RH ver o que falta
          if (typeof e?.message === "string" && e.message.includes("TRATATIVAS_PENDENTES")) {
            setTratativaOpen(true);
          }
        },
      },
    );
  };

  const handleAbrirTratativas = () => {
    if (!companyId) return;
    setTratativaOpen(true);
  };

  const handleReabrir = () => {
    if (!reabrirOpen) return;
    if (motivo.trim().length < 5) return;
    reabrir.mutate(
      { fechamento_id: reabrirOpen.id, motivo: motivo.trim() },
      { onSuccess: () => { setReabrirOpen(null); setMotivo(""); } },
    );
  };

  const handleReabrirMassa = () => {
    if (!companyId) return;
    if (motivo.trim().length < 5) return;
    reabrirMassa.mutate(
      { company_id: companyId, periodo_inicio: ciclo.inicio, periodo_fim: ciclo.fim, motivo: motivo.trim() },
      { onSuccess: () => { setReabrirMassaOpen(false); setMotivo(""); } },
    );
  };

  const handleDownload = async (
    id: string,
    tipo: "csv" | "pdf",
    escopo: "consolidado" | "individual" = "consolidado",
  ) => {
    try {
      const url = await getFechamentoDownloadUrl(id, tipo, escopo);
      window.open(url, "_blank");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const podeAvancar = ciclo.fim < format(cicloAtual.fim, "yyyy-MM-dd") || ciclo.inicio !== cicloAtual.inicio;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Fechamento Oficial ({getPeriodoLabel(config?.periodo_fechamento_banco)})
              </p>
              <p className="text-lg font-semibold">
                {format(parseISO(ciclo.inicio), "dd 'de' MMM yyyy", { locale: ptBR })} → {format(parseISO(ciclo.fim), "dd 'de' MMM yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setCiclo(getCicloOffset(config, ciclo.inicio, -1))}>
                <ChevronLeft className="h-4 w-4 mr-1" />Anterior
              </Button>
              {ciclo.inicio !== cicloAtual.inicio && (
                <Button variant="outline" size="sm" onClick={() => setCiclo(cicloAtual)}>
                  <RotateCcw className="h-4 w-4 mr-1" />Atual
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setCiclo(getCicloOffset(config, ciclo.inicio, 1))} disabled={!podeAvancar && ciclo.inicio === cicloAtual.inicio}>
                Próximo<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              {cicloFechado && podeReabrirMassa ? (
                <Button onClick={() => { setMotivo(""); setReabrirMassaOpen(true); }} disabled={reabrirMassa.isPending} variant="outline" className="ml-2 border-orange-300 text-orange-700 hover:bg-orange-50">
                  <Unlock className="h-4 w-4 mr-2" />
                  {reabrirMassa.isPending ? "Reabrindo..." : "Reabrir Período"}
                </Button>
              ) : (
                podeReabrirMassa && (
                  <Button onClick={handleAbrirTratativas} disabled={fechar.isPending} className="ml-2">
                    <Lock className="h-4 w-4 mr-2" />
                    {fechar.isPending ? "Fechando..." : "Fechar Período"}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-amber-600">{totalPendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Fechados</p>
          <p className="text-2xl font-bold text-emerald-600">{totalFechados}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Reabertos</p>
          <p className="text-2xl font-bold text-orange-600">{totalReabertos}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base">Colaboradores no Ciclo</CardTitle>
              <CardDescription>
                O fechamento sela o período: novas batidas, abonos ou edições ficam bloqueados nas datas dentro do ciclo.
              </CardDescription>
            </div>
            <div className="min-w-[240px] space-y-1">
              <Label className="text-xs">Empresa cliente</Label>
              <Select value={empresaClienteFiltro} onValueChange={setEmpresaClienteFiltro}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as empresas clientes</SelectItem>
                  {empresasClientes.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                  <SelectItem value="__sem__">Sem empresa cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Empresa Cliente</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Saldo</TableHead>
                    <TableHead className="text-center">Trab.</TableHead>
                    <TableHead className="text-center">Extras</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">Tratativa</TableHead>
                    <TableHead className="text-center">Fechado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsFiltradas.map((r) => {
                    const f = r.fechamento;
                    const isFechado = f?.status === "fechado";
                    const isReaberto = f?.status === "reaberto";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.empresa_cliente ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.department ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {isFechado && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Lock className="h-3 w-3 mr-1" />Fechado v{f?.versao}</Badge>}
                          {isReaberto && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100"><Unlock className="h-3 w-3 mr-1" />Reaberto</Badge>}
                          {!f && <Badge variant="outline">Pendente</Badge>}
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {f ? formatMinutes(f.saldo_minutos) : "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono">{f ? formatMinutes(f.horas_trabalhadas_minutos) : "—"}</TableCell>
                        <TableCell className="text-center font-mono">{f ? formatMinutes(f.horas_extras_minutos) : "—"}</TableCell>
                        <TableCell className="text-center">{f?.dias_falta ?? "—"}</TableCell>
                        <TableCell className="text-center text-xs">
                          {f?.tratativa_acao ? (
                            <Badge variant="outline" className="font-normal">{TRATATIVA_LABEL[f.tratativa_acao] ?? f.tratativa_acao}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {f?.fechado_em ? format(parseISO(f.fechado_em), "dd/MM HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEvolucaoColab(r)}
                              title="Ver evolução mensal do banco de horas"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            {f && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownload(f.id, "pdf", "individual")}
                                  title="Baixar PDF do colaborador"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                {f.csv_url && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDownload(f.id, "csv")} title="Baixar CSV">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {isFechado && (
                                  <Button variant="ghost" size="sm" onClick={() => setReabrirOpen(f)} title="Reabrir">
                                    <Unlock className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reabrirOpen} onOpenChange={(o) => { if (!o) { setReabrirOpen(null); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Reabrir período
            </DialogTitle>
            <DialogDescription>
              Reabrir permite editar batidas e abonos no período. A reabertura é registrada em auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reabertura (mínimo 5 caracteres)</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: Ajuste retroativo aprovado pelo RH para correção de batida..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReabrirOpen(null); setMotivo(""); }}>Cancelar</Button>
            <Button onClick={handleReabrir} disabled={motivo.trim().length < 5 || reabrir.isPending}>
              {reabrir.isPending ? "Reabrindo..." : "Confirmar reabertura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reabrirMassaOpen} onOpenChange={(o) => { if (!o) { setReabrirMassaOpen(false); setMotivo(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Reabrir período inteiro
            </DialogTitle>
            <DialogDescription>
              Todos os {totalFechados} colaborador(es) fechados no ciclo {ciclo.label} serão reabertos. A ação é registrada em auditoria por colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reabertura (mínimo 5 caracteres)</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: Correção retroativa aprovada pela diretoria..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReabrirMassaOpen(false); setMotivo(""); }}>Cancelar</Button>
            <Button onClick={handleReabrirMassa} disabled={motivo.trim().length < 5 || reabrirMassa.isPending}>
              {reabrirMassa.isPending ? "Reabrindo..." : "Confirmar reabertura em massa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TratativaSaldosDialog
        open={tratativaOpen}
        onOpenChange={setTratativaOpen}
        companyId={companyId}
        periodoInicio={ciclo.inicio}
        periodoFim={ciclo.fim}
        periodoLabel={ciclo.label}
        onConfirmar={executarFechamento}
        isClosing={fechar.isPending}
      />

      <Dialog open={!!evolucaoColab} onOpenChange={(o) => { if (!o) setEvolucaoColab(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Evolução mensal — {evolucaoColab?.full_name}
            </DialogTitle>
            <DialogDescription>
              Ciclo {ciclo.label} • Saldo acumulado mês a mês, mesmo antes do fechamento oficial.
            </DialogDescription>
          </DialogHeader>
          {evolucaoColab && (
            <EvolucaoMensalCiclo
              colaboradorId={evolucaoColab.id}
              ciclo={ciclo}
              compact
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
