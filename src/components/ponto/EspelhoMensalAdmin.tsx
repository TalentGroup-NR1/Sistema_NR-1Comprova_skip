import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock, ShieldCheck, FileText, AlertCircle, CalendarDays } from "lucide-react";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import {
  useEspelhosMensaisAdmin, useFecharEspelhoMensal, useReabrirEspelhoMensal,
  getEspelhoMensalPdfUrl, uploadEspelhoMensalPdf, type EspelhoMensal,
} from "@/hooks/useEspelhosMensais";
import { formatMinutes } from "@/hooks/usePontoResumo";
import { gerarFolhaMensalParaColaborador, buildAssinaturaEmpresa } from "@/lib/folhaMensalGen";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface ColabRow {
  id: string;
  full_name: string;
  matricula: string | null;
  department: string | null;
  is_banco_horas?: boolean | null;
  espelho?: EspelhoMensal;
}

export function EspelhoMensalAdmin() {
  const companyId = useEffectiveCompanyId();
  const { role } = useAuth();
  const podeOperar = role === "admin_master" || role === "admin_empresa" || role === "analista_rh";

  const today = new Date();
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [mes, setMes] = useState<number>(today.getMonth() + 1);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["espelho-mensal-colabs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name, matricula, department, is_banco_horas")
        .eq("company_id", companyId)
        .eq("status", "ATIVO")
        .in("contract_type", ["CLT","Estágio","Aprendiz","Temporário"])
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: espelhos = [], isLoading } = useEspelhosMensaisAdmin(ano, mes);
  const fechar = useFecharEspelhoMensal();
  const reabrir = useReabrirEspelhoMensal();

  // Prévia (do resumo diário) para colaboradores ainda sem espelho fechado
  const periodoInicio = `${ano}-${String(mes).padStart(2,"0")}-01`;
  const periodoFim = (() => {
    const d = new Date(ano, mes, 0); // último dia do mês
    return `${ano}-${String(mes).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();

  const { data: previas = [] } = useQuery({
    queryKey: ["espelho-mensal-previa", companyId, ano, mes],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_resumo_diario")
        .select("colaborador_id, horas_trabalhadas_minutos, horas_extras_minutos, horas_previstas_minutos, saldo_minutos, status")
        .eq("company_id", companyId)
        .gte("data", periodoInicio)
        .lte("data", periodoFim);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const previaMap = useMemo(() => {
    const m = new Map<string, { trab: number; extras: number; faltas: number; negativas: number; saldo: number }>();
    for (const r of previas as any[]) {
      const cur = m.get(r.colaborador_id) ?? { trab: 0, extras: 0, faltas: 0, negativas: 0, saldo: 0 };
      cur.trab += r.horas_trabalhadas_minutos ?? 0;
      cur.extras += r.horas_extras_minutos ?? 0;
      const saldo = r.saldo_minutos ?? 0;
      cur.saldo += saldo;
      if (saldo < 0) cur.negativas += -saldo;
      if ((r.horas_trabalhadas_minutos ?? 0) === 0 && (r.horas_previstas_minutos ?? 0) > 0 && String(r.status) !== "ABONADO") {
        cur.faltas += 1;
      }
      m.set(r.colaborador_id, cur);
    }
    return m;
  }, [previas]);

  const rows: ColabRow[] = useMemo(() => {
    const map = new Map<string, EspelhoMensal>();
    for (const e of espelhos) map.set(e.colaborador_id, e);
    return colaboradores.map((c) => ({ ...c, espelho: map.get(c.id) }));
  }, [colaboradores, espelhos]);

  const totalFechados = rows.filter((r) => r.espelho?.status === "fechado").length;
  const totalAssinados = rows.filter((r) => r.espelho?.status === "assinado").length;
  const totalReabertos = rows.filter((r) => r.espelho?.status === "reaberto").length;
  const totalPendentes = rows.length - totalFechados - totalAssinados - totalReabertos;

  const [reabrirOpen, setReabrirOpen] = useState<EspelhoMensal | null>(null);
  const [reabrirMassaOpen, setReabrirMassaOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previaId, setPreviaId] = useState<string | null>(null);

  const anos = useMemo(() => {
    const y = today.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, [today]);

  // Mês considerado FECHADO quando todos colaboradores têm espelho não-pendente
  const mesTotalmenteFechado = rows.length > 0 && totalPendentes === 0;

  // Gera o PDF Folha de Ponto do mês (apenas conferência local) para um colaborador.
  const handleGerarPreviaFolha = async (colaboradorId: string) => {
    if (!companyId) return;
    setPreviaId(colaboradorId);
    try {
      await gerarFolhaMensalParaColaborador({
        companyId, colaboradorId, ano, mes, output: "save",
      });
    } catch (e: any) {
      toast.error("Erro ao gerar folha mensal: " + e.message);
    } finally {
      setPreviaId(null);
    }
  };

  // Fecha o mês para um colaborador. Após o RPC criar o espelho, geramos o PDF
  // Folha de Ponto no client e subimos como PDF oficial em "fechamentos-ponto".
  const handleFecharMes = async (colaboradorId?: string) => {
    if (!companyId) return;
    try {
      const result: any = await fechar.mutateAsync({
        company_id: companyId,
        ano, mes,
        colaboradores_ids: colaboradorId ? [colaboradorId] : null,
      });
      // Resultado esperado: { sucesso, total, ids?: string[], erros?: [{colaborador_id, espelho_id}] }
      // O RPC retorna a lista de espelhos criados — vamos refetch e fazer upload p/ os pendentes.
      // Buscamos por (company, ano, mes) os espelhos sem pdf_url e geramos.
      const { data: pendentes } = await supabase
        .from("espelhos_ponto_mensais")
        .select("id, colaborador_id, pdf_url")
        .eq("company_id", companyId)
        .eq("ano", ano).eq("mes", mes)
        .is("pdf_url", null);
      const alvo = colaboradorId
        ? (pendentes || []).filter((p: any) => p.colaborador_id === colaboradorId)
        : (pendentes || []);
      for (const p of alvo) {
        try {
          const assinaturaEmpresa = await buildAssinaturaEmpresa(p.id);
          const blob = (await gerarFolhaMensalParaColaborador({
            companyId, colaboradorId: p.colaborador_id, ano, mes, output: "blob",
            assinaturaEmpresa,
          })) as Blob;
          await uploadEspelhoMensalPdf(p.id, blob);
        } catch (e: any) {
          toast.warning(`PDF não gerado para 1 colaborador: ${e.message}`);
        }
      }
      void result;
    } catch (e: any) {
      // erro já tratado pelo onError do hook
    }
  };

  const handleReabrir = () => {
    if (!reabrirOpen) return;
    if (motivo.trim().length < 5) return;
    reabrir.mutate(
      { espelho_id: reabrirOpen.id, motivo: motivo.trim() },
      { onSuccess: () => { setReabrirOpen(null); setMotivo(""); } },
    );
  };

  const handleReabrirMassa = async () => {
    if (motivo.trim().length < 5) return;
    const alvo = rows.map((r) => r.espelho).filter((e): e is EspelhoMensal => !!e);
    for (const e of alvo) {
      await reabrir.mutateAsync({ espelho_id: e.id, motivo: motivo.trim() });
    }
    setReabrirMassaOpen(false);
    setMotivo("");
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const url = await getEspelhoMensalPdfUrl(id);
      if (url) window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />Espelho Mensal — Concluído para Assinatura
              </p>
              <p className="text-lg font-semibold">{MESES[mes - 1]} / {ano}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Independente do ciclo de banco. Ao fechar o mês, o colaborador recebe o espelho em "Minha Assinatura" e novas batidas/abonos nas datas ficam bloqueados.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              {podeOperar && (
                mesTotalmenteFechado ? (
                  <Button onClick={() => { setMotivo(""); setReabrirMassaOpen(true); }} disabled={reabrir.isPending} variant="outline" className="ml-2 border-orange-300 text-orange-700 hover:bg-orange-50">
                    <Unlock className="h-4 w-4 mr-2" />
                    {reabrir.isPending ? "Reabrindo..." : "Reabrir mês (todos)"}
                  </Button>
                ) : (
                  <Button onClick={() => handleFecharMes()} disabled={fechar.isPending} className="ml-2">
                    <Lock className="h-4 w-4 mr-2" />
                    {fechar.isPending ? "Fechando..." : "Fechar mês (todos)"}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-amber-600">{totalPendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Fechados</p>
          <p className="text-2xl font-bold text-blue-600">{totalFechados}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Assinados</p>
          <p className="text-2xl font-bold text-emerald-600">{totalAssinados}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Reabertos</p>
          <p className="text-2xl font-bold text-orange-600">{totalReabertos}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Colaboradores</CardTitle>
          <CardDescription>
            Evidência de assinatura: data/hora e hash SHA-256 ficam registrados quando o colaborador assina o mês.
          </CardDescription>
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
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Trab.</TableHead>
                    <TableHead className="text-center">Extras</TableHead>
                    <TableHead className="text-center">Negativas</TableHead>
                    <TableHead className="text-center">Saldo Banco</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">Assinado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const e = r.espelho;
                    const p = previaMap.get(r.id);
                    const isBanco = !!r.is_banco_horas;
                    const trabMin = e ? e.horas_trabalhadas_minutos : (p?.trab ?? 0);
                    const extrasMin = e ? e.horas_extras_minutos : (p?.extras ?? 0);
                    const negativasMin = p?.negativas ?? 0;
                    const saldoMin = e ? (e as any).saldo_minutos ?? (p?.saldo ?? 0) : (p?.saldo ?? 0);
                    const faltas = e ? e.dias_falta : (p?.faltas ?? 0);
                    const italic = e ? "" : "text-muted-foreground italic";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.department ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {!e && <Badge variant="outline">Pendente</Badge>}
                          {e?.status === "fechado" && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Lock className="h-3 w-3 mr-1" />Fechado v{e.versao}</Badge>}
                          {e?.status === "reaberto" && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100"><Unlock className="h-3 w-3 mr-1" />Reaberto</Badge>}
                          {e?.status === "assinado" && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><ShieldCheck className="h-3 w-3 mr-1" />Assinado</Badge>}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${italic}`}>
                          {isBanco ? formatMinutes(trabMin) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${italic}`}>
                          {formatMinutes(extrasMin)}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${negativasMin > 0 ? "text-red-600" : italic}`}>
                          {negativasMin > 0 ? `-${formatMinutes(negativasMin)}` : formatMinutes(0)}
                        </TableCell>
                        <TableCell className={`text-center font-mono ${isBanco ? (saldoMin < 0 ? "text-red-600" : saldoMin > 0 ? "text-emerald-700" : "") : ""} ${e ? "" : "italic"}`}>
                          {isBanco
                            ? `${saldoMin < 0 ? "-" : saldoMin > 0 ? "+" : ""}${formatMinutes(Math.abs(saldoMin))}`
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={italic}>{faltas}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {e?.assinatura_em ? (
                            <span className="text-emerald-700 font-medium">{format(parseISO(e.assinatura_em), "dd/MM HH:mm", { locale: ptBR })}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            {podeOperar && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGerarPreviaFolha(r.id)}
                                disabled={previaId === r.id}
                                title="Gerar Folha de Ponto do mês (conferência)"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                {previaId === r.id ? "Gerando..." : "Folha Mensal"}
                              </Button>
                            )}
                            {(!e || e.status === "reaberto") && podeOperar && (
                              <Button variant="default" size="sm" onClick={() => handleFecharMes(r.id)} disabled={fechar.isPending}>
                                <Lock className="h-3.5 w-3.5 mr-1" />Fechar
                              </Button>
                            )}
                            {e && e.status !== "reaberto" && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(e.id)} disabled={downloadingId === e.id} title="Baixar PDF oficial">
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            {e && podeOperar && (e.status === "fechado" || e.status === "assinado") && (
                              <Button variant="ghost" size="sm" onClick={() => { setMotivo(""); setReabrirOpen(e); }} title="Reabrir">
                                <Unlock className="h-4 w-4" />
                              </Button>
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
              <AlertCircle className="h-5 w-5 text-orange-600" />Reabrir mês
            </DialogTitle>
            <DialogDescription>
              Reabrir libera edição no mês e <strong>derruba a assinatura</strong> caso exista. O colaborador precisará assinar a nova versão.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reabertura (mínimo 5 caracteres)</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: Ajuste retroativo aprovado pelo RH..." />
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
              <AlertCircle className="h-5 w-5 text-orange-600" />Reabrir mês inteiro
            </DialogTitle>
            <DialogDescription>
              Todos os {rows.length} colaborador(es) terão o espelho de {MESES[mes - 1]}/{ano} reaberto. Assinaturas existentes serão derrubadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da reabertura (mínimo 5 caracteres)</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ex.: Correção retroativa aprovada pela diretoria..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReabrirMassaOpen(false); setMotivo(""); }}>Cancelar</Button>
            <Button onClick={handleReabrirMassa} disabled={motivo.trim().length < 5 || reabrir.isPending}>
              {reabrir.isPending ? "Reabrindo..." : "Confirmar reabertura em massa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
