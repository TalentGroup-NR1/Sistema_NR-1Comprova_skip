import { useState } from "react";
import { Link, Copy, Users, Loader2, Send, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useEnviosCuidarPlus, 
  useBulkCreateEnviosCuidarPlus 
} from "@/hooks/useCuidarMaisQuestionarios";
import { useColaboradores } from "@/hooks/useColaboradores";
import { getShareBaseUrl } from '@/lib/appUrl';

interface EnviosTabProps {
  questionarioId: string;
}

export function EnviosTab({ questionarioId }: EnviosTabProps) {
  const [showEnviarDialog, setShowEnviarDialog] = useState(false);
  const [selectedColaboradores, setSelectedColaboradores] = useState<string[]>([]);

  const { data: envios = [], isLoading: loadingEnvios } = useEnviosCuidarPlus(questionarioId);
  const { data: colaboradores = [], isLoading: loadingColaboradores } = useColaboradores();
  const bulkCreate = useBulkCreateEnviosCuidarPlus();

  // Stats
  const totalEnvios = envios.length;
  const respondidos = envios.filter(e => e.status === 'RESPONDIDO').length;
  const pendentes = envios.filter(e => e.status === 'PENDENTE').length;
  const progresso = totalEnvios > 0 ? (respondidos / totalEnvios) * 100 : 0;

  // Colaboradores que ainda não receberam o questionário
  const enviados = new Set(envios.map(e => e.colaborador_id));
  const colaboradoresDisponiveis = colaboradores.filter(c => !enviados.has(c.id) && c.status === 'ativo');

  const handleCopyLink = (token: string) => {
    const baseUrl = getShareBaseUrl();
    const link = `${baseUrl}/cuidar-mais/responder/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência");
  };

  const handleEnviar = async () => {
    if (selectedColaboradores.length === 0) {
      toast.error("Selecione pelo menos um colaborador");
      return;
    }

    try {
      await bulkCreate.mutateAsync({
        questionario_id: questionarioId,
        colaborador_ids: selectedColaboradores,
      });
      setShowEnviarDialog(false);
      setSelectedColaboradores([]);
    } catch (error) {
      // Error handled by hook
    }
  };

  const toggleColaborador = (id: string) => {
    setSelectedColaboradores(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedColaboradores.length === colaboradoresDisponiveis.length) {
      setSelectedColaboradores([]);
    } else {
      setSelectedColaboradores(colaboradoresDisponiveis.map(c => c.id));
    }
  };

  if (loadingEnvios) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>Carregando envios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header com botão de enviar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Envios do Questionário
                </CardTitle>
                <CardDescription className="mt-1">
                  Gere links únicos e acompanhe as respostas dos colaboradores.
                </CardDescription>
              </div>
              <Button onClick={() => setShowEnviarDialog(true)}>
                <Send className="h-4 w-4 mr-2" />
                Enviar para Colaboradores
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progresso */}
            {totalEnvios > 0 && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progresso de Respostas</span>
                  <span className="text-sm text-muted-foreground">
                    {respondidos} de {totalEnvios} ({progresso.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={progresso} className="h-2" />
                <div className="flex gap-6 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {respondidos} respondidos
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-amber-500" />
                    {pendentes} pendentes
                  </span>
                </div>
              </div>
            )}

            {/* Tabela de envios */}
            {envios.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-lg">Nenhum envio ainda</p>
                <p className="text-sm mt-1 mb-4">
                  Clique em "Enviar para Colaboradores" para gerar links.
                </p>
                <Button onClick={() => setShowEnviarDialog(true)}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Colaboradores
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead>Respondido em</TableHead>
                    <TableHead className="w-[100px]">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envios.map((envio) => (
                    <TableRow key={envio.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{envio.colaboradores?.full_name || '-'}</p>
                          <p className="text-xs text-muted-foreground">
                            {envio.colaboradores?.corporate_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={envio.status === 'RESPONDIDO' ? 'default' : 'secondary'}>
                          {envio.status === 'RESPONDIDO' ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Respondido</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(envio.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {envio.responded_at 
                          ? format(new Date(envio.responded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleCopyLink(envio.token)}
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const baseUrl = getShareBaseUrl();
                              window.open(`${baseUrl}/cuidar-mais/responder/${envio.token}`, '_blank');
                            }}
                            title="Abrir link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para selecionar colaboradores */}
      <Dialog open={showEnviarDialog} onOpenChange={setShowEnviarDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Questionário</DialogTitle>
            <DialogDescription>
              Selecione os colaboradores que receberão o questionário.
              Um link único será gerado para cada um.
            </DialogDescription>
          </DialogHeader>

          {loadingColaboradores ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando colaboradores...</p>
            </div>
          ) : colaboradoresDisponiveis.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Todos os colaboradores já receberam</p>
              <p className="text-sm">Não há colaboradores disponíveis para envio.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedColaboradores.length === colaboradoresDisponiveis.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">Selecionar todos</span>
                </div>
                <Badge variant="secondary">
                  {selectedColaboradores.length} selecionado(s)
                </Badge>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {colaboradoresDisponiveis.map((colaborador) => (
                    <div 
                      key={colaborador.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleColaborador(colaborador.id)}
                    >
                      <Checkbox
                        checked={selectedColaboradores.includes(colaborador.id)}
                        onCheckedChange={() => toggleColaborador(colaborador.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{colaborador.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {colaborador.corporate_email}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {colaborador.department}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnviarDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviar}
              disabled={selectedColaboradores.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar ({selectedColaboradores.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
