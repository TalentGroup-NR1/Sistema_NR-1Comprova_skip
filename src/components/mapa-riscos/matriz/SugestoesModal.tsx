import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSugestaoRiscos } from "@/hooks/useSugestaoRiscos";
import { useSalvarRiscoGhe } from "@/hooks/useRiscosGhe";
import {
  FAIXA_LABEL,
  FAIXA_SUAVE,
  categoriaClasse,
  categoriaLabel,
  faixaDoNivel,
  type MatrizConfig,
} from "@/lib/matrizRisco";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gheId: string;
  config: MatrizConfig;
}

export function SugestoesModal({ open, onOpenChange, gheId, config }: Props) {
  const { data: sugestoes = [], isLoading } = useSugestaoRiscos(gheId, open);
  const salvar = useSalvarRiscoGhe();
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [salvando, setSalvando] = useState(false);

  const disponiveis = sugestoes.filter((s) => !s.ja_adicionado);
  const marcados = disponiveis.filter((s) => selecionados[s.risco_catalogo_id]);

  const aplicar = async () => {
    setSalvando(true);
    try {
      for (const s of marcados) {
        await salvar.mutateAsync({
          gheId,
          risco: {
            risco_id: s.risco_catalogo_id,
            nome_risco: s.nome,
            categoria: s.categoria,
            probabilidade: s.probabilidade,
            severidade: s.severidade,
            fonte: "automatico",
            origem_dados: s.origem_dados,
            descricao: s.motivo_sugestao,
          },
        });
      }
      toast({ title: `${marcados.length} risco(s) adicionado(s)` });
      setSelecionados({});
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao aplicar sugestões", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Riscos sugeridos
          </DialogTitle>
          <DialogDescription>
            Sugestões geradas a partir dos cargos, tarefas e ambiente vinculados a este GHE. Revise e
            selecione o que se aplica.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : disponiveis.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma nova sugestão para este GHE.
          </p>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-2">
              {disponiveis.map((s) => {
                const nivel = s.probabilidade * s.severidade;
                const faixa = faixaDoNivel(nivel, config);
                return (
                  <label
                    key={s.risco_catalogo_id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={!!selecionados[s.risco_catalogo_id]}
                      onCheckedChange={(v) =>
                        setSelecionados((p) => ({ ...p, [s.risco_catalogo_id]: !!v }))
                      }
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.nome}</span>
                        <Badge variant="outline" className={categoriaClasse(s.categoria)}>
                          {categoriaLabel(s.categoria)}
                        </Badge>
                        <Badge variant="outline" className={FAIXA_SUAVE[faixa]}>
                          P{s.probabilidade} × S{s.severidade} = {nivel} ({FAIXA_LABEL[faixa]})
                        </Badge>
                      </div>
                      {s.motivo_sugestao && (
                        <p className="text-xs text-muted-foreground">{s.motivo_sugestao}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={aplicar} disabled={marcados.length === 0 || salvando}>
            {salvando ? "Adicionando..." : `Adicionar ${marcados.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
