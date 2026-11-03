import { useMemo } from "react";
import {
  calcularDiasDireitoProporcional,
  contarPorColaborador,
  calcularStatusPeriodo,
  PeriodoComGozos,
} from "@/lib/feriasEngine";
import { parseISO, differenceInDays, isWithinInterval, addDays } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Clock, PlaneTakeoff, CalendarCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useColaboradoresComFerias, useFeriasPendentesAprovacao } from "@/hooks/useFerias";

interface Props {
  onGoAprovacoes: () => void;
  onGoColaboradoresVencidas: () => void;
  onGoColaboradoresAVencer: () => void;
}

export function FeriasDashboard({
  onGoAprovacoes,
  onGoColaboradoresVencidas,
  onGoColaboradoresAVencer,
}: Props) {
  const { data: colaboradores, isLoading } = useColaboradoresComFerias();
  const { data: pendentes } = useFeriasPendentesAprovacao();

  const metricas = useMemo(() => {
    const hoje = new Date();
    const hojeStr = format(hoje, "yyyy-MM-dd");

    const emCurso: any[] = [];
    const proximas: any[] = [];
    const agendadas: any[] = []; // todas as férias futuras planejadas/aprovadas
    const saldosAbertos: any[] = []; // colaboradores com saldo de férias em aberto
    const colaboradoresComPeriodos: Array<{ id: string; periodos: PeriodoComGozos[] }> = [];

    // Única iteração sobre colaboradores (Correção 2)
    (colaboradores || []).forEach((c) => {
      const gozosAtivos = (c.ferias_gozo || []).filter(g => g.status !== 'cancelado');

      const periodosColab: PeriodoComGozos[] = (c.periodos_aquisitivos || []).map((p) => {
        const gozosPeriodo = (c.ferias_gozo || []).filter((g) => g.periodo_aquisitivo_id === p.id);
        const gozosPeriodoAtivos = gozosPeriodo.filter((g) => g.status !== 'cancelado');

        // Correção 1: usados calculado diretamente dos gozos reais (sem truncamento por direito - restantes)
        const usados = gozosPeriodoAtivos.reduce(
          (s, g) => s + (Number(g.dias_gozados) || 0) + (Number(g.abono_pecuniario_dias) || 0),
          0
        );
        const direito = calcularDiasDireitoProporcional(p.data_inicio_aquisitivo, p.data_fim_aquisitivo, hoje);
        const restantes = Math.max(0, direito - usados);
        const limite = parseISO(p.data_limite_gozo);

        const periodoFormatado: PeriodoComGozos = {
          id: p.id,
          data_inicio_aquisitivo: p.data_inicio_aquisitivo,
          data_fim_aquisitivo: p.data_fim_aquisitivo,
          data_limite_gozo: p.data_limite_gozo,
          dias_adquiridos: p.dias_adquiridos,
          gozos: gozosPeriodo,
        };

        if (restantes > 0) {
          const agendadosDias = gozosPeriodoAtivos
            .filter(g => (g.status === 'planejado' || g.status === 'aprovado') && parseISO(g.data_fim_gozo) >= hoje)
            .reduce((s, g) => s + g.dias_gozados + (g.abono_pecuniario_dias || 0), 0);

          saldosAbertos.push({
            colaborador: c,
            periodo: p,
            direito,
            usados,
            restantes,
            agendados: agendadosDias,
            limite,
          });
        }

        return periodoFormatado;
      });

      colaboradoresComPeriodos.push({
        id: c.id,
        periodos: periodosColab,
      });

      // em curso, próximas e agendadas
      gozosAtivos.forEach(g => {
        const iniStr = String(g.data_inicio_gozo).slice(0, 10);
        const fimStr = String(g.data_fim_gozo).slice(0, 10);
        const ini = parseISO(iniStr);
        if (iniStr <= hojeStr && hojeStr <= fimStr) {
          emCurso.push({ ...g, colaborador: c });
        } else if ((g.status === 'aprovado' || g.status === 'planejado') && iniStr > hojeStr && differenceInDays(ini, hoje) <= 30) {
          proximas.push({ ...g, colaborador: c });
        }
        if ((g.status === 'aprovado' || g.status === 'planejado') && fimStr >= hojeStr) {
          agendadas.push({ ...g, colaborador: c });
        }
      });
    });

    const contagem = contarPorColaborador(colaboradoresComPeriodos, hoje, 90);

    agendadas.sort((a, b) => a.data_inicio_gozo.localeCompare(b.data_inicio_gozo));
    saldosAbertos.sort((a, b) => a.limite.getTime() - b.limite.getTime());

    return {
      vencidas: contagem.colaboradoresVencidos,
      aVencer: contagem.colaboradoresAVencer,
      periodosVencidos: contagem.periodosVencidos,
      periodosAVencer: contagem.periodosAVencer,
      emCurso,
      proximas,
      agendadas,
      saldosAbertos,
    };
  }, [colaboradores]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const cards = [
    {
      title: 'Pendentes de Aprovação',
      value: pendentes?.length ?? 0,
      icon: Clock,
      color: 'text-orange-600 bg-orange-100',
      onClick: onGoAprovacoes,
    },
    {
      title: 'Férias Vencidas',
      value: metricas.vencidas,
      icon: AlertTriangle,
      color: 'text-destructive bg-destructive/10',
      onClick: onGoColaboradoresVencidas,
    },
    {
      title: 'A Vencer (90 dias)',
      value: metricas.aVencer,
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-100',
      onClick: onGoColaboradoresAVencer,
    },
    {
      title: 'Férias em Curso',
      value: metricas.emCurso.length,
      icon: PlaneTakeoff,
      color: 'text-blue-600 bg-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card
              key={i}
              className={c.onClick ? "cursor-pointer hover:shadow-md transition" : ""}
              onClick={c.onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{c.title}</p>
                    <p className="text-3xl font-bold mt-2">{c.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${c.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PlaneTakeoff className="h-5 w-5" /> Férias em Curso Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.emCurso.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum colaborador em férias hoje</p>
            ) : (
              <ul className="space-y-2">
                {metricas.emCurso.map((g: any) => (
                  <li key={g.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{g.colaborador.full_name}</p>
                      <p className="text-xs text-muted-foreground">{g.colaborador.department || '—'}</p>
                    </div>
                    <Badge variant="secondary">
                      até {format(parseISO(g.data_fim_gozo), "dd/MM", { locale: ptBR })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" /> Próximas Férias (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricas.proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem férias agendadas nos próximos 30 dias</p>
            ) : (
              <ul className="space-y-2">
                {metricas.proximas.map((g: any) => (
                  <li key={g.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{g.colaborador.full_name}</p>
                      <p className="text-xs text-muted-foreground">{g.colaborador.department || '—'}</p>
                    </div>
                    <Badge variant="outline">
                      {format(parseISO(g.data_inicio_gozo), "dd/MM", { locale: ptBR })} – {format(parseISO(g.data_fim_gozo), "dd/MM", { locale: ptBR })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> Férias Agendadas e Aprovadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metricas.agendadas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma férias agendada no momento</p>
          ) : (
            <ul className="space-y-2">
              {metricas.agendadas.map((g: any) => (
                <li key={g.id} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{g.colaborador.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.colaborador.department || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={g.status === 'aprovado' ? 'default' : 'secondary'} className="w-24 justify-center">
                      {g.status === 'aprovado' ? 'Aprovada' : 'Agendada'}
                    </Badge>
                    <Badge variant="outline" className="w-44 justify-center tabular-nums">
                      {format(parseISO(g.data_inicio_gozo), "dd/MM/yyyy", { locale: ptBR })} – {format(parseISO(g.data_fim_gozo), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                    <Badge variant="secondary" className="w-12 justify-center tabular-nums">{g.dias_gozados + (g.abono_pecuniario_dias || 0)}d</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> Saldo de Férias em Aberto
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Colaboradores com dias ainda não agendados (ou parcialmente agendados) dentro do prazo de gozo.
          </p>
        </CardHeader>
        <CardContent>
          {metricas.saldosAbertos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum saldo em aberto</p>
          ) : (
            <ul className="space-y-2">
              {metricas.saldosAbertos.map((s: any) => (
                <li key={`${s.colaborador.id}-${s.periodo.id}`} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{s.colaborador.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(s.colaborador.department || '—')} • Aquisitivo {format(parseISO(s.periodo.data_inicio_aquisitivo), "dd/MM/yyyy", { locale: ptBR })} – {format(parseISO(s.periodo.data_fim_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Direito: {s.direito}d</Badge>
                    {s.agendados > 0 && <Badge variant="secondary">Agendado: {s.agendados}d</Badge>}
                    <Badge variant={s.limite < new Date() ? 'destructive' : 'default'}>
                      Em aberto: {s.restantes}d
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Limite {format(s.limite, "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
