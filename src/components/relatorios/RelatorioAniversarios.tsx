import { useState, useMemo } from "react";
import { useColaboradores } from "@/hooks/useColaboradores";
import { Button } from "@/components/ui/button";
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
import { FileSpreadsheet, Cake } from "lucide-react";
import { format, getMonth, parseISO, isToday, getDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/lib/exportUtils";

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function RelatorioAniversarios() {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [departmentFilter, setDepartmentFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: colaboradores = [], isLoading } = useColaboradores();

  // Only active collaborators
  const activeColaboradores = useMemo(() => {
    return colaboradores.filter(c => c.status !== "DESLIGADO");
  }, [colaboradores]);

  // Get unique departments
  const departments = useMemo(() => {
    const depts = new Set(activeColaboradores.map(c => c.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [activeColaboradores]);

  // Filter by month and department
  const aniversariantes = useMemo(() => {
    return activeColaboradores
      .filter(colab => {
        if (!colab.birth_date) return false;
        
        const birthDate = parseISO(colab.birth_date);
        const birthMonth = getMonth(birthDate) + 1;
        
        const matchesMonth = selectedMonth === "todos" || birthMonth.toString() === selectedMonth;
        const matchesDepartment = departmentFilter === "todos" || colab.department === departmentFilter;
        
        return matchesMonth && matchesDepartment;
      })
      .map(colab => {
        const birthDate = parseISO(colab.birth_date!);
        const today = new Date();
        const birthDayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const isThisMonth = getMonth(birthDate) === today.getMonth();
        const isBirthdayToday = isThisMonth && getDate(birthDate) === getDate(today);
        
        return {
          ...colab,
          birthDate,
          dayOfMonth: getDate(birthDate),
          isThisMonth,
          isBirthdayToday,
        };
      })
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [activeColaboradores, selectedMonth, departmentFilter]);

  // Pagination
  const totalPages = Math.ceil(aniversariantes.length / itemsPerPage);
  const paginatedAniversariantes = aniversariantes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const data = aniversariantes.map(colab => ({
      Nome: colab.full_name,
      "Data de Nascimento": format(colab.birthDate, "dd/MM/yyyy"),
      Cargo: colab.job_title || "Não informado",
      Departamento: colab.department || "Não informado",
    }));
    
    const monthName = selectedMonth === "todos" ? "todos" : monthNames[parseInt(selectedMonth) - 1];
    exportToExcel(data, `relatorio_aniversarios_${monthName.toLowerCase()}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {monthNames.map((month, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
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
        </div>
        <Button onClick={handleExport} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{aniversariantes.length} aniversariantes encontrados</Badge>
      </div>

      {/* Table */}
      {aniversariantes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Cake className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum aniversariante encontrado para o período selecionado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAniversariantes.map((colab) => (
                  <TableRow 
                    key={colab.id}
                    className={colab.isBirthdayToday ? "bg-amber-50 dark:bg-amber-900/20" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {colab.full_name}
                        {colab.isBirthdayToday && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            <Cake className="h-3 w-3 mr-1" />
                            Hoje!
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {format(colab.birthDate, "dd/MM/yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>{colab.job_title || "Não informado"}</TableCell>
                    <TableCell>{colab.department || "Não informado"}</TableCell>
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
