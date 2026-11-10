import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AnalisePerfilForm } from "@/components/analise-perfil/AnalisePerfilForm";
import { AnaliseResultadoCard } from "@/components/analise-perfil/AnaliseResultadoCard";
import { AnaliseHistorico } from "@/components/analise-perfil/AnaliseHistorico";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useAnalisesPerfil, type AnalisePerfil as AnaliseType } from "@/hooks/useAnalisesPerfil";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanyContext } from "@/contexts/CompanyContext";

export default function AnalisePerfil() {
  const { data: analises, isLoading } = useAnalisesPerfil();
  const [selected, setSelected] = useState<AnaliseType | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyContext();

  // Poll for processing analyses
  useEffect(() => {
    const processing = analises?.filter((a) => a.status === "processando") || [];
    if (processing.length === 0) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["analises-perfil", selectedCompanyId] });
    }, 3000);

    return () => clearInterval(interval);
  }, [analises, queryClient, selectedCompanyId]);

  // Update selected if it changed in the list, or clear if deleted
  useEffect(() => {
    if (selected && analises) {
      const updated = analises.find((a) => a.id === selected.id);
      if (!updated) {
        setSelected(null); // was deleted
      } else if (updated.status !== selected.status) {
        setSelected(updated);
      }
    }
  }, [analises, selected]);

  const handleCreated = () => {
    // Select the latest after creation
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["analises-perfil"] });
    }, 1000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">

        <div className="analise-page-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-6 no-print">
            <AnalisePerfilForm onCreated={handleCreated} />
          </div>

          {/* Right: Result */}
          <div>
            {selected ? (
              selected.status === "processando" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-6 rounded-lg border bg-card">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Analisando documentos...</p>
                      <p className="text-sm text-muted-foreground">
                        A IA está analisando os documentos. Isso pode levar alguns segundos...
                      </p>
                    </div>
                  </div>
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <AnaliseResultadoCard analise={selected} />
              )
            ) : (
              <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-sm">
                  Selecione uma análise do histórico ou crie uma nova
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="no-print">
          <h2 className="text-lg font-semibold mb-3">Histórico de Análises</h2>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <AnaliseHistorico analises={analises || []} onSelect={setSelected} selectedId={selected?.id} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
