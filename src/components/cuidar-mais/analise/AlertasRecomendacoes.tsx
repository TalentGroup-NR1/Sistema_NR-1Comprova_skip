import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle2, Clock, Calendar, Lightbulb, ShieldCheck } from 'lucide-react';
import { EstatisticasDimensao } from '@/hooks/useCuidarMaisAnalise';
import { RECOMENDACOES, DimensaoCuidarMais, LIMIARES } from '@/lib/cuidarMaisDimensoes';

interface AlertasRecomendacoesProps {
  dimensoes: EstatisticasDimensao[];
}

export function AlertasRecomendacoes({ dimensoes }: AlertasRecomendacoesProps) {
  const dimensoesComAlerta = dimensoes.filter(d => d.alerta);
  const dimensoesSemAlerta = dimensoes.filter(d => !d.alerta);

  if (dimensoes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum dado disponível</p>
            <p className="text-sm mt-1">
              Configure dimensões nas perguntas para ver alertas e recomendações.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas Ativos */}
      {dimensoesComAlerta.length > 0 ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas Ativos ({dimensoesComAlerta.length})
            </CardTitle>
            <CardDescription>
              Dimensões que requerem atenção imediata com base nos limiares configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {dimensoesComAlerta.map(d => {
                const recomendacoes = RECOMENDACOES[d.dimensao];
                
                return (
                  <AccordionItem 
                    key={d.dimensao} 
                    value={d.dimensao}
                    className="border rounded-lg px-4 bg-destructive/5"
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3 text-left">
                        <span className="text-2xl">{d.icone}</span>
                        <div>
                          <p className="font-medium">{d.nome}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="destructive" className="text-xs">
                              Score: {d.score.toFixed(2)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {d.percentual_risco}% em risco
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4 pt-2">
                        {/* Motivo do alerta */}
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <p className="text-sm font-medium text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Motivo do alerta
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {d.motivo_alerta || `Score abaixo de ${LIMIARES.SCORE_RISCO} ou % em risco acima de ${LIMIARES.PERCENTUAL_RISCO}%`}
                          </p>
                        </div>

                        {/* Ações de curto prazo */}
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            Ações de Curto Prazo (2 semanas)
                          </p>
                          <ul className="space-y-2">
                            {recomendacoes.curto_prazo.map((acao, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <span>{acao}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Ações de médio prazo */}
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            Ações de Médio Prazo (1-3 meses)
                          </p>
                          <ul className="space-y-2">
                            {recomendacoes.medio_prazo.map((acao, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <span>{acao}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <p className="text-xs text-muted-foreground pt-2 border-t">
                          ⚠️ Estas são recomendações organizacionais, sem caráter clínico. Para questões 
                          de saúde mental individual, encaminhe para profissionais especializados.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Nenhum alerta ativo
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Todas as dimensões estão dentro dos parâmetros esperados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dimensões Saudáveis */}
      {dimensoesSemAlerta.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Dimensões Saudáveis ({dimensoesSemAlerta.length})
            </CardTitle>
            <CardDescription>
              Dimensões que estão dentro dos parâmetros esperados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {dimensoesSemAlerta.map(d => (
                <div 
                  key={d.dimensao}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <span className="text-xl">{d.icone}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Score: {d.score.toFixed(2)} | Risco: {d.percentual_risco}%
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    OK
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limiares de Referência */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limiares de Referência</CardTitle>
          <CardDescription>
            Critérios utilizados para identificar alertas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Score Crítico</p>
              <p className="text-2xl font-bold text-destructive">&lt; {LIMIARES.SCORE_RISCO}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Média da dimensão abaixo deste valor
              </p>
            </div>
            
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">% em Risco Crítico</p>
              <p className="text-2xl font-bold text-destructive">&gt; {LIMIARES.PERCENTUAL_RISCO}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                Percentual de respostas em níveis 1-2
              </p>
            </div>
            
            <div className="p-3 rounded-lg border">
              <p className="text-sm font-medium">Amostra Mínima</p>
              <p className="text-2xl font-bold">{LIMIARES.AMOSTRA_MINIMA}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Respondentes para exibir dados por departamento
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
