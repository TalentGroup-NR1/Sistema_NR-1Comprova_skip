import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard } from "lucide-react";
import { useAvaliacoesPsico } from "@/hooks/usePsicoAvaliacoes";
import { ResultadosPanel } from "./ResultadosPanel";

export function DashboardPsico() {
  const { data: campanhas = [] } = useAvaliacoesPsico();
  const [sel, setSel] = useState("");
  const avaliacaoId = sel || campanhas[0]?.id || null;
  const campanha = campanhas.find((c) => c.id === avaliacaoId) ?? null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutDashboard className="h-5 w-5 text-orange-500" />
            Panorama das campanhas psicossociais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-md space-y-1">
            <label className="text-xs text-muted-foreground">Campanha</label>
            <Select value={avaliacaoId ?? ""} onValueChange={setSel}>
              <SelectTrigger><SelectValue placeholder="Selecione a campanha" /></SelectTrigger>
              <SelectContent>
                {campanhas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titulo} — {c.instrumento_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {campanha && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{campanha.instrumento_nome}</Badge>
              <Badge variant="outline">
                {campanha.total_respondidos}/{campanha.total_atribuidos} respondidos
              </Badge>
              <Badge variant="outline">{campanha.modo_anonimato ? "Anônimo" : "Identificado"}</Badge>
              <Badge variant="outline">{campanha.status}</Badge>
            </div>
          )}
          {campanhas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma campanha criada ainda. Comece pela aba Instrumentos e depois crie uma campanha.
            </p>
          )}
        </CardContent>
      </Card>

      <ResultadosPanel avaliacaoId={avaliacaoId} />
    </div>
  );
}
