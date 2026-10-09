import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ShieldAlert, LayoutDashboard, Users, Heart, GraduationCap, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompanyContext } from "@/contexts/CompanyContext";

const AVAILABLE_MODULES = [
  { key: "/colaboradores", label: "Colaboradores", icon: Users },
  { key: "/ferias", label: "Férias", icon: LayoutDashboard },
  { key: "/minhas-ferias", label: "Minhas Férias", icon: LayoutDashboard },
  { key: "/demissoes", label: "Demissões", icon: Users },
  { key: "/beneficios", label: "Benefícios", icon: Heart },
  { key: "/minhas-tarefas", label: "Minhas Tarefas", icon: LayoutDashboard },
  { key: "/comunicados", label: "Comunicados", icon: LayoutDashboard },
  { key: "/diario-bordo", label: "Diário de Bordo", icon: LayoutDashboard },
  { key: "/avaliacoes", label: "Avaliação de Desempenho", icon: LayoutDashboard },
  { key: "/feedback-gestao", label: "Feedback", icon: LayoutDashboard },
  { key: "/treinamentos", label: "Treinamento", icon: GraduationCap },
  { key: "/cuidar-mais", label: "Cuidar+", icon: Heart },
  { key: "/mapa-riscos-nr1", label: "Mapa de Riscos NR1", icon: ShieldAlert },
  { key: "/estrutura-organizacional", label: "Estrutura Organizacional", icon: LayoutDashboard },
  { key: "/relatorios-executivos", label: "Relatórios Executivos", icon: LayoutDashboard },
  { key: "/denuncias", label: "Fale Conosco", icon: ShieldAlert },
  { key: "/comportamentos-ofensivos", label: "Comportamentos Ofensivos", icon: ShieldAlert },
];

const ROLES = [
  { value: "analista_rh", label: "Analista RH" },
  { value: "gestor_departamento", label: "Gestor" },
  { value: "colaborador", label: "Colaborador" },
];

export function RolePermissionsTab() {
  const [selectedRole, setSelectedRole] = useState("colaborador");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { selectedCompanyId } = useCompanyContext();

  const loadPermissions = async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("module_visibility")
      .select("module_key, visible")
      .eq("company_id", selectedCompanyId)
      .eq("role", selectedRole);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar permissões" });
    } else {
      const perms: Record<string, boolean> = {};
      data?.forEach(d => {
        perms[d.module_key] = d.visible;
      });
      setPermissions(perms);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadPermissions();
  }, [selectedRole, selectedCompanyId]);

  const handleToggle = (moduleKey: string, checked: boolean) => {
    setPermissions(prev => ({ ...prev, [moduleKey]: checked }));
  };

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setIsLoading(true);

    const upserts = AVAILABLE_MODULES.map(mod => {
      // If undefined in state, it means we haven't touched it. 
      // But we save the current state explicitly.
      const visible = permissions[mod.key] ?? true;
      return {
        company_id: selectedCompanyId,
        role: selectedRole,
        module_key: mod.key,
        visible,
      };
    });

    const { error } = await supabase
      .from("module_visibility")
      .upsert(upserts, { onConflict: "company_id,role,module_key" });

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar permissões" });
    } else {
      toast({ title: "Sucesso", description: "Permissões salvas com sucesso!" });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Visibilidade de Módulos (Frontend)
          </CardTitle>
          <CardDescription>
            Configure quais módulos aparecem no menu para cada perfil. 
            Nota: Admins veem tudo. A lógica de permissão de backend se mantém intacta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-[200px]">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AVAILABLE_MODULES.map(mod => {
              const Icon = mod.icon;
              const isVisible = permissions[mod.key] ?? true; // fallback default true
              return (
                <div key={mod.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{mod.label}</p>
                      <p className="text-xs text-muted-foreground">{mod.key}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={isVisible} 
                    onCheckedChange={(c) => handleToggle(mod.key, c)} 
                    disabled={isLoading}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
