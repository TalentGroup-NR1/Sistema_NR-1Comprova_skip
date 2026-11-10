import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { KanbanSquare, Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAvaliacoesPsico } from "@/hooks/usePsicoAvaliacoes";
import { useHeatmapPsico, useGerarPlanosPsico, type AgrupamentoHeatmap } from "@/hooks/usePsicoHeatmap";
import { usePlanosAcao, type PlanoAcao, type PlanoAcaoStatus } from "@/hooks/usePlanosAcao";
import { KanbanBoard } from "./KanbanBoard";
import { PainelMetricas } from "./PainelMetricas";
import { ModalPlanoAcao, type ModalPlanoMode } from "./ModalPlanoAcao";

export function PlanosAcaoPsicoTab() {
  const { data: campanhas = [] } = useAvaliacoesPsico();
  const [avaliacaoSel, setAvaliacaoSel] = useState<string>("");
  const [agrupamento, setAgrupamento] = useState<AgrupamentoHeatmap>("ghe");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<ModalPlanoMode | null>(null);

  const avaliacaoId = avaliacaoSel || campanhas[0]?.id || null;

  const { data: planos = [], isLoading } = usePlanosAcao(avaliacaoId);
  const { data: heatmap } = useHeatmapPsico(avaliacaoId, agrupamento);
  const gerar = useGerarPlanosPsico();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return planos;
    return planos.filter((p) =>
      [p.titulo, p.descricao, p.grupo_nome, p.departamento, p.dimensao_nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [planos, busca]);

  async function handleSincronizar() {
    if (!avaliacaoId) return toast.error("Selecione uma campanha");
    try {
      const r = await gerar.mutateAsync({ avaliacaoId, agrupamento });
      toast.success(
        `Sincronização concluída: ${r.criados} risco(s) novo(s), ${r.ja_existentes} já registrado(s).`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao sincronizar riscos");
    }
  }

  function openPlano(p: PlanoAcao, forceStatus?: PlanoAcaoStatus) {
    setModal({ kind: "edit", plano: p, forceStatus });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <KanbanSquare className="h-5 w-5 text-orange-500" />
            Planos de Ação NR-1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Campanha</label>
              <Select value={avaliacaoId ?? ""} onValueChange={setAvaliacaoSel}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {campanhas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo} — {c.instrumento_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Agrupar por</label>
              <Select value={agrupamento} onValueChange={(v) => setAgrupamento(v as AgrupamentoHeatmap)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ghe">GHE</SelectItem>
                  <SelectItem value="departamento">Departamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Grupo, dimensão, título…" />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                variant="outline"
                className="flex-1 md:flex-none"
                onClick={handleSincronizar}
                disabled={gerar.isPending || !avaliacaoId}
              >
                {gerar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar riscos
              </Button>
              <Button
                className="flex-1 md:flex-none"
                onClick={() =>
                  avaliacaoId &&
                  setModal({
                    kind: "create-manual",
                    avaliacaoId,
                    agrupamento,
                    dimensoes: heatmap?.dimensoes ?? [],
                    linhas: heatmap?.linhas ?? [],
                  })
                }
                disabled={!avaliacaoId}
              >
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            "Sincronizar riscos" cria automaticamente um cartão pendente para cada combinação de grupo e dimensão
            classificada como risco médio ou alto na campanha selecionada.
          </p>
        </CardContent>
      </Card>

      <PainelMetricas planos={filtrados} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando planos…
        </div>
      ) : (
        <KanbanBoard planos={filtrados} onOpenPlano={openPlano} />
      )}

      <ModalPlanoAcao open={!!modal} mode={modal} onClose={() => setModal(null)} />
    </div>
  );
}
