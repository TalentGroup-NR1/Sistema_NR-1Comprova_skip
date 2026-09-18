import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, BarChart3, Calendar, TrendingUp, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEmployeePulseHistory, EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import { useColaborador } from "@/hooks/useColaboradores";
import { PulsoEvolutionChartEmployee } from "./PulsoEvolutionChartEmployee";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AcompanhamentoForm } from "../acompanhamentos/AcompanhamentoForm";

interface PulsoColaboradorDetailProps {
  colaboradorId: string;
  onBack: () => void;
}

export function PulsoColaboradorDetail({ colaboradorId, onBack }: PulsoColaboradorDetailProps) {
  const { data: history, isLoading: loadingHistory } = useEmployeePulseHistory(colaboradorId);
  const { data: colaborador, isLoading: loadingColaborador } = useColaborador(colaboradorId);

  // Agrupar por campanha
  const groupedByCampaign = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const grouped = history.reduce((acc, item) => {
      const key = item.campaign_id;
      if (!acc[key]) {
        acc[key] = {
          campaign_id: item.campaign_id,
          response_id: item.response_id || null, // <--- Get response_id
          campaign_title: item.campaign_title,
          campaign_date: item.campaign_date,
          created_at: item.created_at,
          responses: [],
          avg_score: 0,
          comentario: null as string | null,
        };
      }
      acc[key].responses.push(item);
      if (item.comentario) {
        acc[key].comentario = item.comentario;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calcular média por campanha
    Object.values(grouped).forEach((campaign: any) => {
      const numericResponses = campaign.responses
        .filter((r: any) => r.resposta_numerica !== null)
        .map((r: any) => r.resposta_numerica);
      
      if (numericResponses.length > 0) {
        campaign.avg_score = numericResponses.reduce((a: number, b: number) => a + b, 0) / numericResponses.length;
      }
    });

    return Object.values(grouped).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [history]);

  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    if (!groupedByCampaign || groupedByCampaign.length === 0) {
      return { totalRespostas: 0, mediaGeral: null, totalCampanhas: 0 };
    }

    const allScores = groupedByCampaign
      .map((c: any) => c.avg_score)
      .filter((s: number) => s > 0);

    return {
      totalRespostas: groupedByCampaign.length,
      mediaGeral: allScores.length > 0 
        ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length 
        : null,
      totalCampanhas: groupedByCampaign.length,
    };
  }, [groupedByCampaign]);

  const getEmojiForScore = (score: number | null) => {
    if (score === null) return null;
    const roundedScore = Math.round(score);
    return EMOJI_SCALE.find((e) => e.score === roundedScore);
  };

  if (loadingHistory || loadingColaborador) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Colaborador não encontrado.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const emojiData = getEmojiForScore(stats.mediaGeral);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={colaborador.avatar_url || undefined} />
            <AvatarFallback>
              {colaborador.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{colaborador.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {colaborador.job_title} • {colaborador.department}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Campanhas</p>
                <p className="text-2xl font-bold">{stats.totalCampanhas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média Geral</p>
                <div className="flex items-center gap-2">
                  {emojiData && <span className="text-2xl">{emojiData.emoji}</span>}
                  <span className="text-2xl font-bold">
                    {stats.mediaGeral?.toFixed(1) || "-"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Resposta</p>
                <p className="text-lg font-medium">
                  {groupedByCampaign[0]?.created_at
                    ? format(new Date(groupedByCampaign[0].created_at), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      {groupedByCampaign.length > 0 && (
        <PulsoEvolutionChartEmployee data={groupedByCampaign} />
      )}

      {/* Histórico de Respostas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Histórico de Respostas
          </CardTitle>
          <CardDescription>
            Todas as respostas do colaborador por campanha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupedByCampaign.length > 0 ? (
            <div className="space-y-4">
              {groupedByCampaign.map((campaign: any) => {
                const campaignEmoji = getEmojiForScore(campaign.avg_score);
                
                return (
                  <div
                    key={campaign.campaign_id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{campaign.campaign_title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(campaign.campaign_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      {campaignEmoji && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{campaignEmoji.emoji}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "border-slate-400 font-semibold", 
                              campaignEmoji.color.replace("hover:bg-", "").replace("border-", ""),
                              campaignEmoji.textColor
                            )}
                          >
                            Média: {campaign.avg_score.toFixed(1)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pergunta</TableHead>
                          <TableHead className="text-center w-[120px]">Resposta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaign.responses.map((response: any) => {
                          const responseEmoji = getEmojiForScore(response.resposta_numerica);
                          
                          return (
                            <TableRow key={response.question_id}>
                              <TableCell className="text-sm">{response.pergunta}</TableCell>
                              <TableCell className="text-center">
                                {response.tipo === 'escala_0_5' && responseEmoji ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xl">{responseEmoji.emoji}</span>
                                    {response.esfera && (
                                      <Badge variant="outline" className="text-xs bg-background">
                                        {response.esfera === 'pessoal' ? 'Pessoal' : response.esfera === 'trabalho' ? 'Trabalho' : response.esfera}
                                      </Badge>
                                    )}
                                  </div>
                                ) : response.tipo === 'sim_nao' ? (
                                  <Badge variant={response.resposta === 'sim' ? 'default' : 'destructive'}>
                                    {response.resposta === 'sim' ? 'Sim' : 'Não'}
                                  </Badge>
                                ) : (
                                  <span className="text-sm">{response.resposta}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {campaign.comentario && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Comentário:</p>
                        <p className="text-sm italic">"{campaign.comentario}"</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Criar Acompanhamento
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Novo Acompanhamento</DialogTitle>
                          </DialogHeader>
                          <AcompanhamentoForm
                            colaboradorId={colaboradorId}
                            respostaId={campaign.response_id || null} // Correct reference to pulse_surveys(id) instead of campaign_id
                            contextoPulso={{
                              emoji: campaignEmoji?.emoji || "📋",
                              nome: colaborador.full_name
                            }}
                            onSuccess={() => {
                              // We simulate going back and clicking the tab, or we can dispatch an event
                              const tabTrigger = document.querySelector('[value="acompanhamentos"]') as HTMLElement;
                              if (tabTrigger) tabTrigger.click();
                              onBack();
                            }}
                            onCancel={() => {
                              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                            }}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Este colaborador ainda não respondeu nenhuma campanha do Pulso.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
