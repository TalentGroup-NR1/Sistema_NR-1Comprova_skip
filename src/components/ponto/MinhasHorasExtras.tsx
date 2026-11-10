import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { usePontoRegistros, usePontoHistorico } from "@/hooks/usePontoRegistros";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { usePontoCompensacoes } from "@/hooks/usePontoCompensacoes";
import { useFeriados } from "@/hooks/useFeriados";
import { useFeriasAtivas } from "@/hooks/useFeriasAtivas";
import { useColaboradorWorkSchedule } from "@/hooks/useColaboradorWorkSchedule";
import { calcularResumoDiario, formatMinutes, ResumoDiario, isDiaPrevisto } from "@/hooks/usePontoResumo";
import { usePontoResumoDB, aplicarResumoDB } from "@/hooks/usePontoResumoDB";
import { useColaboradorAdmissionDate } from "@/hooks/useColaboradorAdmissionDate";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Tela mensal para colaboradores no regime "Horas Extras".
 * Exibe Horas a Pagar (positivas) e Horas a Descontar (negativas) sem compensação.
 */
export function MinhasHorasExtras() {
  const today = new Date();
  const { config } = usePontoConfig();
  const { colaboradorId } = usePontoRegistros();
  const { compensacoes } = usePontoCompensacoes();

  // Janela: últimos 12 meses até o mês corrente
  const startDate = format(startOfMonth(subMonths(today, 11)), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");
  const endOfCurrent = format(endOfMonth(today), "yyyy-MM-dd");
  const queryEnd = endOfCurrent < todayStr ? endOfCurrent : todayStr;

  const { data: registros = [], isLoading } = usePontoHistorico(colaboradorId, startDate, queryEnd);
  const { feriadosMap } = useFeriados(parseISO(startDate).getFullYear());
  const { feriasDates } = useFeriasAtivas(colaboradorId, startDate, queryEnd);
  const { data: workSchedule } = useColaboradorWorkSchedule(colaboradorId);

  const feriadosLookup = useMemo(() => {
    const m = new Map<string, { nome: string }>();
    feriadosMap.forEach((v, k) => m.set(k, { nome: v.nome }));
    return m;
  }, [feriadosMap]);

  const { data: resumoDB } = usePontoResumoDB(colaboradorId, startDate, queryEnd);
  const { data: admissionDate } = useColaboradorAdmissionDate(colaboradorId);

  const resumos: ResumoDiario[] = useMemo(() => {
    if (!startDate || !queryEnd) return [];
    const days = eachDayOfInterval({
      start: new Date(startDate + "T12:00:00"),
      end: new Date(queryEnd + "T12:00:00"),
    });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const client = calcularResumoDiario(
        registros, config || null, dayStr, undefined, compensacoes,
        feriadosLookup, feriasDates, workSchedule ?? null, admissionDate ?? null,
      );
      return aplicarResumoDB(client, resumoDB);
    });
  }, [registros, config, compensacoes, feriadosLookup, feriasDates, startDate, queryEnd, workSchedule, resumoDB, admissionDate]);

  // Excluir o dia em curso da soma
  const resumosParaSoma = useMemo(
    () => resumos.filter((r) => r.data !== todayStr),
    [resumos, todayStr],
  );

  // Agrega por mês
  const porMes = useMemo(() => {
    const map = new Map<string, { pagar: number; descontar: number; trabalhado: number; previsto: number }>();

    // Inicializa últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(today, i);
      const ym = format(d, "yyyy-MM");
      map.set(ym, { pagar: 0, descontar: 0, trabalhado: 0, previsto: 0 });
    }

    for (const r of resumosParaSoma) {
      const ym = r.data.substring(0, 7);
      const c = map.get(ym);
      if (!c) continue;
      if (r.saldoMin > 0) c.pagar += r.saldoMin;
      else if (r.saldoMin < 0) c.descontar += Math.abs(r.saldoMin);
      c.trabalhado += r.horasTrabalhadasMin;
    }

    const jornadaDia = config?.jornada_diaria_minutos ?? 480;
    for (const [ym, c] of map.entries()) {
      const monthStart = parseISO(ym + "-01");
      const monthEnd = endOfMonth(monthStart);
      const limit = monthEnd > today ? today : monthEnd;
      if (monthStart > today) { c.previsto = 0; continue; }
      const allDays = eachDayOfInterval({ start: monthStart, end: limit });
      let previsto = 0;
      for (const day of allDays) {
        const dayStr = format(day, "yyyy-MM-dd");
        if (feriasDates?.has(dayStr)) continue;
        const isFeriado = feriadosLookup.has(dayStr);
        if (!isDiaPrevisto(dayStr, workSchedule ?? null, isFeriado)) continue;
        previsto += jornadaDia;
      }
      c.previsto = previsto;
    }

    // Mais recente primeiro
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [resumosParaSoma, config, feriadosLookup, feriasDates, workSchedule]);

  const mesAtualKey = format(today, "yyyy-MM");
  const mesAtual = porMes.find(([k]) => k === mesAtualKey)?.[1];

  return (
    <div className="space-y-6">
      {/* Aviso explicativo */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Seu regime é de <span className="font-semibold text-foreground">Horas Extras</span>.
              Horas positivas e negativas <span className="font-semibold">não se compensam</span> —
              são informadas separadamente para a folha de pagamento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumo do mês corrente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Soma das horas positivas do mês corrente — serão pagas como horas extras">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Horas a Pagar (mês atual)</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatMinutes(mesAtual?.pagar ?? 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card title="Soma das horas negativas do mês corrente — serão descontadas em folha">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Horas a Descontar (mês atual)</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatMinutes(mesAtual?.descontar ?? 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela mensal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico Mensal</CardTitle>
          <CardDescription>Últimos 12 meses — totais separados por mês de referência</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Previsto</TableHead>
                    <TableHead className="text-center">Trabalhado</TableHead>
                    <TableHead className="text-center">Horas a Pagar</TableHead>
                    <TableHead className="text-center">Horas a Descontar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porMes.map(([ym, v]) => {
                    const isAtual = ym === mesAtualKey;
                    return (
                      <TableRow key={ym}>
                        <TableCell className="font-medium capitalize">
                          {format(parseISO(ym + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}
                          {isAtual && <Badge variant="outline" className="ml-2 text-xs">Atual</Badge>}
                        </TableCell>
                        <TableCell className="text-center font-mono">{formatMinutes(v.previsto)}</TableCell>
                        <TableCell className="text-center font-mono">{formatMinutes(v.trabalhado)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 font-mono">
                            {formatMinutes(v.pagar)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-red-100 text-red-700 font-mono">
                            {formatMinutes(v.descontar)}
                          </Badge>
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
    </div>
  );
}
