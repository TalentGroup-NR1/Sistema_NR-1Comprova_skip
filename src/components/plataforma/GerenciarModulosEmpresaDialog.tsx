import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MODULOS_CONTRATAVEIS, ModuloContratavel } from '@/lib/modulosContrataveis';
import { useInvalidateModuleVisibility } from '@/hooks/useVisibleModules';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Boxes, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface EmpresaTarget {
  id: string;
  name: string;
  brand_name?: string | null;
}

interface GerenciarModulosEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaTarget | null;
}

interface CompanyModuleRecord {
  id?: string;
  company_id: string;
  module_key: string;
  enabled: boolean;
}

export function GerenciarModulosEmpresaDialog({
  open,
  onOpenChange,
  empresa,
}: GerenciarModulosEmpresaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidateVisibility = useInvalidateModuleVisibility();

  // Mapa local de status dos módulos: { [module_key]: boolean }
  const [modulosStatus, setModulosStatus] = useState<Record<string, boolean>>({});

  // Busca o status atual dos módulos da empresa
  const { data: dbModules, isLoading } = useQuery<CompanyModuleRecord[]>({
    queryKey: ['company_modules', empresa?.id],
    queryFn: async () => {
      if (!empresa?.id) return [];
      const { data, error } = await supabase
        .from('company_modules')
        .select('company_id, module_key, enabled')
        .eq('company_id', empresa.id);

      if (error) throw error;
      return (data || []) as CompanyModuleRecord[];
    },
    enabled: !!empresa?.id && open,
  });

  // Inicializa o estado local quando os dados da query chegarem ou modal abrir
  useEffect(() => {
    if (!open) return;

    const initialMap: Record<string, boolean> = {};

    MODULOS_CONTRATAVEIS.forEach((mod) => {
      if (mod.isBase) {
        // Colaboradores é inegociável
        initialMap[mod.key] = true;
        return;
      }

      const found = dbModules?.find((m) => m.module_key === mod.key);
      if (found) {
        initialMap[mod.key] = found.enabled;
      } else {
        // Default para novos módulos é true (modelo Solides: nasce com todos)
        initialMap[mod.key] = true;
      }
    });

    setModulosStatus(initialMap);
  }, [dbModules, open]);

  // Agrupamento por pilar
  const modulosPorPilar = useMemo(() => {
    const grupos: Record<string, ModuloContratavel[]> = {};
    MODULOS_CONTRATAVEIS.forEach((mod) => {
      if (!grupos[mod.pilar]) {
        grupos[mod.pilar] = [];
      }
      grupos[mod.pilar].push(mod);
    });
    return grupos;
  }, []);

  // Mutation para salvar alterações
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!empresa?.id) throw new Error('Empresa não selecionada');

      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;

      const payload = MODULOS_CONTRATAVEIS.map((mod) => ({
        company_id: empresa.id,
        module_key: mod.key,
        enabled: mod.isBase ? true : !!modulosStatus[mod.key],
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }));

      const { error } = await supabase
        .from('company_modules')
        .upsert(payload, { onConflict: 'company_id,module_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_modules', empresa?.id] });
      invalidateVisibility();
      toast({
        title: 'Módulos atualizados',
        description: `Módulos da empresa "${empresa?.brand_name || empresa?.name}" salvos com sucesso.`,
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar módulos',
        description: err?.message || 'Falha na comunicação com o banco.',
      });
    },
  });

  const handleToggle = (key: string, enabled: boolean) => {
    // Módulo base nunca desativa
    const mod = MODULOS_CONTRATAVEIS.find((m) => m.key === key);
    if (mod?.isBase) return;

    setModulosStatus((prev) => ({
      ...prev,
      [key]: enabled,
    }));
  };

  const handleMarcarTodos = (ativar: boolean) => {
    const novoMapa: Record<string, boolean> = {};
    MODULOS_CONTRATAVEIS.forEach((mod) => {
      novoMapa[mod.key] = mod.isBase ? true : ativar;
    });
    setModulosStatus(novoMapa);
  };

  const totalAtivos = Object.values(modulosStatus).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <DialogTitle>Gestão de Módulos Contratados</DialogTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {totalAtivos} de {MODULOS_CONTRATAVEIS.length} ativos
            </Badge>
          </div>
          <DialogDescription className="text-xs mt-1">
            Empresa:{' '}
            <strong className="text-foreground">
              {empresa?.brand_name || empresa?.name || 'Carregando...'}
            </strong>{' '}
            — Ative ou desative os módulos comerciais contratados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-6 py-2 bg-muted/40 text-xs border-b border-border">
          <span className="text-muted-foreground">
            Ações rápidas de governança:
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleMarcarTodos(true)}
            >
              Ativar Todos
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => handleMarcarTodos(false)}
            >
              Desativar Opcionais
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <span className="text-sm">Carregando módulos contratados...</span>
            </div>
          ) : (
            Object.entries(modulosPorPilar).map(([pilar, modulos]) => (
              <div key={pilar} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {pilar}
                </h4>

                <div className="space-y-2">
                  {modulos.map((mod) => {
                    const isChecked = mod.isBase ? true : !!modulosStatus[mod.key];
                    const isDisabled = mod.isBase;

                    return (
                      <div
                        key={mod.key}
                        className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-colors ${
                          isChecked
                            ? 'bg-card border-border/80'
                            : 'bg-muted/20 border-border/40 opacity-70'
                        }`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium leading-none text-foreground">
                              {mod.nome}
                            </span>
                            {mod.isBase ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20 flex items-center gap-1"
                              >
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Base Obrigatória
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">
                            {mod.descricao}
                          </p>
                          <span className="text-[10px] text-muted-foreground/80 font-mono">
                            Rota principal: {mod.rota}
                          </span>
                        </div>

                        <div className="flex items-center pt-0.5">
                          <Switch
                            id={`module-switch-${mod.key}`}
                            checked={isChecked}
                            disabled={isDisabled || saveMutation.isPending}
                            onCheckedChange={(checked) => handleToggle(mod.key, checked)}
                            aria-label={`Ativar ou desativar módulo ${mod.nome}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border flex sm:justify-between items-center gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            Empresas novas nascem com todos os módulos ativados por padrão.
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={isLoading || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
