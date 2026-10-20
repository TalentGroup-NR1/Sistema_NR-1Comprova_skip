import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Search,
  Users,
  UserCheck,
  UserX,
  Plus,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUsers, useUserStats } from "@/hooks/useUsers";
import { useColaboradoresPendentes } from "@/hooks/useColaboradoresPendentes";
import { UserTable } from "@/components/users/UserTable";
import { UserForm } from "@/components/users/UserForm";
import { PendingColaboradoresTable } from "@/components/users/PendingColaboradoresTable";

export default function GerenciamentoAcessos() {
  const { isAdminMaster, isAdminEmpresa } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: pendingColaboradores } = useColaboradoresPendentes();
  const stats = useUserStats();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("usuarios");

  const filteredUsers = users?.filter(user =>
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  ) || [];

  const pendingCount = pendingColaboradores?.length || 0;

  // Only admin_master and admin_empresa can access this page
  if (!isAdminMaster && !isAdminEmpresa) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </MainLayout>
    );
  }

  const pageTitle = isAdminMaster 
    ? "Gerenciamento Global de Acessos" 
    : "Gerenciar Usuários da Empresa";

  const pageSubtitle = isAdminMaster
    ? "Controle de usuários e permissões de todas as empresas"
    : "Gerencie os usuários da sua empresa";

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              {pageTitle}
            </h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
          </div>
          {isAdminMaster && (
            <Button 
              className="gradient-primary text-primary-foreground shadow-md"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Usuários</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <UserX className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="pendentes" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Pendentes</span>
                {pendingCount > 0 && (
                  <Badge variant="warning" className="ml-1 h-5 min-w-[20px] px-1.5">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="usuarios" className="mt-6 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Table */}
            <Card className="shadow-card">
              <UserTable users={filteredUsers} isLoading={isLoading} />
            </Card>
          </TabsContent>

          <TabsContent value="pendentes" className="mt-6 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaboradores pendentes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Pending Table */}
            <Card className="shadow-card">
              <PendingColaboradoresTable searchTerm={searchTerm} />
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Form Dialog */}
        <UserForm 
          open={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
        />
      </div>
    </MainLayout>
  );
}
