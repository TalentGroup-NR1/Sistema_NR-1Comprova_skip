import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInDays, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateFeriasGozo, useUpdateFeriasGozo, FeriasGozo } from "@/hooks/useFerias";
import { useFeriados } from "@/hooks/useFeriados";

/** Subtrai N dias úteis (pula sáb/dom e feriados). */
function subtractBusinessDays(date: Date, days: number, feriados: Set<string>): Date {
  const d = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    const iso = format(d, "yyyy-MM-dd");
    if (dow !== 0 && dow !== 6 && !feriados.has(iso)) {
      remaining--;
    }
  }
  return d;
}

const formSchema = z.object({
  data_inicio_gozo: z.date({ required_error: "Data de início é obrigatória" }),
  data_fim_gozo: z.date({ required_error: "Data de fim é obrigatória" }),
  data_pagamento: z.date({ required_error: "Data de pagamento é obrigatória" }),
  observacoes: z.string().optional(),
}).refine((data) => data.data_fim_gozo > data.data_inicio_gozo, {
  message: "A data de fim deve ser posterior à data de início",
  path: ["data_fim_gozo"],
}).refine((data) => {
  const maxPaymentDate = subDays(data.data_inicio_gozo, 2);
  return data.data_pagamento <= maxPaymentDate;
}, {
  message: "O pagamento deve ser feito no máximo 2 dias antes do início das férias",
  path: ["data_pagamento"],
});

type FormValues = z.infer<typeof formSchema>;

interface FeriasGozoFormProps {
  colaboradorId: string;
  companyId: string;
  periodoAquisitivoId: string;
  diasRestantes: number;
  editingGozo?: FeriasGozo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function FeriasGozoForm({
  colaboradorId,
  companyId,
  periodoAquisitivoId,
  diasRestantes,
  editingGozo,
  onCancel,
  onSuccess
}: FeriasGozoFormProps) {
  const createGozo = useCreateFeriasGozo();
  const updateGozo = useUpdateFeriasGozo();
  const [diasCalculados, setDiasCalculados] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_inicio_gozo: editingGozo ? parseISO(editingGozo.data_inicio_gozo) : undefined,
      data_fim_gozo: editingGozo ? parseISO(editingGozo.data_fim_gozo) : undefined,
      data_pagamento: editingGozo ? parseISO(editingGozo.data_pagamento) : undefined,
      observacoes: editingGozo?.observacoes || "",
    },
  });

  const dataInicio = form.watch("data_inicio_gozo");
  const dataFim = form.watch("data_fim_gozo");

  const { feriadosMap } = useFeriados(dataInicio ? dataInicio.getFullYear() : undefined);
  const feriadosSet = new Set(Array.from(feriadosMap.keys()));

  useEffect(() => {
    if (dataInicio && dataFim) {
      const dias = differenceInDays(dataFim, dataInicio) + 1;
      setDiasCalculados(dias > 0 ? dias : 0);
    } else {
      setDiasCalculados(0);
    }
  }, [dataInicio, dataFim]);

  // Auto-preenche data de pagamento: 2 dias úteis antes do início (CLT art. 145).
  useEffect(() => {
    if (!dataInicio) return;
    const atual = form.getValues("data_pagamento");
    const sugerida = subtractBusinessDays(dataInicio, 2, feriadosSet);
    if (!atual || atual.getTime() !== sugerida.getTime()) {
      form.setValue("data_pagamento", sugerida, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, feriadosMap.size]);

  const onSubmit = async (values: FormValues) => {
    const diasSolicitados = differenceInDays(values.data_fim_gozo, values.data_inicio_gozo) + 1;

    // Nota: o saldo é validado no banco; o trigger reescreve o
    // periodo_aquisitivo_id correto pela data de início, então não
    // bloqueamos aqui (especialmente para lançamentos retroativos).


    const payload = {
      colaborador_id: colaboradorId,
      company_id: companyId,
      periodo_aquisitivo_id: editingGozo?.periodo_aquisitivo_id || periodoAquisitivoId,
      data_inicio_gozo: format(values.data_inicio_gozo, "yyyy-MM-dd"),
      data_fim_gozo: format(values.data_fim_gozo, "yyyy-MM-dd"),
      dias_gozados: diasSolicitados,
      data_pagamento: format(values.data_pagamento, "yyyy-MM-dd"),
      status: 'planejado' as const,
      observacoes: values.observacoes || null,
    };

    if (editingGozo) {
      await updateGozo.mutateAsync({ id: editingGozo.id, ...payload });
    } else {
      await createGozo.mutateAsync(payload);
    }
    
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="data_inicio_gozo"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      className="pointer-events-auto"
                    />

                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_fim_gozo"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Fim</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => dataInicio ? date <= dataInicio : false}
                      initialFocus
                      className="pointer-events-auto"
                    />

                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_pagamento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Pagamento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => dataInicio ? date > subDays(dataInicio, 2) : false}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Preenchida automaticamente: 2 dias úteis antes do início (CLT art. 145)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Dias solicitados:</span>
            <span className="text-2xl font-bold">{diasCalculados}</span>
          </div>
          {!editingGozo && (
            <p className="text-sm text-muted-foreground mt-2">
              Dias disponíveis: {diasRestantes}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adicione observações sobre este período de férias..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={createGozo.isPending || updateGozo.isPending}
          >
            {editingGozo ? "Atualizar" : "Adicionar"} Período
          </Button>
        </div>
      </form>
    </Form>
  );
}
