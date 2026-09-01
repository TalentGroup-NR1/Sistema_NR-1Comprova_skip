import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
import { usePontoHistorico } from "@/hooks/usePontoRegistros";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { usePontoCompensacoes } from "@/hooks/usePontoCompensacoes";
import { useFeriados } from "@/hooks/useFeriados";
import { useFeriasAtivas } from "@/hooks/useFeriasAtivas";
import { useColaboradorWorkSchedule } from "@/hooks/useColaboradorWorkSchedule";
import { calcularResumoDiario, formatMinutes, ResumoDiario, isDiaPrevisto } from "@/hooks/usePontoResumo";
import { usePontoResumoDB, aplicarResumoDB } from "@/hooks/usePontoResumoDB";
import { useColaboradorAdmissionDate } from "@/hooks/useColaboradorAdmissionDate";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CicloBancoHoras } from "@/lib/bancoHorasCiclo";

interface Props {
  colaboradorId: string | undefined;
  ciclo: CicloBancoHoras;
  /** Intervalo consultado (pode ser diferente do ciclo em modo override). Default = ciclo. */
  startDate?: string;
  endDate?: string;
  /** Esconde os cards de resumo e a linha da equação (usado no dialog do Fechamento). */
  compact?: boolean;
}

export function EvolucaoMensalCiclo({ colaboradorId, ciclo, startDate, endDate, compact }: Props) {
  const today = new Date();
  const { config } = usePontoConfig();
  const { compensacoes } = usePontoCompensacoes();

  const ini = startDate ?? ciclo.inicio;
  const fim = endDate ?? ciclo.fim;
  const todayStr = format(today, "yyyy-MM-dd");
  const queryEnd = fim < todayStr ? fim : todayStr;

  const { data: registros = [], isLoading } = usePontoHistorico(colaboradorId, ini, queryEnd);
  const { feriadosMap } = useFeriados(parseISO(ini).getFullYear());
  const { feriasDates } = useFeriasAtivas(colaboradorId, ini, queryEnd);
  const { data: workSchedule } = useColaboradorWorkSchedule(colaboradorId);
  const { data: resumoDB } = usePontoResumoDB(colaboradorId, ini, queryEnd);
  const { data: admissionDate } = useColaboradorAdmissionDate(colaboradorId);

  const feriadosLookup = useMemo(() => {
    const m = new Map<string, { nome: string }>();
    feriadosMap.forEach((v, k) => m.set(k, { nome: v.nome }));
    return m;
  }, [feriadosMap]);

  const resumos: ResumoDiario[] = useMemo(() => {
    if (!ini || !queryEnd) return [];
    const days = eachDayOfInterval({
      start: new Date(ini + "T12:00:00"),
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
  }, [registros, config, compensacoes, feriadosLookup, feriasDates, ini, queryEnd, workSchedule, resumoDB, admissionDate]);

  const resumosParaSoma = useMemo(
    () => resumos.filter((r) => r.data !== todayStr),
    [resumos, todayStr],
  );

  const porMes = useMemo(() => {
    const map = new Map<string, { positivas: number; negativas: number; saldo: number; trabalhado: number; previsto: number }>();
    const ciStart = parseISO(ciclo.inicio);
    const ciEnd = parseISO(ciclo.fim);
    let cur = startOfMonth(ciStart);
    while (cur <= ciEnd) {
      const ym = format(cur, "yyyy-MM");
      map.set(ym, { positivas: 0, negativas: 0, saldo: 0, trabalhado: 0, previsto: 0 });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    for (const r of resumosParaSoma) {
      const ym = r.data.substring(0, 7);
      const c = map.get(ym) || { positivas: 0, negativas: 0, saldo: 0, trabalhado: 0, previsto: 0 };
      if (r.saldoMin > 0) c.positivas += r.saldoMin;
      else c.negativas += r.saldoMin;
      c.saldo += r.saldoMin;
      c.trabalhado += r.horasTrabalhadasMin;
      map.set(ym, c);
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
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [resumosParaSoma, config, feriadosLookup, feriasDates, workSchedule, ciclo]);

  const totalPositivas = resumosParaSoma.reduce((acc, r) => acc + (r.saldoMin > 0 ? r.saldoMin : 0), 0);
  const totalNegativas = resumosParaSoma.reduce((acc, r) => acc + (r.saldoMin < 0 ? r.saldoMin : 0), 0);
  const saldoCiclo = totalPositivas + totalNegativas;

  const mesAtualKey = format(today, "yyyy-MM");
  const mesAtual = porMes.find(([k]) => k === mesAtualKey)?.[1];

  return (
    <div className="space-y-6">
      {!compact && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title="Créditos − Débitos do ciclo (saldo final, com sinal)">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo do Ciclo</p>
                    <p className={`text-2xl font-bold ${saldoCiclo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatMinutes(saldoCiclo)}
                    </p>
                  </div>
                  <Wallet className={`h-8 w-8 ${saldoCiclo >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                </div>
              </CardContent>
            </Card>
            <Card title="Soma apenas dos dias com saldo positivo (créditos brutos)">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Créditos do Ciclo</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMinutes(totalPositivas)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card title="Soma apenas dos dias com saldo negativo (débitos brutos)">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Débitos do Ciclo</p>
                    <p className="text-2xl font-bold text-red-600">{formatMinutes(totalNegativas)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card title="Saldo final apenas do mês corrente">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo do Mês Corrente</p>
                    <p className={`text-2xl font-bold ${(mesAtual?.saldo ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatMinutes(mesAtual?.saldo ?? 0)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-mono text-emerald-600">{formatMinutes(totalPositivas)}</span>
                <span className="mx-1">(créditos)</span>
                <span className="mx-1">−</span>
                <span className="font-mono text-red-600">{formatMinutes(Math.abs(totalNegativas))}</span>
                <span className="mx-1">(débitos)</span>
                <span className="mx-1">=</span>
                <span className={`font-mono font-semibold ${saldoCiclo >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {formatMinutes(saldoCiclo)}
                </span>
                <span className="mx-1">(saldo do ciclo)</span>
                <span className="block text-[10px] mt-1 opacity-70">
                  O dia de hoje só entra na soma após registrar batidas. Dias futuros são ignorados.
                </span>
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Saldo do Ciclo</p>
            <p className={`text-lg font-bold font-mono ${saldoCiclo >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMinutes(saldoCiclo)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Créditos</p>
            <p className="text-lg font-bold font-mono text-emerald-600">{formatMinutes(totalPositivas)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Débitos</p>
            <p className="text-lg font-bold font-mono text-red-600">{formatMinutes(totalNegativas)}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Mês Corrente</p>
            <p className={`text-lg font-bold font-mono ${(mesAtual?.saldo ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMinutes(mesAtual?.saldo ?? 0)}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Evolução Mensal do Ciclo</CardTitle>
          <CardDescription>Saldo de horas mês a mês dentro do ciclo selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : porMes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Previsto</TableHead>
                    <TableHead className="text-center">Trabalhado</TableHead>
                    <TableHead className="text-center">Horas Positivas</TableHead>
                    <TableHead className="text-center">Horas Negativas</TableHead>
                    <TableHead className="text-center">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porMes.map(([ym, v]) => {
                    const isFuturo = parseISO(ym + "-01") > today && ym !== mesAtualKey;
                    return (
                      <TableRow key={ym} className={isFuturo ? "opacity-50" : ""}>
                        <TableCell className="font-medium capitalize">
                          {format(parseISO(ym + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}
                          {isFuturo && <Badge variant="outline" className="ml-2 text-xs">Futuro</Badge>}
                        </TableCell>
                        <TableCell className="text-center font-mono">{formatMinutes(v.previsto)}</TableCell>
                        <TableCell className="text-center font-mono">{formatMinutes(v.trabalhado)}</TableCell>
                        <TableCell className="text-center font-mono text-emerald-600">{formatMinutes(v.positivas)}</TableCell>
                        <TableCell className="text-center font-mono text-red-600">{formatMinutes(v.negativas)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={v.saldo >= 0 ? "bg-emerald-100 text-emerald-700 font-mono" : "bg-red-100 text-red-700 font-mono"}
                          >
                            {formatMinutes(v.saldo)}
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
