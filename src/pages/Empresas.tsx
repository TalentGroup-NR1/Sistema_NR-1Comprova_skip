import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, CheckCircle2, XCircle } from "lucide-react";
import { useCompanies } from "@/hooks/useCompanies";
import { CompanyTable } from "@/components/empresas/CompanyTable";
import { CompanyForm } from "@/components/empresas/CompanyForm";
import { Company } from "@/lib/validators/company";

export default function Empresas() {
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { data: companies = [], isLoading } = useCompanies();

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const inactiveCompanies = companies.filter((c) => c.status === "inactive").length;

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingCompany(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-end">
          <Button onClick={() => navigate("/cadastro-empresa")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCompanies}</div>
              <p className="text-xs text-muted-foreground">empresas cadastradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{activeCompanies}</div>
              <p className="text-xs text-muted-foreground">empresas ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inativas</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{inactiveCompanies}</div>
              <p className="text-xs text-muted-foreground">empresas inativas</p>
            </CardContent>
          </Card>
        </div>

        {/* Companies Table */}
        <CompanyTable
          companies={companies}
          isLoading={isLoading}
          onEdit={handleEdit}
        />

        {/* Form Dialog */}
        <CompanyForm
          open={formOpen}
          onOpenChange={handleOpenChange}
          company={editingCompany}
        />
      </div>
    </MainLayout>
  );
}
