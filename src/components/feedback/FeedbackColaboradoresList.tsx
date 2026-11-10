import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, User } from 'lucide-react';
import { useColaboradoresParaFeedback, StatusFilter } from '@/hooks/useFeedbacksColaboradores';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FeedbackColaboradoresListProps {
  onSelectColaborador: (id: string) => void;
}

export function FeedbackColaboradoresList({ onSelectColaborador }: FeedbackColaboradoresListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ATIVO');
  const { data: colaboradores, isLoading } = useColaboradoresParaFeedback(statusFilter);
  
  const isHistorico = statusFilter === 'DESLIGADO';

  const filteredColaboradores = colaboradores?.filter((colab) =>
    colab.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colab.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colab.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Colaboradores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Registro de Feedbacks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="mb-4">
          <TabsList>
            <TabsTrigger value="ATIVO">Ativos</TabsTrigger>
            <TabsTrigger value="DESLIGADO">Histórico</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cargo ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead className="text-center">Feedbacks</TableHead>
                <TableHead>Último Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredColaboradores?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {isHistorico 
                      ? 'Nenhum colaborador desligado encontrado' 
                      : 'Nenhum colaborador encontrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredColaboradores?.map((colab) => (
                  <TableRow
                    key={colab.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelectColaborador(colab.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{colab.full_name}</span>
                          {isHistorico && (
                            <Badge variant="secondary" className="text-xs">
                              Desligado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{colab.job_title}</TableCell>
                    <TableCell>{colab.department}</TableCell>
                    <TableCell>{colab.manager_name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={colab.feedbacks_count && colab.feedbacks_count > 0 ? 'default' : 'secondary'}>
                        {colab.feedbacks_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {colab.ultimo_feedback
                        ? format(new Date(colab.ultimo_feedback), "dd/MM/yyyy", { locale: ptBR })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
