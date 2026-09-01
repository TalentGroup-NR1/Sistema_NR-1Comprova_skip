import { useMemo, useState } from 'react';
import { addDays, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseISODate } from '@/lib/validators/colaborador';
import { Search, UserMinus, Loader2, CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useColaboradoresAtivos } from '@/hooks/useDesligamentos';
import { DesligarColaboradorDialog } from './DesligarColaboradorDialog';

interface ControleExperienciaTabProps {
  companyId: string | null;
}

type PeriodoFilter = 'all' | 'primeiro' | 'segundo' | 'urgente';

export function ControleExperienciaTab({ companyId }: ControleExperienciaTabProps) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>('all');
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: colaboradores, isLoading } = useColaboradoresAtivos(companyId);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const emExperiencia = useMemo(() => {
    if (!colaboradores) return [];
    return colaboradores
      .filter((c) => !!c.admission_date)
      .map((c) => {
        const admissao = parseISODate(c.admission_date);
        const fim1 = addDays(admissao, 45);
        const fim2 = addDays(admissao, 90);
        const diasDesdeAdmissao = differenceInDays(hoje, admissao);
        const diasRestantes1 = differenceInDays(fim1, hoje);
        const diasRestantes2 = differenceInDays(fim2, hoje);
        const periodo: 'primeiro' | 'segundo' = diasDesdeAdmissao <= 45 ? 'primeiro' : 'segundo';
        const proximoVenc = periodo === 'primeiro' ? diasRestantes1 : diasRestantes2;
        const urgente = proximoVenc >= 0 && proximoVenc <= 7;
        return {
          ...c,
          admissao,
          fim1,
          fim2,
          diasDesdeAdmissao,
          diasRestantes1,
          diasRestantes2,
          periodo,
          proximoVenc,
          urgente,
        };
      })
      .filter((c) => c.diasDesdeAdmissao >= 0 && c.diasDesdeAdmissao <= 90)
      .sort((a, b) => a.proximoVenc - b.proximoVenc);
  }, [colaboradores, hoje]);

  const departments = [...new Set(emExperiencia.map((c) => c.department).filter(Boolean))];

  const filtered = emExperiencia.filter((c) => {
    const matchesSearch =
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.job_title || '').toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'all' || c.department === departmentFilter;
    const matchesPeriodo =
      periodoFilter === 'all' ||
      (periodoFilter === 'urgente' ? c.urgente : c.periodo === periodoFilter);
    return matchesSearch && matchesDept && matchesPeriodo;
  });

  const handleDesligar = (colaborador: any) => {
    setSelectedColaborador(colaborador);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground flex gap-2">
        <CalendarClock className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Acompanhe os colaboradores dentro do período de experiência (90 dias). O 1º período
          encerra em 45 dias após a admissão e o 2º período em 90 dias. Use estas datas para
          decidir sobre renovação, efetivação ou desligamento.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodoFilter} onValueChange={(v) => setPeriodoFilter(v as PeriodoFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="primeiro">1º período (até 45d)</SelectItem>
            <SelectItem value="segundo">2º período (46 a 90d)</SelectItem>
            <SelectItem value="urgente">Vence em ≤7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum colaborador em período de experiência.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Fim 1º período (45d)</TableHead>
                <TableHead>Fim 2º período (90d)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell>{c.job_title}</TableCell>
                  <TableCell>{c.department}</TableCell>
                  <TableCell>
                    {format(c.admissao, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(c.fim1, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.diasRestantes1 >= 0
                          ? `faltam ${c.diasRestantes1}d`
                          : `vencido há ${Math.abs(c.diasRestantes1)}d`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(c.fim2, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.diasRestantes2 >= 0
                          ? `faltam ${c.diasRestantes2}d`
                          : `vencido há ${Math.abs(c.diasRestantes2)}d`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.urgente ? (
                      <Badge variant="destructive">Vence em ≤7 dias</Badge>
                    ) : c.periodo === 'primeiro' ? (
                      <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 border border-blue-500/30">
                        1º período
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30">
                        2º período
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDesligar(c)}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Desligar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DesligarColaboradorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        colaborador={selectedColaborador}
      />
    </div>
  );
}
