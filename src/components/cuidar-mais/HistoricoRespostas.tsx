import { useState } from "react";
import { MessageCircle, Mail, Calendar, User, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuestionariosCuidarPlus } from "@/hooks/useCuidarMaisQuestionarios";
import { useColaboradoresContato, useEstatisticasCuidarPlus } from "@/hooks/useCuidarMaisRespostas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function HistoricoRespostas() {
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<string>("");
  
  const { data: questionarios } = useQuestionariosCuidarPlus();
  const { data: colaboradoresContato, isLoading } = useColaboradoresContato(
    selectedQuestionarioId || null
  );
  const { data: estatisticas } = useEstatisticasCuidarPlus(selectedQuestionarioId || null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Colaboradores que Solicitaram Contato
          </CardTitle>
          <CardDescription>
            Visualize os colaboradores que optaram por ser contatados sobre suas respostas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedQuestionarioId} onValueChange={setSelectedQuestionarioId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecione um questionário..." />
            </SelectTrigger>
            <SelectContent>
              {questionarios?.map(q => (
                <SelectItem key={q.id} value={q.id}>
                  {q.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedQuestionarioId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Privacidade</AlertTitle>
              <AlertDescription>
                Apenas colaboradores que marcaram "Desejo ser contatado(a)" são listados aqui. 
                As demais respostas permanecem completamente anônimas.
              </AlertDescription>
            </Alert>
          )}

          {selectedQuestionarioId && estatisticas && (
            <div className="grid gap-4 md:grid-cols-3 py-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <User className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Responderam</p>
                  <p className="text-xl font-bold">{estatisticas.total_respondidos}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <MessageCircle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Querem Contato</p>
                  <p className="text-xl font-bold">{estatisticas.solicitacoes_contato}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <AlertCircle className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Respostas Anônimas</p>
                  <p className="text-xl font-bold">
                    {estatisticas.total_respondidos - estatisticas.solicitacoes_contato}
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedQuestionarioId && (
            isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : colaboradoresContato && colaboradoresContato.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Data do Envio</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradoresContato.map((colaborador) => (
                    <TableRow key={colaborador.colaborador_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{colaborador.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${colaborador.corporate_email}`}
                            className="text-primary hover:underline"
                          >
                            {colaborador.corporate_email}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(colaborador.submitted_at), "dd/MM/yyyy 'às' HH:mm", { 
                            locale: ptBR 
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Aguardando contato
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma solicitação de contato</p>
                <p className="text-sm">
                  Nenhum colaborador optou por ser contatado neste questionário
                </p>
              </div>
            )
          )}

          {!selectedQuestionarioId && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Selecione um questionário para visualizar o histórico</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
