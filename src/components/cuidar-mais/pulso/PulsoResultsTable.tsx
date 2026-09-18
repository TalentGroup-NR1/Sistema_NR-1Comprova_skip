import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, User, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useCampaignResults, EMOJI_SCALE, CampaignResult } from "@/hooks/usePulseCampaigns";

interface PulsoResultsTableProps {
  campaignId: string | undefined;
  filters?: {
    department?: string;
    minScore?: number;
    maxScore?: number;
  };
}

const ITEMS_PER_PAGE = 20;

export function PulsoResultsTable({ campaignId, filters }: PulsoResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Fetch com paginação no servidor
  const { data: results, isLoading, isFetching } = useCampaignResults(
    campaignId, 
    filters,
    { page: currentPage, pageSize: ITEMS_PER_PAGE }
  );

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filters?.department, filters?.minScore, filters?.maxScore]);

  // Agrupar por colaborador (memoizado para performance) - DEVE estar antes de qualquer early return
  const groupedByEmployee = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const grouped = results.reduce((acc, r) => {
      const key = r.created_at + r.colaborador_nome;
      if (!acc[key]) {
        acc[key] = {
          colaborador_nome: r.colaborador_nome,
          departamento: r.departamento,
          employee_id: r.employee_id,
          created_at: r.created_at,
          responses: [] as CampaignResult[],
        };
      }
      acc[key].responses.push(r);
      return acc;
    }, {} as Record<string, {
      colaborador_nome: string;
      departamento: string;
      employee_id: string;
      created_at: string;
      responses: CampaignResult[];
    }>);
    
    return Object.values(grouped);
  }, [results]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Respostas da Campanha
          </CardTitle>
          <CardDescription>
            Visualize as respostas dos colaboradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma resposta encontrada com os filtros selecionados.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreBadge = (score: number | null) => {
    if (score === null) return null;
    const emoji = EMOJI_SCALE.find((e) => e.score === score);
    if (!emoji) return <Badge variant="secondary">{score}</Badge>;

    if (score <= 2) {
      return (
        <Badge variant="destructive" className="gap-1">
          {emoji.emoji} {score}
        </Badge>
      );
    } else if (score <= 3) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
          {emoji.emoji} {score}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
        {emoji.emoji} {score}
      </Badge>
    );
  };

  // Paginação agora é no servidor, então mostramos todos os resultados retornados
  const hasMorePages = results && results.length === ITEMS_PER_PAGE;
  const hasPrevPage = currentPage > 1;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (hasMorePages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Respostas da Campanha
              {isFetching && <Skeleton className="h-4 w-4 rounded-full" />}
            </CardTitle>
            <CardDescription>
              {groupedByEmployee.length} resultado{groupedByEmployee.length !== 1 ? 's' : ''} nesta página
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Esfera</TableHead>
              <TableHead>Respostas</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedByEmployee.map((employee, idx) => {
              const hasNegative = employee.responses.some(
                (r) => r.resposta_numerica !== null && r.resposta_numerica <= 2
              );
              // Como a esfera é gravada por resposta mas se refere à submissão (mesmo step),
              // pegamos a primeira esfera não nula do grupo, ou "-" se nenhuma.
              const esferaRaw = employee.responses.find(r => r.esfera)?.esfera;
              const esferaFormatted = esferaRaw === 'pessoal' ? 'Pessoal' 
                                    : esferaRaw === 'trabalho' ? 'Trabalho' 
                                    : '-';

              return (
                <TableRow key={idx} className={hasNegative ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.colaborador_nome}</span>
                      {hasNegative && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{employee.departamento || "-"}</TableCell>
                  <TableCell>
                    {esferaFormatted !== '-' ? (
                      <Badge variant="outline" className="font-normal bg-background">
                        {esferaFormatted}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {employee.responses.map((r, rIdx) => (
                        <span key={rIdx}>
                          {r.resposta_numerica !== null ? (
                            getScoreBadge(r.resposta_numerica)
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {r.resposta.substring(0, 20)}
                              {r.resposta.length > 20 ? "..." : ""}
                            </Badge>
                          )}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {employee.responses[0]?.comentario || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(parseISO(employee.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {(hasPrevPage || hasMorePages) && (
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} • {groupedByEmployee.length} resultados
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={!hasPrevPage || isFetching}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMorePages || isFetching}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
