import { useState } from "react";
import { Download, Search, Filter, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTreinamentos } from "@/hooks/useTreinamentos";
import { useProgressoRelatorio, ConclusaoStatus } from "@/hooks/useTreinamentoProgresso";
import { useColaboradores } from "@/hooks/useColaboradores";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<ConclusaoStatus, { label: string; className: string }> = {
  nao_iniciado: { label: "Não Iniciado", className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em Andamento", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  apto_concluir: { label: "Apto para Concluir", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

export function TreinamentosRelatorios() {
  const [treinamentoFilter, setTreinamentoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departamentoFilter, setDepartamentoFilter] = useState<string>("all");
  const [searchColaborador, setSearchColaborador] = useState("");

  const { data: treinamentos } = useTreinamentos();
  const { data: colaboradores } = useColaboradores();
  const { data: progressos, isLoading } = useProgressoRelatorio({
    treinamentoId: treinamentoFilter !== "all" ? treinamentoFilter : undefined,
    status: statusFilter !== "all" ? statusFilter as ConclusaoStatus : undefined,
    departamento: departamentoFilter !== "all" ? departamentoFilter : undefined,
  });

  const departamentos = [...new Set(colaboradores?.map(c => c.department).filter(Boolean))];

  const filteredProgressos = progressos?.filter((p: any) => {
    if (!searchColaborador) return true;
    return p.colaborador?.full_name?.toLowerCase().includes(searchColaborador.toLowerCase());
  });

  const handleExportCSV = () => {
    if (!filteredProgressos?.length) return;

    const headers = ["Colaborador", "Departamento", "Treinamento", "Status", "Tempo (min)", "Quiz Nota", "Quiz Aprovado", "Termo Aceito", "Data Conclusão"];
    const rows = filteredProgressos.map((p: any) => [
      p.colaborador?.full_name || "",
      p.colaborador?.department || "",
      p.treinamento?.titulo || "",
      statusConfig[p.status as ConclusaoStatus]?.label || p.status,
      p.tempo_total_minutos || 0,
      p.quiz_melhor_nota || "-",
      p.quiz_aprovado ? "Sim" : "Não",
      p.termo_aceito ? "Sim" : "Não",
      p.concluido_em ? format(new Date(p.concluido_em), "dd/MM/yyyy HH:mm") : "-",
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_treinamentos_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Relatórios de Treinamento
              </CardTitle>
              <CardDescription>
                Acompanhe o progresso e evidências de conclusão dos colaboradores
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleExportCSV} disabled={!filteredProgressos?.length}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchColaborador}
                onChange={(e) => setSearchColaborador(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={treinamentoFilter} onValueChange={setTreinamentoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Treinamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os treinamentos</SelectItem>
                {treinamentos?.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="apto_concluir">Apto para Concluir</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departamentos.map(d => (
                  <SelectItem key={d} value={d!}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filteredProgressos?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Treinamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Termo</TableHead>
                  <TableHead>Data Conclusão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProgressos.map((p: any) => {
                  const statusInfo = statusConfig[p.status as ConclusaoStatus];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.colaborador?.full_name || "—"}
                      </TableCell>
                      <TableCell>{p.colaborador?.department || "—"}</TableCell>
                      <TableCell>{p.treinamento?.titulo || "—"}</TableCell>
                      <TableCell>
                        <Badge className={statusInfo?.className} variant="outline">
                          {statusInfo?.label || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.tempo_total_minutos || 0} min</TableCell>
                      <TableCell>
                        {p.quiz_melhor_nota !== null ? (
                          <span className={p.quiz_aprovado ? "text-green-600" : "text-red-600"}>
                            {p.quiz_melhor_nota}% ({p.quiz_tentativas}x)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.termo_aceito ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">Aceito</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.concluido_em 
                          ? format(new Date(p.concluido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "—"
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
