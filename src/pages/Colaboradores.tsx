import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Plus, Filter, Download, Upload } from "lucide-react";
import { ColaboradorTable } from "@/components/colaboradores/ColaboradorTable";
import { ColaboradorForm } from "@/components/colaboradores/ColaboradorForm";
import { ImportarColaboradoresDialog } from "@/components/colaboradores/ImportarColaboradoresDialog";
import { downloadTemplateColaboradores } from "@/lib/importacaoColaboradores";
import {
  useColaboradores,
  useColaborador,
  useCreateColaborador,
  useUpdateColaborador,
  useDeleteColaborador,
  type Colaborador,
} from "@/hooks/useColaboradores";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import type { ColaboradorFormData } from "@/lib/validators/colaborador";

const Colaboradores = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [departmentFilter, setDepartmentFilter] = useState<string>("todos");
  const [vinculoFilter, setVinculoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [viewingColaboradorId, setViewingColaboradorId] = useState<string | null>(null);

  const { isAdminMaster, isAdminEmpresa, role, activeRole } = useAuth();
  const currentRole = activeRole ?? role;
  const isGestor = currentRole === 'gestor_departamento';
  const effectiveCompanyId = useEffectiveCompanyId();
  const { data: colaboradores = [], isLoading } = useColaboradores();
  const { data: colaboradorDetails } = useColaborador(viewingColaboradorId);
  const createColaborador = useCreateColaborador();
  const updateColaborador = useUpdateColaborador();
  const deleteColaborador = useDeleteColaborador();

  // Check if user can manage colaboradores: apenas Admin Master (com empresa selecionada), Admin Empresa e Administrador Operacional
  const canManage = (isAdminMaster && !!effectiveCompanyId) || isAdminEmpresa || currentRole === 'analista_rh';

  // Extract unique departments and vínculos values for filters
  const departments = [...new Set(colaboradores.map(c => c.department).filter(Boolean))].sort();
  const vinculos = [...new Set(colaboradores.map(c => c.contract_type).filter(Boolean) as string[])].sort();

  const filteredColaboradores = colaboradores.filter((colab) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (colab.full_name?.toLowerCase() ?? "").includes(term) ||
      (colab.corporate_email?.toLowerCase() ?? "").includes(term) ||
      (colab.job_title?.toLowerCase() ?? "").includes(term) ||
      (colab.department?.toLowerCase() ?? "").includes(term);
    const matchesStatus = statusFilter === "todos" || colab.status === statusFilter;
    const matchesDepartment = departmentFilter === "todos" || colab.department === departmentFilter;
    const matchesVinculo = vinculoFilter === "todos" || colab.contract_type === vinculoFilter;
    return matchesSearch && matchesStatus && matchesDepartment && matchesVinculo;
  });

  const handleOpenForm = (colaborador?: Colaborador) => {
    if (colaborador) {
      setViewingColaboradorId(colaborador.id);
      setSelectedColaborador(colaborador);
    } else {
      setViewingColaboradorId(null);
      setSelectedColaborador(null);
    }
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedColaborador(null);
    setViewingColaboradorId(null);
  };

  const handleSubmit = async (data: ColaboradorFormData) => {
    if (selectedColaborador) {
      await updateColaborador.mutateAsync({ id: selectedColaborador.id, data });
    } else {
      await createColaborador.mutateAsync(data);
    }
    handleCloseForm();
  };

  const handleView = (colaborador: Colaborador) => {
    setViewingColaboradorId(colaborador.id);
    setSelectedColaborador(colaborador);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteColaborador.mutate(id);
  };

  // Use loaded details if available
  const colaboradorForForm = viewingColaboradorId && colaboradorDetails
    ? colaboradorDetails
    : selectedColaborador;

  return (
    <MainLayout>
      <Card className="shadow-card animate-fade-up">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="secondary" className="font-normal">
              {filteredColaboradores.length} encontrados
            </Badge>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, cargo ou departamento..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativos</SelectItem>
                  <SelectItem value="FERIAS">Férias</SelectItem>
                  <SelectItem value="LICENCA">Licença</SelectItem>
                  <SelectItem value="DESLIGADO">Desligados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Deptos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={vinculoFilter} onValueChange={setVinculoFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Vínculos</SelectItem>
                  {vinculos.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted/50 transition-colors"
                    onClick={downloadTemplateColaboradores}
                    title="Baixar modelo de planilha CSV para importação"
                  >
                    <Download className="h-4 w-4 mr-2 text-muted-foreground" />
                    Baixar Modelo
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Planilha
                  </Button>
                  <Button
                    className="gradient-primary text-primary-foreground shadow-md hover:shadow-lg transition-shadow"
                    onClick={() => handleOpenForm()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Colaborador
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ColaboradorTable
            colaboradores={filteredColaboradores}
            isLoading={isLoading}
            onEdit={handleOpenForm}
            onView={handleView}
            onDelete={handleDelete}
            onNovo={canManage ? () => handleOpenForm() : undefined}
          />
        </CardContent>

      </Card>

      <ColaboradorForm
        open={formOpen}
        onOpenChange={handleCloseForm}
        colaborador={colaboradorForForm}
        onSubmit={handleSubmit}
        isSubmitting={createColaborador.isPending || updateColaborador.isPending}
      />

      <ImportarColaboradoresDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </MainLayout>
  );
};

export default Colaboradores;
