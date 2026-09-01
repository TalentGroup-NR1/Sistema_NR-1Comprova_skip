import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw, Lock, Unlock, ShieldCheck } from "lucide-react";
import { usePontoRegistros } from "@/hooks/usePontoRegistros";
import { useBancoHorasCicloResolvido } from "@/hooks/useBancoHorasCicloResolvido";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCicloVigente, getCicloOffset, getPeriodoLabel, type CicloBancoHoras } from "@/lib/bancoHorasCiclo";
import { useMyFechamentoStatus } from "@/hooks/useFechamentos";
import { EvolucaoMensalCiclo } from "./EvolucaoMensalCiclo";

export function MeuBancoHoras() {
  const today = new Date();
  const { colaboradorId } = usePontoRegistros();
  const { ciclo: cicloConfig } = useBancoHorasCicloResolvido(colaboradorId);
  const config = cicloConfig;

  const cicloAtual = useMemo(() => getCicloVigente(config, today), [config]);

  const [ciclo, setCiclo] = useState<CicloBancoHoras>(cicloAtual);
  const [override, setOverride] = useState(false);
  const [startDate, setStartDate] = useState(cicloAtual.inicio);
  const [endDate, setEndDate] = useState(cicloAtual.fim);

  useEffect(() => {
    if (!override) {
      setCiclo(cicloAtual);
      setStartDate(cicloAtual.inicio);
      setEndDate(cicloAtual.fim);
    }
  }, [cicloAtual.inicio, cicloAtual.fim]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: fechamentoStatus } = useMyFechamentoStatus(colaboradorId, ciclo.inicio, ciclo.fim);

  const handleCicloAnterior = () => {
    const c = getCicloOffset(config, ciclo.inicio, -1);
    setCiclo(c); setStartDate(c.inicio); setEndDate(c.fim); setOverride(true);
  };
  const handleCicloProximo = () => {
    const c = getCicloOffset(config, ciclo.inicio, 1);
    setCiclo(c); setStartDate(c.inicio); setEndDate(c.fim); setOverride(true);
  };
  const handleVoltarAtual = () => {
    setCiclo(cicloAtual); setStartDate(cicloAtual.inicio); setEndDate(cicloAtual.fim); setOverride(false);
  };

  const isCicloAtual = ciclo.inicio === cicloAtual.inicio;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Ciclo de Banco de Horas ({getPeriodoLabel(config?.periodo_fechamento_banco)})
              </p>
              <p className="text-lg font-semibold">
                {format(parseISO(ciclo.inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} → {format(parseISO(ciclo.fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {isCicloAtual && <Badge variant="secondary" className="ml-2">Atual</Badge>}
                {fechamentoStatus === "assinado" && (
                  <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                    <ShieldCheck className="h-3 w-3" />Assinado
                  </Badge>
                )}
                {fechamentoStatus === "fechado" && (
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
                    <Lock className="h-3 w-3" />Fechado
                  </Badge>
                )}
                {fechamentoStatus === "reaberto" && (
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
                    <Unlock className="h-3 w-3" />Reaberto
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCicloAnterior}>
                <ChevronLeft className="h-4 w-4 mr-1" />Anterior
              </Button>
              {!isCicloAtual && (
                <Button variant="outline" size="sm" onClick={handleVoltarAtual}>
                  <RotateCcw className="h-4 w-4 mr-1" />Atual
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleCicloProximo}>
                Próximo<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtro Avançado de Período</CardTitle>
          <CardDescription>
            Por padrão, a tela mostra o ciclo de banco de horas configurado pela empresa.
            Você pode ajustar manualmente se quiser explorar outro intervalo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setOverride(true); }} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setOverride(true); }} className="w-40" />
            </div>
            {override && (
              <Button variant="outline" size="sm" onClick={handleVoltarAtual}>
                <RotateCcw className="h-4 w-4 mr-1" />Voltar ao ciclo atual
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <EvolucaoMensalCiclo
        colaboradorId={colaboradorId}
        ciclo={ciclo}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

