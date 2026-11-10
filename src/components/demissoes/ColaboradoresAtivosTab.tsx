import { useState } from 'react';
import { format } from 'date-fns';
import { parseISODate } from '@/lib/validators/colaborador';
import { ptBR } from 'date-fns/locale';
import { Search, UserMinus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

interface ColaboradoresAtivosTabProps {
  companyId: string | null;
}

export function ColaboradoresAtivosTab({ companyId }: ColaboradoresAtivosTabProps) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: colaboradores, isLoading } = useColaboradoresAtivos(companyId);

  const departments = [...new Set(colaboradores?.map((c) => c.department) || [])];

  const filteredColaboradores = colaboradores?.filter((colaborador) => {
    const matchesSearch =
      colaborador.full_name.toLowerCase().includes(search.toLowerCase()) ||
      colaborador.job_title.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      departmentFilter === 'all' || colaborador.department === departmentFilter;
    return matchesSearch && matchesDepartment;
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
      </div>

      {filteredColaboradores?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum colaborador encontrado.
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredColaboradores?.map((colaborador) => (
                <TableRow key={colaborador.id}>
                  <TableCell className="font-medium">
                    {colaborador.full_name}
                  </TableCell>
                  <TableCell>{colaborador.job_title}</TableCell>
                  <TableCell>{colaborador.department}</TableCell>
                  <TableCell>
                    {format(parseISODate(colaborador.admission_date), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDesligar(colaborador)}
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
