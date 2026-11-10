import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock, Unlock, ShieldCheck, Download, FileSignature, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePontoRegistros } from "@/hooks/usePontoRegistros";
import { useMeusFechamentos, useAssinarPeriodo, getFechamentoDownloadUrl, type Fechamento } from "@/hooks/useFechamentos";
import {
  useMeusEspelhosMensais, useAssinarEspelhoMensal, getEspelhoMensalPdfUrl,
  type EspelhoMensal,
} from "@/hooks/useEspelhosMensais";
import { formatMinutes } from "@/hooks/usePontoResumo";
import { useMeuRegimePonto } from "@/hooks/useMeuRegimePonto";
import { toast } from "sonner";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function StatusBadge({ status }: { status: string }) {
  if (status === "assinado") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1"><ShieldCheck className="h-3 w-3" />Assinado</Badge>;
  }
  if (status === "fechado") {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1"><Lock className="h-3 w-3" />Pendente assinatura</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1"><Unlock className="h-3 w-3" />Reaberto</Badge>;
}

function fmtDate(iso: string) {
  return format(parseISO(iso + (iso.length === 10 ? "T12:00:00" : "")), "dd/MM/yyyy", { locale: ptBR });
}
function fmtTs(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

// ===== Card de Espelho Mensal =====
function EspelhoMensalCard({ e }: { e: EspelhoMensal }) {
  const assinar = useAssinarEspelhoMensal();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleAssinar = async () => {
    setConfirmOpen(false);
    const res = await assinar.mutateAsync({ espelho_id: e.id });
    if (res?.pdf_url) window.open(res.pdf_url, "_blank", "noopener");
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await getEspelhoMensalPdfUrl(e.id);
      if (url) window.open(url, "_blank", "noopener");
    } catch (err: any) {
      toast.error("Erro ao baixar PDF: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />Espelho de Ponto Mensal
              </p>
              <p className="text-lg font-semibold">{MESES[e.mes - 1]} / {e.ano}</p>
              <p className="text-xs text-muted-foreground">{fmtDate(e.periodo_inicio)} a {fmtDate(e.periodo_fim)}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={e.status} />
                <Badge variant="outline">v{e.versao}</Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {(e.status === "fechado" || e.status === "reaberto") && (
                <>
                  <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                    <Download className="h-4 w-4 mr-2" />
                    {downloading ? "Gerando…" : "Baixar PDF para conferência"}
                  </Button>
                  <Button onClick={() => setConfirmOpen(true)} disabled={assinar.isPending}>
                    <FileSignature className="h-4 w-4 mr-2" />Assinar mês
                  </Button>
                </>
              )}
              {e.status === "assinado" && (
                <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? "Gerando…" : "Baixar PDF assinado"}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Trabalhadas</p>
              <p className="font-mono font-semibold">{formatMinutes(e.horas_trabalhadas_minutos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Extras</p>
              <p className="font-mono font-semibold">{formatMinutes(e.horas_extras_minutos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Abonadas</p>
              <p className="font-mono font-semibold">{formatMinutes(e.horas_abonadas_minutos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faltas</p>
              <p className="font-mono font-semibold">{e.dias_falta}</p>
            </div>
          </div>

          {e.status === "assinado" && e.assinatura_hash && (
            <div className="rounded-md border bg-emerald-50/50 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />Assinatura registrada
              </p>
              <p><span className="text-muted-foreground">Data/Hora:</span> {fmtTs(e.assinatura_em)}</p>
              <p className="break-all"><span className="text-muted-foreground">SHA-256:</span> <span className="font-mono">{e.assinatura_hash}</span></p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar assinatura de {MESES[e.mes - 1]}/{e.ano}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao assinar, você confirma que conferiu o espelho de ponto do mês e que os totais
              estão corretos. A ação fica registrada com hash de integridade SHA-256 e a data/hora
              da assinatura, e só pode ser desfeita pelo RH em caso de reabertura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssinar}>Assinar mês</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ===== Componente principal =====
export function MinhaAssinatura() {
  const { colaboradorId } = usePontoRegistros();
  const { isBancoHoras } = useMeuRegimePonto();
  const { data: espelhos = [], isLoading: loadingEspelhos } = useMeusEspelhosMensais();
  const { data: fechamentos = [], isLoading: loadingFech } = useMeusFechamentos(colaboradorId);
  const assinarBanco = useAssinarPeriodo();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleAssinarBanco = async (id: string) => {
    setConfirmId(null);
    const res = await assinarBanco.mutateAsync({ fechamento_id: id });
    if (res?.pdf_url) window.open(res.pdf_url, "_blank", "noopener");
  };

  const handleDownloadBanco = async (id: string) => {
    setDownloadingId(id);
    try {
      const url = await getFechamentoDownloadUrl(id, "pdf", "individual");
      if (url) window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error("Erro ao baixar PDF: " + e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const nada = !loadingEspelhos && !loadingFech && espelhos.length === 0 && fechamentos.length === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />Minha Assinatura
          </CardTitle>
          <CardDescription>
            Espelhos mensais e fechamentos de banco prontos para sua conferência e assinatura.
            Cada assinatura recebe um hash digital de integridade.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* ESPELHOS MENSAIS */}
      {loadingEspelhos ? (
        <p className="text-center text-sm text-muted-foreground py-4">Carregando espelhos mensais…</p>
      ) : (
        espelhos.map((e) => <EspelhoMensalCard key={e.id} e={e} />)
      )}

      {/* FECHAMENTOS DE BANCO (mensais — apenas quando o ciclo for mensal) */}
      {fechamentos.length > 0 && (
        <div className="pt-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 px-1">
            Fechamentos de Banco de Horas
          </p>
          {fechamentos.map((f: Fechamento) => (
            <Card key={f.id} className="mb-3">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Período</p>
                    <p className="text-lg font-semibold">{fmtDate(f.periodo_inicio)} a {fmtDate(f.periodo_fim)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={f.status} />
                      <Badge variant="outline">v{f.versao}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {(f.status === "fechado" || f.status === "reaberto") && (
                      <>
                        <Button variant="outline" onClick={() => handleDownloadBanco(f.id)} disabled={downloadingId === f.id}>
                          <Download className="h-4 w-4 mr-2" />
                          {downloadingId === f.id ? "Gerando…" : "Baixar PDF para conferência"}
                        </Button>
                        <Button onClick={() => setConfirmId(f.id)} disabled={assinarBanco.isPending}>
                          <FileSignature className="h-4 w-4 mr-2" />Assinar período
                        </Button>
                      </>
                    )}
                    {f.status === "assinado" && (
                      <Button variant="outline" onClick={() => handleDownloadBanco(f.id)} disabled={downloadingId === f.id}>
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingId === f.id ? "Gerando…" : "Baixar PDF assinado"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Trabalhadas</p>
                    <p className="font-mono font-semibold">{formatMinutes(f.horas_trabalhadas_minutos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Extras</p>
                    <p className="font-mono font-semibold">{formatMinutes(f.horas_extras_minutos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Abonadas</p>
                    <p className="font-mono font-semibold">{formatMinutes(f.horas_abonadas_minutos)}</p>
                  </div>
                  {isBancoHoras ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p className={`font-mono font-semibold ${f.saldo_minutos >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {f.saldo_minutos >= 0 ? "+" : ""}{formatMinutes(f.saldo_minutos)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p className="font-mono font-semibold">{formatMinutes(f.saldo_minutos)}</p>
                    </div>
                  )}
                </div>

                {f.status === "assinado" && f.assinatura_hash && (
                  <div className="rounded-md border bg-emerald-50/50 p-3 text-xs space-y-1">
                    <p className="font-semibold text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />Assinatura registrada
                    </p>
                    <p><span className="text-muted-foreground">Data/Hora:</span> {fmtTs(f.assinatura_em)}</p>
                    <p className="break-all"><span className="text-muted-foreground">SHA-256:</span> <span className="font-mono">{f.assinatura_hash}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {nada && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum período disponível para assinatura no momento.
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar assinatura digital?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao assinar, você confirma que os totais apresentados refletem o período
              trabalhado. Esta ação fica registrada com hash de integridade SHA-256
              e não pode ser desfeita por você (apenas pelo RH, em caso de reabertura).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && handleAssinarBanco(confirmId)}>
              Assinar período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
