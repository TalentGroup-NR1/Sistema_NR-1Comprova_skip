import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, CalendarCheck, ArrowRight } from "lucide-react";
import { useMeuColaborador } from "@/hooks/useMinhasFerias";
import { useFeriasColaborador } from "@/hooks/useFerias";
import { isVinculoElegivelFerias } from "@/lib/feriasEngine";
import { parseISODate } from "@/lib/validators/colaborador";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Card visual de "Minhas Férias" para o dashboard do colaborador.
 * Apenas leitura — consome hooks já existentes (useMeuColaborador, useFeriasColaborador).
 */
export function MinhasFeriasCard() {
  const { data: colab, isLoading: loadingColab } = useMeuColaborador();
  const vinculoElegivel = isVinculoElegivelFerias((colab as any)?.contract_type);
  const { data, isLoading } = useFeriasColaborador(vinculoElegivel ? colab?.id ?? null : null);

  const loading = loadingColab || isLoading;

  // Saldo de dias adquiridos ainda não gozados
  const saldoDias = (() => {
    if (!data) return 0;
    const adquiridos = data.periodos
      .filter((p) => p.status === "aberto")
      .reduce((acc, p) => acc + (p.dias_adquiridos || 0), 0);
    const gozados = data.gozos
      .filter((g) => g.status === "aprovado" || g.status === "gozado" || g.status === "planejado")
      .reduce((acc, g) => acc + (g.dias_gozados || 0), 0);
    return Math.max(0, adquiridos - gozados);
  })();

  const proxima = (() => {
    if (!data) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const upcoming = data.gozos
      .filter((g) => (g.status === "planejado" || g.status === "aprovado") && parseISODate(g.data_inicio_gozo) >= hoje)
      .sort(
        (a, b) =>
          parseISODate(a.data_inicio_gozo).getTime() - parseISODate(b.data_inicio_gozo).getTime()
      );
    return upcoming[0] ?? null;
  })();

  const pendentes = data?.gozos.filter((g) => g.status === "planejado").length ?? 0;

  // Colaboradores sem direito legal a férias (PJ, Temporário etc.) não veem o card.
  if (!loadingColab && colab && !vinculoElegivel) return null;

  return (
    <Card className="border-border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Plane className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-foreground leading-tight">
                Minhas Férias
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Seu descanso, sua escolha.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/minhas-ferias">
              Solicitar férias
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-background-alt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo</p>
              <p className="text-2xl font-semibold text-foreground">
                {saldoDias} <span className="text-sm font-normal text-muted-foreground">dias</span>
              </p>
            </div>
            <div className="rounded-md border border-border bg-background-alt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-semibold text-foreground">
                {pendentes}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {pendentes === 1 ? "solicitação" : "solicitações"}
                </span>
              </p>
            </div>
            <div className="rounded-md border border-border bg-background-alt/40 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Próxima</p>
              {proxima ? (
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mt-1">
                  <CalendarCheck className="h-4 w-4 text-success" />
                  {format(parseISODate(proxima.data_inicio_gozo), "dd 'de' MMM", { locale: ptBR })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Nada agendado</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
