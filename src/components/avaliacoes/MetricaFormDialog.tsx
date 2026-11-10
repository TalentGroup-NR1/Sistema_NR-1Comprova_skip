import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMetricaMutations, MetricaAvaliacao, ValorEscala, TipoMetrica, MetricaInput } from "@/hooks/useAvaliacoes";

const metricaSchema = z.object({
  nome_metrica: z.string().min(1, "Nome é obrigatório"),
  tipo_metrica: z.enum(['numerica', 'descritiva']),
});

type MetricaFormData = z.infer<typeof metricaSchema>;

interface MetricaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cicloId: string;
  metrica?: MetricaAvaliacao | null;
}

export function MetricaFormDialog({ open, onOpenChange, cicloId, metrica }: MetricaFormDialogProps) {
  const { createMetrica, updateMetrica } = useMetricaMutations(cicloId);
  const isEditing = !!metrica;
  const [valoresEscala, setValoresEscala] = useState<ValorEscala[]>([]);

  const form = useForm<MetricaFormData>({
    resolver: zodResolver(metricaSchema),
    defaultValues: {
      nome_metrica: "",
      tipo_metrica: "numerica",
    },
  });

  const tipoMetrica = form.watch("tipo_metrica");

  useEffect(() => {
    if (metrica) {
      form.reset({
        nome_metrica: metrica.nome_metrica,
        tipo_metrica: metrica.tipo_metrica,
      });
      setValoresEscala(metrica.valores_escala as ValorEscala[]);
    } else {
      form.reset({
        nome_metrica: "",
        tipo_metrica: "numerica",
      });
      // Default values for numeric scale
      setValoresEscala([
        { valor: 1, label: "Não Atende" },
        { valor: 2, label: "Atende Parcialmente" },
        { valor: 3, label: "Atende" },
        { valor: 4, label: "Supera" },
        { valor: 5, label: "Supera com Excelência" },
      ]);
    }
  }, [metrica, form, open]);

  useEffect(() => {
    if (!metrica && open) {
      if (tipoMetrica === 'numerica') {
        setValoresEscala([
          { valor: 1, label: "Não Atende" },
          { valor: 2, label: "Atende Parcialmente" },
          { valor: 3, label: "Atende" },
          { valor: 4, label: "Supera" },
          { valor: 5, label: "Supera com Excelência" },
        ]);
      } else {
        setValoresEscala([
          { valor: "nao_atende", label: "Não Atende" },
          { valor: "atende_parcialmente", label: "Atende Parcialmente" },
          { valor: "atende", label: "Atende" },
          { valor: "supera", label: "Supera" },
        ]);
      }
    }
  }, [tipoMetrica, metrica, open]);

  const addValor = () => {
    if (tipoMetrica === 'numerica') {
      const maxValor = valoresEscala.reduce((max, v) => Math.max(max, Number(v.valor)), 0);
      setValoresEscala([...valoresEscala, { valor: maxValor + 1, label: "" }]);
    } else {
      setValoresEscala([...valoresEscala, { valor: `valor_${valoresEscala.length + 1}`, label: "" }]);
    }
  };

  const removeValor = (index: number) => {
    setValoresEscala(valoresEscala.filter((_, i) => i !== index));
  };

  const updateValor = (index: number, field: 'valor' | 'label', value: string | number) => {
    const updated = [...valoresEscala];
    updated[index] = { ...updated[index], [field]: value };
    setValoresEscala(updated);
  };

  const onSubmit = async (data: MetricaFormData) => {
    try {
      const input: MetricaInput = {
        nome_metrica: data.nome_metrica,
        tipo_metrica: data.tipo_metrica,
        valores_escala: valoresEscala,
      };

      if (isEditing) {
        await updateMetrica.mutateAsync({ id: metrica.id, ...input });
      } else {
        await createMetrica.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Métrica" : "Nova Métrica de Avaliação"}</DialogTitle>
          <DialogDescription>
            Defina os valores da escala que serão usados para avaliar competências e objetivos
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_metrica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Métrica</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Escala 1-5, Escala Descritiva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_metrica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Métrica</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="numerica">Numérica (1, 2, 3...)</SelectItem>
                      <SelectItem value="descritiva">Descritiva (textos)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Valores da Escala</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={addValor}>
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              <div className="space-y-2">
                {valoresEscala.map((valor, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    {tipoMetrica === 'numerica' && (
                      <Input
                        type="number"
                        className="w-20"
                        value={valor.valor}
                        onChange={(e) => updateValor(index, 'valor', parseInt(e.target.value) || 0)}
                        placeholder="Valor"
                      />
                    )}
                    <Input
                      className="flex-1"
                      value={valor.label}
                      onChange={(e) => updateValor(index, 'label', e.target.value)}
                      placeholder="Descrição do valor"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeValor(index)}
                      disabled={valoresEscala.length <= 2}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMetrica.isPending || updateMetrica.isPending}>
                {isEditing ? "Salvar" : "Criar Métrica"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
