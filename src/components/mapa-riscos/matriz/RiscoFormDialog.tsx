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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  CATEGORIAS,
  FAIXA_LABEL,
  FAIXA_SUAVE,
  PROBABILIDADE_LABEL,
  SEVERIDADE_LABEL,
  faixaDoNivel,
  type CategoriaRisco,
  type MatrizConfig,
} from "@/lib/matrizRisco";
import {
  useCatalogoRiscos,
  useSalvarRiscoGhe,
  type RiscoGhe,
} from "@/hooks/useRiscosGhe";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gheId: string;
  config: MatrizConfig;
  risco: RiscoGhe | null;
}

const VAZIO = {
  risco_id: null as string | null,
  nome_risco: "",
  categoria: "fisico" as CategoriaRisco,
  probabilidade: 3,
  severidade: 3,
  descricao: "",
  controles_existentes: "",
};

export function RiscoFormDialog({ open, onOpenChange, gheId, config, risco }: Props) {
  const [form, setForm] = useState(VAZIO);
  const { data: catalogo = [] } = useCatalogoRiscos();
  const salvar = useSalvarRiscoGhe();

  useEffect(() => {
    if (!open) return;
    setForm(
      risco
        ? {
            risco_id: risco.risco_id,
            nome_risco: risco.nome_risco,
            categoria: risco.categoria,
            probabilidade: risco.probabilidade,
            severidade: risco.severidade,
            descricao: risco.descricao ?? "",
            controles_existentes: risco.controles_existentes ?? "",
          }
        : VAZIO
    );
  }, [open, risco]);

  const nivel = form.probabilidade * form.severidade;
  const faixa = faixaDoNivel(nivel, config);

  const aplicarCatalogo = (id: string) => {
    const item = catalogo.find((c) => c.id === id);
    if (!item) return;
    setForm((f) => ({
      ...f,
      risco_id: item.id,
      nome_risco: item.nome,
      categoria: item.categoria,
      descricao: item.descricao ?? f.descricao,
      controles_existentes: item.medidas_controle ?? f.controles_existentes,
    }));
  };

  const submeter = async () => {
    if (!form.nome_risco.trim()) {
      toast({ title: "Informe o nome do risco", variant: "destructive" });
      return;
    }
    try {
      await salvar.mutateAsync({
        gheId,
        risco: {
          id: risco?.id,
          risco_id: form.risco_id,
          nome_risco: form.nome_risco.trim(),
          categoria: form.categoria,
          probabilidade: form.probabilidade,
          severidade: form.severidade,
          fonte: risco?.fonte ?? "manual",
          descricao: form.descricao || null,
          controles_existentes: form.controles_existentes || null,
        },
      });
      toast({ title: risco ? "Risco atualizado" : "Risco adicionado" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risco ? "Editar risco" : "Adicionar risco"}</DialogTitle>
          <DialogDescription>
            Classifique o risco pela probabilidade de ocorrência e pela severidade das consequências.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!risco && (
            <div className="space-y-1.5">
              <Label>Buscar no catálogo (opcional)</Label>
              <Select value={form.risco_id ?? ""} onValueChange={aplicarCatalogo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um risco do catálogo" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {catalogo.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome do risco *</Label>
              <Input
                value={form.nome_risco}
                onChange={(e) => setForm((f) => ({ ...f, nome_risco: e.target.value, risco_id: null }))}
                placeholder="Ex.: Ruído contínuo acima de 85 dB"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria: v as CategoriaRisco }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nível calculado</Label>
              <div>
                <Badge variant="outline" className={FAIXA_SUAVE[faixa]}>
                  {nivel} — {FAIXA_LABEL[faixa]}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Probabilidade</Label>
              <Select
                value={String(form.probabilidade)}
                onValueChange={(v) => setForm((f) => ({ ...f, probabilidade: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} — {PROBABILIDADE_LABEL[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Severidade</Label>
              <Select
                value={String(form.severidade)}
                onValueChange={(v) => setForm((f) => ({ ...f, severidade: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} — {SEVERIDADE_LABEL[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição / fonte geradora</Label>
              <Textarea
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Controles existentes</Label>
              <Textarea
                rows={3}
                value={form.controles_existentes}
                onChange={(e) => setForm((f) => ({ ...f, controles_existentes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submeter} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
