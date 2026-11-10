import { useAcoesPgr, useGerarRelatorioEvidenciaPgr } from "@/hooks/usePgrAcoes";
import { validarPreRequisitosRelatorio } from "@/lib/relatorioPgrAggregators";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calcScore, calcFarol, getAcoesCriticas, FarolStatus } from "@/lib/dashboardUtils";
import { AlertCircle, Clock, CheckCircle2, Circle, FileText, Loader2 } from "lucide-react";
import { formatHistoricDate } from "@/lib/dateUtils";

interface PgrDashboardTabProps {
  pgrImportacaoId: string;
}

const FAROL_COLORS: Record<FarolStatus, string> = {
  vermelho: "bg-red-500",
  amarelo: "bg-amber-500",
  verde: "bg-emerald-500",
  cinza: "bg-slate-400",
};

function FarolBadge({ status }: { status: FarolStatus }) {
  return (
    <div className={`w-4 h-4 rounded-full ${FAROL_COLORS[status]} shrink-0 shadow-sm`} />
  );
}

export function PgrDashboardTab({ pgrImportacaoId }: PgrDashboardTabProps) {
  const companyId = useEffectiveCompanyId();
  const { data: acoes, isLoading } = useAcoesPgr(pgrImportacaoId);
  const { mutate: gerarPdf, isPending: isGerandoPdf } = useGerarRelatorioEvidenciaPgr();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Carregando dashboard...</div>
      </div>
    );
  }

  if (!acoes || acoes.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
        <p className="text-muted-foreground text-sm">
          Nenhuma ação ainda — confirme o PGR para gerar o plano
        </p>
      </div>
    );
  }

  // Agrupamentos
  const countPorStatus = {
    pendente: acoes.filter(a => a.status === "pendente").length,
    em_andamento: acoes.filter(a => a.status === "em_andamento").length,
    concluida: acoes.filter(a => a.status === "concluida").length,
    validada: acoes.filter(a => a.status === "validada").length,
  };

  const getAcoesByPrioridade = (pri: string) =>
    acoes.filter(a => (a.prioridade || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === pri);

  const farois = {
    alta: calcFarol(getAcoesByPrioridade("alta")),
    media: calcFarol(getAcoesByPrioridade("media")),
    baixa: calcFarol(getAcoesByPrioridade("baixa")),
  };

  const score = calcScore(acoes);
  const { vencidas, vencendo } = getAcoesCriticas(acoes);

  const normalizePri = (v: string) =>
    (v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const getAcoesAbertas = (prioridade: "alta" | "media" | "baixa") => {
    return acoes.filter(
      (a) => normalizePri(a.prioridade) === prioridade && (a.status === "pendente" || a.status === "em_andamento")
    ).length;
  };

  const abertasAlta = getAcoesAbertas("alta");
  const abertasMedia = getAcoesAbertas("media");
  const abertasBaixa = getAcoesAbertas("baixa");

  const formatFarolLabel = (cor: string) => {
    switch (cor) {
      case "verde": return "Em dia";
      case "amarelo": return "Vence em 7 dias";
      case "vermelho": return "Vencido";
      case "cinza": return "Sem prazo";
      default: return cor;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Dashboard de Ações</h3>
        <Button
          variant="outline"
          disabled={isGerandoPdf}
          onClick={() => {
            if (!companyId) {
              toast.error("Empresa não identificada. Verifique sua sessão.");
              return;
            }
            const err = validarPreRequisitosRelatorio({ companyId, pgrImportacaoId, acoes });
            if (err) {
              toast.error(err);
              return;
            }
            gerarPdf({ pgrImportacaoId, acoes });
          }}
        >
          {isGerandoPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          {isGerandoPdf ? "Gerando PDF..." : "Gerar Relatório de Execução (PDF)"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI: Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ações</CardTitle>
            <div className="w-4 h-4 text-muted-foreground"><Circle className="w-full h-full" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{acoes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              cadastradas no PGR
            </p>
          </CardContent>
        </Card>

        {/* KPI: Concluídas / Validadas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status de Execução</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-baseline">
              <span className="text-2xl font-bold text-emerald-600">{countPorStatus.concluida + countPorStatus.validada}</span>
              <span className="text-xs text-muted-foreground">de {acoes.length}</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">{countPorStatus.pendente} Pend.</Badge>
              <Badge variant="outline" className="text-[10px]">{countPorStatus.em_andamento} Andam.</Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI: Score de Conformidade */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <div className={`w-4 h-4 rounded-full ${FAROL_COLORS[score.cor]}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{score.pct}%</div>
            <Progress
              value={score.pct}
              className="h-2 mt-2"
              indicatorClassName={`${score.cor === 'vermelho' ? 'bg-red-500' : score.cor === 'amarelo' ? 'bg-amber-500' : score.cor === 'verde' ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Faróis por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faróis por Prioridade</CardTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Em dia</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Vence em 7 dias</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Vencido</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> Sem prazo</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-medium flex items-center gap-2">Prioridade Alta <span className="text-xs font-normal text-muted-foreground">· {abertasAlta} aberta{abertasAlta !== 1 ? 's' : ''}</span></span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatFarolLabel(farois.alta)}</span>
                <FarolBadge status={farois.alta} />
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-sm font-medium flex items-center gap-2">Prioridade Média <span className="text-xs font-normal text-muted-foreground">· {abertasMedia} aberta{abertasMedia !== 1 ? 's' : ''}</span></span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatFarolLabel(farois.media)}</span>
                <FarolBadge status={farois.media} />
              </div>
            </div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium flex items-center gap-2">Prioridade Baixa <span className="text-xs font-normal text-muted-foreground">· {abertasBaixa} aberta{abertasBaixa !== 1 ? 's' : ''}</span></span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatFarolLabel(farois.baixa)}</span>
                <FarolBadge status={farois.baixa} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prazos Críticos */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4 bg-red-50/50 border-b">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Vencidas ({vencidas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vencidas.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma ação vencida.</p>
              ) : (
                <div className="divide-y max-h-[150px] overflow-auto">
                  {vencidas.map(a => (
                    <div key={a.id} className="p-3 text-sm flex justify-between items-center hover:bg-muted/50">
                      <div className="truncate pr-2">
                        <p className="font-medium truncate">{a.acao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Resp: {a.colaboradores?.full_name || "—"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant="destructive" className="text-[10px]">{a.prioridade}</Badge>
                        <p className="text-xs text-red-600 mt-1 font-semibold">{formatHistoricDate(a.prazo) !== "—" ? formatHistoricDate(a.prazo) : "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 bg-amber-50/50 border-b">
              <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Vencendo em 7 dias ({vencendo.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {vencendo.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma ação vencendo em breve.</p>
              ) : (
                <div className="divide-y max-h-[150px] overflow-auto">
                  {vencendo.map(a => (
                    <div key={a.id} className="p-3 text-sm flex justify-between items-center hover:bg-muted/50">
                      <div className="truncate pr-2">
                        <p className="font-medium truncate">{a.acao}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Resp: {a.colaboradores?.full_name || "—"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">{a.prioridade}</Badge>
                        <p className="text-xs text-amber-600 mt-1 font-semibold">{formatHistoricDate(a.prazo) !== "—" ? formatHistoricDate(a.prazo) : "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
