import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, CheckCircle, Clock, AlertCircle, Trash2, Users, Link2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAvaliacoesCiclo, useAvaliacaoMutations, useRegenerateLinkMutation, AvaliacaoStatus } from "@/hooks/useAvaliacoesAplicadas";
import { CicloAvaliacao } from "@/hooks/useAvaliacoes";
import { AplicarCicloDialog } from "./AplicarCicloDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getShareBaseUrl } from '@/lib/appUrl';

interface AcompanhamentoCicloProps {
  ciclo: CicloAvaliacao;
  onBack?: () => void;
}

const statusConfig: Record<AvaliacaoStatus, { label: string; icon: React.ReactNode; className: string }> = {
  nao_iniciada: { label: "Não iniciada", icon: <Clock className="h-3 w-3" />, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em andamento", icon: <AlertCircle className="h-3 w-3" />, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  concluida: { label: "Concluída", icon: <CheckCircle className="h-3 w-3" />, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

export function AcompanhamentoCiclo({ ciclo }: AcompanhamentoCicloProps) {
  const { toast } = useToast();
  const { data: avaliacoes, isLoading } = useAvaliacoesCiclo(ciclo.id);
  const { deleteAvaliacao } = useAvaliacaoMutations();
  const regenerateLinkMutation = useRegenerateLinkMutation();
  const [aplicarDialogOpen, setAplicarDialogOpen] = useState(false);

  const copyLink = (token: string, tipo: string) => {
    const baseUrl = getShareBaseUrl();
    const link = `${baseUrl}/avaliacao/preencher/${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(link);
    toast({ 
      title: "Link copiado!", 
      description: `Link de ${tipo === 'autoavaliacao' ? 'autoavaliação' : 'gestor'} copiado para a área de transferência.` 
    });
  };

  const handleRegenerateLink = (avaliacaoId: string, tipo: 'autoavaliacao' | 'gestor') => {
    regenerateLinkMutation.mutate(
      { avaliacaoId, tipo, cicloId: ciclo.id },
      {
        onSuccess: () => {
          toast({ title: "Link regenerado com sucesso!" });
        },
      }
    );
  };

  // Helper para mostrar últimos 8 caracteres do token (debug)
  const getTokenPreview = (token: string | undefined) => {
    if (!token) return 'N/A';
    return `...${token.slice(-8)}`;
  };

  const handleDelete = (id: string) => {
    deleteAvaliacao.mutate({ id, cicloId: ciclo.id });
  };

  // Calcular progresso
  const totalAvaliacoes = avaliacoes?.length || 0;
  const autoCompletas = avaliacoes?.filter(a => a.status_autoavaliacao === 'concluida').length || 0;
  const gestorCompletas = avaliacoes?.filter(a => a.status_avaliacao_gestor === 'concluida').length || 0;
  const totalEsperado = totalAvaliacoes * 2;
  const totalCompleto = autoCompletas + gestorCompletas;
  const progresso = totalEsperado > 0 ? (totalCompleto / totalEsperado) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Acompanhamento de Avaliações</h2>
          <p className="text-sm text-muted-foreground">
            Aplique o ciclo e acompanhe o progresso das avaliações.
          </p>
        </div>
        <Button onClick={() => setAplicarDialogOpen(true)}>
          <Users className="h-4 w-4 mr-2" />
          Aplicar Ciclo
        </Button>
      </div>

      {/* Progresso */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Progresso Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{totalCompleto} de {totalEsperado} avaliações concluídas</span>
              <span className="font-medium">{progresso.toFixed(0)}%</span>
            </div>
            <Progress value={progresso} className="h-2" />
            <div className="flex gap-6 text-sm text-muted-foreground mt-4">
              <span>Autoavaliações: {autoCompletas}/{totalAvaliacoes}</span>
              <span>Avaliações Gestor: {gestorCompletas}/{totalAvaliacoes}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Avaliações do Ciclo
          </CardTitle>
          <CardDescription>
            {totalAvaliacoes} avaliação(ões) gerada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!avaliacoes || avaliacoes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma avaliação gerada</p>
              <p className="text-sm">Clique em "Aplicar Ciclo" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Autoavaliação</TableHead>
                  <TableHead>Avaliação Gestor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avaliacoes.map((avaliacao) => {
                  const autoStatus = statusConfig[avaliacao.status_autoavaliacao];
                  const gestorStatus = statusConfig[avaliacao.status_avaliacao_gestor];
                  const linkAuto = avaliacao.links?.find(l => l.tipo === 'autoavaliacao');
                  const linkGestor = avaliacao.links?.find(l => l.tipo === 'gestor');

                  return (
                    <TableRow key={avaliacao.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{avaliacao.colaborador?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{avaliacao.colaborador?.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>{avaliacao.gestor?.full_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={autoStatus.className} variant="outline">
                            {autoStatus.icon}
                            <span className="ml-1">{autoStatus.label}</span>
                          </Badge>
                          {linkAuto && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => copyLink(linkAuto.token, 'autoavaliacao')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copiar link (token: {getTokenPreview(linkAuto.token)})</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => handleRegenerateLink(avaliacao.id, 'autoavaliacao')}
                                    disabled={regenerateLinkMutation.isPending}
                                  >
                                    <RefreshCw className={`h-3 w-3 ${regenerateLinkMutation.isPending ? 'animate-spin' : ''}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Regenerar link</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={gestorStatus.className} variant="outline">
                            {gestorStatus.icon}
                            <span className="ml-1">{gestorStatus.label}</span>
                          </Badge>
                          {linkGestor && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => copyLink(linkGestor.token, 'gestor')}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copiar link (token: {getTokenPreview(linkGestor.token)})</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7"
                                    onClick={() => handleRegenerateLink(avaliacao.id, 'gestor')}
                                    disabled={regenerateLinkMutation.isPending}
                                  >
                                    <RefreshCw className={`h-3 w-3 ${regenerateLinkMutation.isPending ? 'animate-spin' : ''}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Regenerar link</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação excluirá a avaliação de {avaliacao.colaborador?.full_name} e todas as respostas associadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(avaliacao.id)} 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AplicarCicloDialog
        open={aplicarDialogOpen}
        onOpenChange={setAplicarDialogOpen}
        cicloId={ciclo.id}
        cicloNome={ciclo.nome_ciclo}
      />
    </div>
  );
}
