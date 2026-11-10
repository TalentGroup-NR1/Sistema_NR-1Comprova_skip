import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CONFIG_PADRAO, FAIXA_LABEL, type MatrizConfig } from "@/lib/matrizRisco";
import { useSalvarMatrizConfig } from "@/hooks/useMatrizConfig";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: MatrizConfig;
}

export function MatrizConfigDialog({ open, onOpenChange, config }: Props) {
  const [form, setForm] = useState<MatrizConfig>(config);
  const salvar = useSalvarMatrizConfig();

  useEffect(() => {
    if (open) setForm(config);
  }, [open, config]);

  const submeter = async () => {
    const { corte_verde, corte_amarelo, corte_laranja, corte_vermelho } = form;
    if (!(corte_verde < corte_amarelo && corte_amarelo < corte_laranja && corte_laranja <= corte_vermelho)) {
      toast({
        title: "Cortes inválidos",
        description: "Os limites devem ser crescentes (verde < amarelo < laranja ≤ vermelho).",
        variant: "destructive",
      });
      return;
    }
    try {
      await salvar.mutateAsync(form);
      toast({ title: "Configuração salva" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const campos: { key: keyof MatrizConfig; label: string }[] = [
    { key: "corte_verde", label: `${FAIXA_LABEL.verde} (verde) até` },
    { key: "corte_amarelo", label: `${FAIXA_LABEL.amarelo} (amarelo) até` },
    { key: "corte_laranja", label: `${FAIXA_LABEL.laranja} (laranja) até` },
    { key: "corte_vermelho", label: `${FAIXA_LABEL.vermelho} (vermelho) até` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar faixas da matriz</DialogTitle>
          <DialogDescription>
            Defina os limites do nível de risco (probabilidade × severidade, de 1 a 25).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {campos.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label>{c.label}</Label>
              <Input
                type="number"
                min={1}
                max={25}
                value={form[c.key] as number}
                onChange={(e) => setForm((f) => ({ ...f, [c.key]: Number(e.target.value) }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setForm({ ...form, ...CONFIG_PADRAO })}>
            Restaurar padrão
          </Button>
          <Button onClick={submeter} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
