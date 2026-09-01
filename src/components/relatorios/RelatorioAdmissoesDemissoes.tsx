import { useState, useMemo } from "react";
import { useColaboradores } from "@/hooks/useColaboradores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileSpreadsheet, UserPlus, UserMinus } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/lib/exportUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export function RelatorioAdmissoesDemissoes() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("todos");
  const [departmentFilter, setDepartmentFilter] = useState<string>("todos");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: colaboradores = [], isLoading } = useColaboradores();

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(colaboradores.map(c => c.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [colaboradores]);

  // Build combined list of admissions and demissions
  const movimentacoes = useMemo(() => {
    const result: Array<{
      id: string;
      nome: string;
      cargo: string;
      departamento: string;
      data: Date;
      tipo: "admissao" | "demissao";
    }> = [];

    // Add admissions
    colaboradores.forEach(colab => {
      if (colab.admission_date) {
        const admissionDate = parseISO(colab.admission_date);
        if (admissionDate.getFullYear() === parseInt(selectedYear)) {
          result.push({
            id: `adm-${colab.id}`,
            nome: colab.full_name,
            cargo: colab.job_title || "Não informado",
            departamento: colab.department || "Não informado",
            data: admissionDate,
            tipo: "admissao",
          });
        }
      }
    });

    // Add demissions from colaboradores with DESLIGADO status
    colaboradores.forEach(colab => {
      if (colab.status === "DESLIGADO" && colab.termination_date) {
        const demissionDate = parseISO(colab.termination_date);
        if (demissionDate.getFullYear() === parseInt(selectedYear)) {
          result.push({
            id: `dem-${colab.id}`,
            nome: colab.full_name,
            cargo: colab.job_title || "Não informado",
            departamento: colab.department || "Não informado",
            data: demissionDate,
            tipo: "demissao",
          });
        }
      }
    });

    return result.sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [colaboradores, selectedYear]);

  // Filter by month, department and type
  const filteredMovimentacoes = useMemo(() => {
    return movimentacoes.filter(mov => {
      const matchesMonth = selectedMonth === "todos" || 
        (mov.data.getMonth() + 1).toString() === selectedMonth;
      const matchesDepartment = departmentFilter === "todos" || 
        mov.departamento === departmentFilter;
      const matchesTipo = tipoFilter === "todos" || mov.tipo === tipoFilter;
      return matchesMonth && matchesDepartment && matchesTipo;
    });
  }, [movimentacoes, selectedMonth, departmentFilter, tipoFilter]);

  // Chart data
  const chartData = useMemo(() => {
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    return months.map((month, index) => {
      const admissoes = movimentacoes.filter(
        m => m.tipo === "admissao" && m.data.getMonth() === index
      ).length;
      const demissoes = movimentacoes.filter(
        m => m.tipo === "demissao" && m.data.getMonth() === index
      ).length;

      return { month, admissoes, demissoes };
    });
  }, [movimentacoes]);

  // Pagination
  const totalPages = Math.ceil(filteredMovimentacoes.length / itemsPerPage);
  const paginatedMovimentacoes = filteredMovimentacoes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const data = filteredMovimentacoes.map(mov => ({
      Nome: mov.nome,
      Cargo: mov.cargo,
      Departamento: mov.departamento,
      Data: format(mov.data, "dd/MM/yyyy"),
      Tipo: mov.tipo === "admissao" ? "Admissão" : "Demissão",
    }));
    
    exportToExcel(data, `relatorio_admissoes_demissoes_${selectedYear}`);
  };

  const chartConfig = {
    admissoes: {
      label: "Admissões",
      color: "hsl(var(--chart-1))",
    },
    demissoes: {
      label: "Demissões",
      color: "hsl(var(--chart-2))",
    },
  };

  // Stats
  const totalAdmissoes = filteredMovimentacoes.filter(m => m.tipo === "admissao").length;
  const totalDemissoes = filteredMovimentacoes.filter(m => m.tipo === "demissao").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              <SelectItem value="1">Janeiro</SelectItem>
              <SelectItem value="2">Fevereiro</SelectItem>
              <SelectItem value="3">Março</SelectItem>
              <SelectItem value="4">Abril</SelectItem>
              <SelectItem value="5">Maio</SelectItem>
              <SelectItem value="6">Junho</SelectItem>
              <SelectItem value="7">Julho</SelectItem>
              <SelectItem value="8">Agosto</SelectItem>
              <SelectItem value="9">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Departamentos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="admissao">Admissões</SelectItem>
              <SelectItem value="demissao">Demissões</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAdmissoes}</p>
                <p className="text-sm text-muted-foreground">Admissões</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <UserMinus className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDemissoes}</p>
                <p className="text-sm text-muted-foreground">Demissões</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Δ</span>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAdmissoes - totalDemissoes}</p>
                <p className="text-sm text-muted-foreground">Saldo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admissões vs Demissões - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="admissoes" fill="var(--color-admissoes)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="demissoes" fill="var(--color-demissoes)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{filteredMovimentacoes.length} registros encontrados</Badge>
      </div>

      {/* Table */}
      {filteredMovimentacoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma movimentação encontrada para os filtros aplicados.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMovimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="font-medium">{mov.nome}</TableCell>
                    <TableCell>{mov.cargo}</TableCell>
                    <TableCell>{mov.departamento}</TableCell>
                    <TableCell>{format(mov.data, "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge className={mov.tipo === "admissao" 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }>
                        {mov.tipo === "admissao" ? "Admissão" : "Demissão"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
