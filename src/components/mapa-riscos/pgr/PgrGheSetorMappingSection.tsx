import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link as LinkIcon, Trash2, Users } from "lucide-react";
import { useMatrizEmpresa } from "@/hooks/useRiscosGhe";
import { useColaboradores } from "@/hooks/useColaboradores";
import { usePgrGheSetorMapping, useSavePgrGheSetorMapping, useDeletePgrGheSetorMapping } from "@/hooks/usePgrGheSetor";
import { usePgrAnaliseTurnover } from "@/hooks/usePgrInteligencia";

export function PgrGheSetorMappingSection() {
  const { data: matriz = [], isLoading: loadingMatriz } = useMatrizEmpresa();
  const { data: colaboradores = [], isLoading: loadingColab } = useColaboradores();
  const { data: mappings = [], isLoading: loadingMap } = usePgrGheSetorMapping();
  const { data: turnoverAlerts = [] } = usePgrAnaliseTurnover();
  
  const saveMapping = useSavePgrGheSetorMapping();
  const deleteMapping = useDeletePgrGheSetorMapping();

  // Extract distinct departments from HR data
  const departamentos = Array.from(new Set(colaboradores.map(c => c.department).filter(Boolean))).sort();

  const handleSelect = (gheId: string, departamento: string) => {
    if (!departamento || departamento === "none") {
      const mapping = mappings.find(m => m.ghe_id === gheId);
      if (mapping) {
        deleteMapping.mutate(mapping.id);
      }
    } else {
      saveMapping.mutate({ gheId, departamento });
    }
  };

  const isLoading = loadingMatriz || loadingColab || loadingMap;

  return (
    <Card className="border-blue-200 mt-6 bg-blue-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
          <LinkIcon className="h-5 w-5 text-blue-600" />
          Sincronização RH: GHE vs Setores
        </CardTitle>
        <CardDescription className="text-blue-800/70">
          Vincule os Grupos Homogêneos de Exposição (GHE) criados no PGR aos Departamentos reais do módulo de Recursos Humanos. 
          Isturnover, afastamentos e clima podem enriquecer automaticamente a análise de riscos no futuro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : matriz.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum GHE cadastrado na matriz da empresa ainda.</p>
        ) : (
          <div className="space-y-4">
            {matriz.map((ghe) => {
              const currentMapping = mappings.find(m => m.ghe_id === ghe.ghe_id);
              const mappedDept = currentMapping?.departamento || "";
              const countNoSetor = colaboradores.filter(c => c.department === mappedDept).length;
              const alertNote = turnoverAlerts.find(a => a.ghe_id === ghe.ghe_id)?.alerta_nota || 0;

              return (
                <div key={ghe.ghe_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border bg-card hover:border-blue-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ghe.ghe_nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ghe.ghe_codigo || "Sem código"} • {ghe.riscos?.length || 0} risco(s)
                    </p>
                    {alertNote > 0 && (
                      <p className="text-xs font-semibold text-red-600 mt-1">
                        ⚠️ Alerta de Turnover: {alertNote}/100
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {mappedDept && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {countNoSetor} colab.
                      </Badge>
                    )}
                    
                    <Select 
                      value={mappedDept || "none"} 
                      onValueChange={(val) => handleSelect(ghe.ghe_id, val)}
                    >
                      <SelectTrigger className="w-[200px] text-xs h-8">
                        <SelectValue placeholder="Selecione um Setor do RH..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-muted-foreground italic">-- Nenhum setor (desvincular) --</SelectItem>
                        {departamentos.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
