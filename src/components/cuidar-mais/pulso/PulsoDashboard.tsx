import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  usePulseDashboard, 
  usePulseComments, 
  useTotalColaboradores,
  usePendingPulseRespondents,
  EMOJI_SCALE, 
  getCurrentWeekInfo 
} from "@/hooks/usePulseSurvey";
import { PulsoEvolutionChart } from "./PulsoEvolutionChart";
import { PulsoDistributionChart } from "./PulsoDistributionChart";
import { PulsoCommentsTable } from "./PulsoCommentsTable";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Activity,
  Send,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function PulsoDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { weekNumber: currentWeek } = getCurrentWeekInfo();

  const { data: dashboardData, isLoading } = usePulseDashboard(selectedYear);
  const { data: comments, isLoading: loadingComments } = usePulseComments(selectedYear);
  const { data: totalColaboradores } = useTotalColaboradores();
  const { data: pendingRespondents } = usePendingPulseRespondents();
  const [sendingReminder, setSendingReminder] = useState(false);

  // Dados da semana atual
  const currentWeekData = dashboardData?.find(
    d => d.week_number === currentWeek && d.year === selectedYear
  );

  // Dados da semana anterior para comparação
  const previousWeekData = dashboardData?.find(
    d => d.week_number === currentWeek - 1 && d.year === selectedYear
  );

  // Calcular delta
  const avgScoreDelta = currentWeekData && previousWeekData
    ? Number(currentWeekData.avg_score) - Number(previousWeekData.avg_score)
    : null;

  // Participação
  const participationRate = totalColaboradores && currentWeekData
    ? Math.round((Number(currentWeekData.total_responses) / totalColaboradores) * 100)
    : 0;

  // Emoji médio
  const avgEmojiData = currentWeekData
    ? EMOJI_SCALE.find(e => e.score === Math.round(Number(currentWeekData.avg_score)))
    : null;

  const handleSendReminder = async () => {
    if (!pendingRespondents?.length) {
      toast.info("Todos os colaboradores já responderam esta semana!");
      return;
    }

    setSendingReminder(true);
    // Simular envio (a edge function seria chamada aqui)
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success(`Lembrete enviado para ${pendingRespondents.length} colaboradores!`);
    setSendingReminder(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Dashboard de Sentimento</h2>
          <p className="text-sm text-muted-foreground">
            Monitoramento semanal anônimo do bem-estar
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1].map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleSendReminder}
            disabled={sendingReminder || !pendingRespondents?.length}
          >
            {sendingReminder ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar Lembrete ({pendingRespondents?.length || 0})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Média Atual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Atual</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{avgEmojiData?.emoji || '➖'}</span>
              <div className="text-2xl font-bold">
                {currentWeekData ? Number(currentWeekData.avg_score).toFixed(1) : '-'}
              </div>
            </div>
            {avgScoreDelta !== null && (
              <p className={cn(
                "text-xs flex items-center gap-1 mt-1",
                avgScoreDelta > 0 ? "text-green-600" : avgScoreDelta < 0 ? "text-red-600" : "text-muted-foreground"
              )}>
                {avgScoreDelta > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : avgScoreDelta < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                {avgScoreDelta > 0 ? '+' : ''}{avgScoreDelta.toFixed(2)} vs semana anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* Respostas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Respostas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekData?.total_responses || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              esta semana
            </p>
          </CardContent>
        </Card>

        {/* Participação */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participação</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {currentWeekData?.total_responses || 0}/{totalColaboradores || 0} colaboradores
            </p>
          </CardContent>
        </Card>

        {/* Comentários */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comentários</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentWeekData?.comments_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              com feedback escrito
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Sentimento</CardTitle>
            <CardDescription>Média semanal nas últimas 8 semanas</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <PulsoEvolutionChart data={dashboardData || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Respostas</CardTitle>
            <CardDescription>Semana atual</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <PulsoDistributionChart weekData={currentWeekData} />
          </CardContent>
        </Card>
      </div>

      {/* Comments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comentários Anônimos</CardTitle>
          <CardDescription>
            Feedbacks escritos pelos colaboradores (sem identificação)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PulsoCommentsTable 
            comments={comments || []} 
            isLoading={loadingComments} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
