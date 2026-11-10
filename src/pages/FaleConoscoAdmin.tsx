import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MessageSquareText,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  User,
  Clock,
  Archive,
} from "lucide-react";
import {
  FaleConoscoAdminItem,
  FaleConoscoItemTipo,
  FaleConoscoStatus,
  useFaleConoscoAdmin,
  useResponderFaleConosco,
} from "@/hooks/useFaleConosco";

const STATUS_LABEL: Record<FaleConoscoStatus, string> = {
  recebido: "Recebido",
  em_analise: "Em análise",
  respondido: "Respondido",
  arquivado: "Arquivado",
};

const STATUS_VARIANT: Record<FaleConoscoStatus, "default" | "secondary" | "outline"> = {
  recebido: "secondary",
  em_analise: "default",
  respondido: "outline",
  arquivado: "outline",
};

export default function FaleConoscoAdmin() {
  const [statusFiltro, setStatusFiltro] = useState<FaleConoscoStatus | "todos">("todos");
  const [tipoFiltro, setTipoFiltro] = useState<FaleConoscoItemTipo | "todos">("todos");
  const [selectedItem, setSelectedItem] = useState<FaleConoscoAdminItem | null>(null);

  const [respostaTexto, setRespostaTexto] = useState("");
  const [novoStatus, setNovoStatus] = useState<FaleConoscoStatus>("respondido");

  const { data, isLoading } = useFaleConoscoAdmin(statusFiltro);
  const responder = useResponderFaleConosco();

  const lista = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => {
      if (tipoFiltro !== "todos" && item.tipo !== tipoFiltro) return false;
      return true;
    });
  }, [data, tipoFiltro]);

  const handleOpenDetail = (item: FaleConoscoAdminItem) => {
    setSelectedItem(item);
    setRespostaTexto(item.resposta || "");
    setNovoStatus(item.status === "recebido" ? "respondido" : item.status);
  };

  const handleSalvarResposta = async () => {
    if (!selectedItem) return;
    const txt = respostaTexto.trim();
    if (txt.length < 10) {
      toast.error("A resposta deve conter no mínimo 10 caracteres.");
      return;
    }

    try {
      await responder.mutateAsync({
        id: selectedItem.id,
        resposta: txt,
        status: novoStatus,
      });
      setSelectedItem(null);
    } catch {
      // toast disparado no hook
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <MessageSquareText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestão do Fale Conosco</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhamento e resposta às sugestões e dúvidas operacionais enviadas pelos colaboradores ao RH.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Mensagens Recebidas</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as any)}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue placeholder="Tipo de mensagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="sugestao">Sugestões</SelectItem>
                  <SelectItem value="duvida">Dúvidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="respondido">Respondido</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lista.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma mensagem encontrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((item) => {
                    const isSugestao = item.tipo === "sugestao";
                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => handleOpenDetail(item)}
                      >
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 text-[11px] font-normal ${
                              isSugestao
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300"
                            }`}
                          >
                            {isSugestao ? (
                              <Lightbulb className="h-3 w-3" />
                            ) : (
                              <HelpCircle className="h-3 w-3" />
                            )}
                            {isSugestao ? "Sugestão" : "Dúvida"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-xs max-w-xs truncate">
                          {item.titulo}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.anonimo ? (
                            <Badge variant="outline" className="gap-1 text-[11px] text-muted-foreground">
                              <Lock className="h-3 w-3" />
                              Anônimo
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1.5 font-medium">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span>{item.autor_nome || "Colaborador"}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[item.status]} className="text-xs">
                            {STATUS_LABEL[item.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Ver detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhe e Resposta */}
        {selectedItem && (
          <Dialog open={!!selectedItem} onOpenChange={(o) => !o && setSelectedItem(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-lg">{selectedItem.titulo}</DialogTitle>
                    <DialogDescription className="text-xs">
                      Enviada em{" "}
                      {format(new Date(selectedItem.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </DialogDescription>
                  </div>
                  <Badge variant={STATUS_VARIANT[selectedItem.status]}>
                    {STATUS_LABEL[selectedItem.status]}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant="outline">
                    {selectedItem.tipo === "sugestao" ? "Sugestão" : "Dúvida"}
                  </Badge>
                  {selectedItem.anonimo ? (
                    <Badge variant="secondary" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Remetente Anônimo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <User className="h-3 w-3 text-primary" />
                      {selectedItem.autor_nome || "Colaborador"}
                    </Badge>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Mensagem do Colaborador
                  </Label>
                  <div className="mt-1 rounded-lg border bg-muted/30 p-3.5 text-xs leading-relaxed whitespace-pre-wrap">
                    {selectedItem.mensagem}
                  </div>
                </div>

                {/* Alerta caso mensagem seja anônima */}
                {selectedItem.anonimo && (
                  <Alert className="border-amber-400 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-xs font-semibold">Sem canal de retorno direto</AlertTitle>
                    <AlertDescription className="text-xs leading-relaxed mt-0.5">
                      Esta mensagem foi enviada de forma anônima. Sua resposta não será entregue a um usuário específico, mas permanecerá registrada neste painel para fins de histórico e prestação de contas.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="fc-resposta" className="text-xs font-semibold uppercase">
                      Resposta do RH
                    </Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="fc-novo-status" className="text-xs text-muted-foreground">
                        Status:
                      </Label>
                      <Select
                        value={novoStatus}
                        onValueChange={(v) => setNovoStatus(v as FaleConoscoStatus)}
                      >
                        <SelectTrigger id="fc-novo-status" className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_analise">Em análise</SelectItem>
                          <SelectItem value="respondido">Respondido</SelectItem>
                          <SelectItem value="arquivado">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Textarea
                    id="fc-resposta"
                    value={respostaTexto}
                    onChange={(e) => setRespostaTexto(e.target.value)}
                    placeholder="Escreva a resposta e orientações oficiais do time de RH..."
                    rows={4}
                    className="text-xs resize-y"
                  />
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>Mínimo de 10 caracteres</span>
                    <span>{respostaTexto.length}/5000</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedItem(null)}
                    className="text-xs"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={handleSalvarResposta}
                    disabled={responder.isPending || respostaTexto.trim().length < 10}
                    className="text-xs gap-1.5"
                  >
                    {responder.isPending ? "Salvando..." : "Salvar Resposta"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}

