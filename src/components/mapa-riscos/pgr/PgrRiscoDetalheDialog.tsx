import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useSalvarPgrRiscoDetalhe, type PgrRiscoDetalhe } from "@/hooks/usePgrRiscoDetalhe";
import { nivelRiscoClasse, nivelRiscoLabel, textoPadraoFicha } from "./pgrRiscoUtils";

export interface PgrRiscoItem {
  id: string;
  nome_risco: string;
  categoria?: string | null;
  probabilidade?: number | null;
  severidade?: number | null;
  nivel_risco?: number | null;
  fonte?: string | null;
  descricao?: string | null;
  controles_existentes?: string | null;
  detalhes?: Partial<PgrRiscoDetalhe> | null;
}

interface Props {
  documentoId: string;
  risco: PgrRiscoItem | null;
  gheNome?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CAMPOS: Array<{ key: keyof PgrRiscoDetalhe; label: string }> = [
  { key: "fundamentacao_legal", label: "Fundamentação legal" },
  { key: "lesoes_agravos", label: "Lesões / agravos à saúde" },
  { key: "fontes_circunstancias", label: "Fontes e circunstâncias" },
  { key: "meio_propagacao", label: "Meio de propagação" },
  { key: "acoes_necessarias", label: "Ações necessárias" },
  { key: "observacao", label: "Observação" },
];

const VAZIO: PgrRiscoDetalhe = {
  fundamentacao_legal: "",
  lesoes_agravos: "",
  fontes_circunstancias: "",
  meio_propagacao: "",
  acoes_necessarias: "",
  observacao: "",
};

export function PgrRiscoDetalheDialog({ documentoId, risco, gheNome, open, onOpenChange }: Props) {
  const [form, setForm] = useState<PgrRiscoDetalhe>(VAZIO);
  const salvar = useSalvarPgrRiscoDetalhe(documentoId);

  useEffect(() => {
    if (!open) return;
    setForm({ ...VAZIO, ...(risco?.detalhes ?? {}) } as PgrRiscoDetalhe);
  }, [open, risco]);

  if (!risco) return null;

  function handleSalvar() {
    if (!risco) return;
    salvar.mutate(
      { riscoId: risco.id, detalhes: form },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Ficha de risco — {risco.nome_risco}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          {gheNome && <p className="text-xs text-muted-foreground">GHE: {gheNome}</p>}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Grupo: {risco.categoria ?? "—"}</Badge>
            <Badge variant="outline">Perigo: {risco.nome_risco}</Badge>
            <Badge variant="outline">Severidade: {risco.severidade ?? "—"}</Badge>
            <Badge variant="outline">Probabilidade: {risco.probabilidade ?? "—"}</Badge>
            <Badge variant="outline" className={nivelRiscoClasse(risco.nivel_risco)}>
              Status: {nivelRiscoLabel(risco.nivel_risco)}
              {risco.nivel_risco != null ? ` (${risco.nivel_risco})` : ""}
            </Badge>
          </div>
          {risco.fonte && <p className="text-xs text-muted-foreground">Fonte: {risco.fonte}</p>}
        </div>

        <div className="space-y-4">
          {CAMPOS.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label className="text-xs">{c.label}</Label>
              <Textarea
                rows={3}
                value={form[c.key] ?? ""}
                placeholder={textoPadraoFicha(c.key, risco.categoria)}
                onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending}>
            {salvar.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Salvar ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
