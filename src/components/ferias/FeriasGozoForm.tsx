import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, differenceInDays, addDays, subDays, startOfDay } from "date-fns";
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
import { validarFracionamento } from "@/lib/feriasEngine";

/** Subtrai N dias úteis (pula sáb/dom e feriados). */
export function subtractBusinessDays(date: Date, days: number, feriados: Set<string> = new Set()): Date {
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

/**
 * Calcula a data limite de pagamento das férias.
 * - Sem abono: 2 dias úteis antes do início (CLT art. 145).
 * - Com abono: mais restritivo entre 2 dias úteis e 5 dias corridos antes (Súmula 328 TST).
 * MC-1: normalizado com startOfDay na origem para evitar divergências de hora/milissegundos.
 */
export function calcularLimitePagamento(
  dataInicio: Date,
  abonoDias: number = 0,
  feriados: Set<string> = new Set()
): Date {
  const limiteDescanso = startOfDay(subtractBusinessDays(dataInicio, 2, feriados));
  if (abonoDias > 0) {
    const limiteAbono = startOfDay(subDays(dataInicio, 5));
    // Mais restritivo = data mais anterior no tempo (getTime menor)
    return limiteDescanso.getTime() < limiteAbono.getTime() ? limiteDescanso : limiteAbono;
  }
  return limiteDescanso;
}

export function isDiaNaoUtil(date: Date, feriados: Set<string> = new Set()): boolean {
  const dow = date.getDay();
  const iso = format(date, "yyyy-MM-dd");
  return dow === 0 || dow === 6 || feriados.has(iso);
}

export interface BuildFeriasGozoSchemaParams {
  diasRestantes: number;
  diasRestantesParaEdicao?: number;
  isEditing: boolean;
  feriadosSet?: Set<string>;
  periodosExistentes?: Array<{ dias: number }>;
}

export function buildFeriasGozoSchema({
  diasRestantes,
  diasRestantesParaEdicao,
  isEditing,
  feriadosSet = new Set(),
  periodosExistentes = [],
}: BuildFeriasGozoSchemaParams) {
  const limiteSaldo = isEditing
    ? (diasRestantesParaEdicao ?? diasRestantes)
    : diasRestantes;

  return z
    .object({
      data_inicio_gozo: z.date({ required_error: "Data de início é obrigatória" }),
      data_fim_gozo: z.date({ required_error: "Data de fim é obrigatória" }),
      data_pagamento: z.date({ required_error: "Data de pagamento é obrigatória" }),
      abono_pecuniario_dias: z.coerce
        .number()
        .min(0, "Mínimo 0 dias")
        .max(10, "Máximo de 10 dias (1/3 por CLT art. 143)")
        .default(0),
      observacoes: z.string().optional(),
    })
    .refine((data) => data.data_fim_gozo >= data.data_inicio_gozo, {
      message: "A data de fim deve ser igual ou posterior à data de início",
      path: ["data_fim_gozo"],
    })
    .superRefine((data, ctx) => {
      // MC-2: Curto-circuita se datas forem inválidas para não empilhar erros de saldo/fracionamento
      if (data.data_fim_gozo < data.data_inicio_gozo) return;

      const diasAbono = Number(data.abono_pecuniario_dias) || 0;
      const limitePagamento = calcularLimitePagamento(
        data.data_inicio_gozo,
        diasAbono,
        feriadosSet
      );

      const pgNormalized = startOfDay(data.data_pagamento);
      const limiteNormalized = startOfDay(limitePagamento);

      if (pgNormalized > limiteNormalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            diasAbono > 0
              ? "O pagamento deve ser feito pelo menos 5 dias antes do início (Súmula 328 TST)"
              : "O pagamento deve ser feito no máximo 2 dias úteis antes do início das férias (CLT art. 145)",
          path: ["data_pagamento"],
        });
      }

      const diasDescanso = differenceInDays(data.data_fim_gozo, data.data_inicio_gozo) + 1;

      // Validação de fracionamento (CLT art. 134 §1º) - R2: somente roda se datas válidas (diasDescanso > 0)
      if (diasDescanso > 0) {
        const resFracionamento = validarFracionamento({
          periodosExistentes,
          novoPeriodo: { dias: diasDescanso },
          maxFracionamentos: 3,
        });
        if (!resFracionamento.valido && resFracionamento.erro) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: resFracionamento.erro,
            path: ["data_fim_gozo"],
          });
        }
      }

      // Validação de saldo com path dinâmico:
      // Se abono_pecuniario_dias > 0 -> path ["abono_pecuniario_dias"]
      // Se abono_pecuniario_dias === 0 -> path ["data_fim_gozo"]
      if (diasDescanso + diasAbono > limiteSaldo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Total consumido (${diasDescanso + diasAbono}d) excede os ${limiteSaldo} dias disponíveis`,
          path: diasAbono > 0 ? ["abono_pecuniario_dias"] : ["data_fim_gozo"],
        });
      }
    });
}

export type FeriasGozoFormValues = z.infer<ReturnType<typeof buildFeriasGozoSchema>>;

/**
 * Resolve o campo observações garantindo que no UPDATE observações pré-existentes
 * não sejam apagadas acidentalmente quando o input estiver em branco.
 */
export function resolverObservacoes({
  valuesObservacoes,
  editingObservacoes,
  isEditing,
}: {
  valuesObservacoes?: string | null;
  editingObservacoes?: string | null;
  isEditing: boolean;
}): string | null {
  const trimmed = valuesObservacoes?.trim();
  if (isEditing) {
    // 1. Se values.observacoes tiver conteúdo → usar o valor digitado
    if (trimmed && trimmed.length > 0) {
      return trimmed;
    }
    // 2. Se values.observacoes estiver vazio E editingGozo.observacoes existir → PRESERVAR
    if (editingObservacoes) {
      return editingObservacoes;
    }
    // 3. Se values.observacoes estiver vazio E editingGozo.observacoes for null → enviar null
    return null;
  }

  // No fluxo de CREATE: manter observacoes = values.observacoes || null
  return trimmed || null;
}

interface FeriasGozoFormProps {
  colaboradorId: string;
  companyId: string;
  periodoAquisitivoId: string;
  diasRestantes: number;
  diasRestantesParaEdicao?: number;
  periodosExistentes?: Array<{ dias: number }>;
  editingGozo?: FeriasGozo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function FeriasGozoForm({
  colaboradorId,
  companyId,
  periodoAquisitivoId,
  diasRestantes,
  diasRestantesParaEdicao,
  periodosExistentes = [],
  editingGozo,
  onCancel,
  onSuccess
}: FeriasGozoFormProps) {
  const createGozo = useCreateFeriasGozo();
  const updateGozo = useUpdateFeriasGozo();
  const [diasCalculados, setDiasCalculados] = useState(0);

  const userTouchedDataPagamento = useRef(Boolean(editingGozo));

  const form = useForm<FeriasGozoFormValues>({
    defaultValues: {
      data_inicio_gozo: editingGozo ? parseISO(editingGozo.data_inicio_gozo) : undefined,
      data_fim_gozo: editingGozo ? parseISO(editingGozo.data_fim_gozo) : undefined,
      data_pagamento: editingGozo ? parseISO(editingGozo.data_pagamento) : undefined,
      abono_pecuniario_dias: editingGozo?.abono_pecuniario_dias ?? 0,
      observacoes: editingGozo?.observacoes || "",
    },
  });

  const dataInicio = form.watch("data_inicio_gozo");
  const dataFim = form.watch("data_fim_gozo");
  const diasAbono = Number(form.watch("abono_pecuniario_dias")) || 0;

  const { feriadosMap } = useFeriados(dataInicio ? dataInicio.getFullYear() : undefined);
  const feriadosSet = useMemo(() => new Set(Array.from(feriadosMap.keys())), [feriadosMap]);

  const formSchema = useMemo(
    () =>
      buildFeriasGozoSchema({
        diasRestantes,
        diasRestantesParaEdicao,
        isEditing: !!editingGozo,
        feriadosSet,
        periodosExistentes,
      }),
    [diasRestantes, diasRestantesParaEdicao, editingGozo, feriadosSet, periodosExistentes]
  );

  // Mantém o resolver sincronizado com o schema memorizado
  useEffect(() => {
    // @ts-expect-error react-hook-form dynamic resolver update
    form.resolver = zodResolver(formSchema);
  }, [formSchema, form]);

  useEffect(() => {
    if (dataInicio && dataFim) {
      const dias = differenceInDays(dataFim, dataInicio) + 1;
      setDiasCalculados(dias > 0 ? dias : 0);
    } else {
      setDiasCalculados(0);
    }
  }, [dataInicio, dataFim]);

  // Auto-preenche data de pagamento: mais restritivo entre 2 dias úteis e 5 dias corridos (quando abono > 0)
  useEffect(() => {
    if (!dataInicio) return;
    if (userTouchedDataPagamento.current) return;

    const sugerida = calcularLimitePagamento(dataInicio, diasAbono, feriadosSet);
    const atual = form.getValues("data_pagamento");
    if (!atual || atual.getTime() !== sugerida.getTime()) {
      form.setValue("data_pagamento", sugerida, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, diasAbono, feriadosSet]);

  const onSubmit = async (values: FeriasGozoFormValues) => {
    const diasSolicitados = differenceInDays(values.data_fim_gozo, values.data_inicio_gozo) + 1;

    // Nota: o saldo é validado no banco; o trigger reescreve o
    // periodo_aquisitivo_id correto pela data de início, então não
    // bloqueamos aqui (especialmente para lançamentos retroativos).


    const finalObservacoes = resolverObservacoes({
      valuesObservacoes: values.observacoes,
      editingObservacoes: editingGozo?.observacoes,
      isEditing: Boolean(editingGozo),
    });

    const payload = {
      colaborador_id: colaboradorId,
      company_id: companyId,
      periodo_aquisitivo_id: editingGozo?.periodo_aquisitivo_id || periodoAquisitivoId,
      data_inicio_gozo: format(values.data_inicio_gozo, "yyyy-MM-dd"),
      data_fim_gozo: format(values.data_fim_gozo, "yyyy-MM-dd"),
      dias_gozados: diasSolicitados,
      abono_pecuniario_dias: Number(values.abono_pecuniario_dias) || 0,
      data_pagamento: format(values.data_pagamento, "yyyy-MM-dd"),
      status: 'planejado' as const,
      observacoes: finalObservacoes,
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
            render={({ field }) => {
              const dataPag = field.value;
              const isNaoUtil = dataPag ? isDiaNaoUtil(dataPag, feriadosSet) : false;
              const nomeDia = dataPag
                ? feriadosSet.has(format(dataPag, "yyyy-MM-dd"))
                  ? "um feriado"
                  : format(dataPag, "EEEE", { locale: ptBR })
                : "";
              const limiteCalculado = dataInicio
                ? calcularLimitePagamento(dataInicio, diasAbono, feriadosSet)
                : undefined;

              return (
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
                        onSelect={(date) => {
                          userTouchedDataPagamento.current = true;
                          field.onChange(date);
                        }}
                        disabled={(date) => (limiteCalculado ? date > limiteCalculado : false)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription className="text-xs">
                    {diasAbono > 0
                      ? "Preenchida automaticamente: 5 dias antes do início, por incluir abono pecuniário (Súmula 328 TST)"
                      : "Preenchida automaticamente: 2 dias úteis antes do início (CLT art. 145)"}
                  </FormDescription>
                  {isNaoUtil && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                      ⚠️ A data de pagamento cai em {nomeDia}. Verifique se há expediente bancário.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        {/* 4.1 Campo de abono em linha própria */}
        <FormField
          control={form.control}
          name="abono_pecuniario_dias"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dias de Abono Pecuniário (venda)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  placeholder="0"
                  {...field}
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Venda de até 10 dias (1/3 do direito — CLT art. 143). Deixe 0 se não houver abono.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 4.2 Prévia dinâmica de consumo */}
        {(() => {
          const totalConsumido = diasCalculados + diasAbono;
          const limite = editingGozo ? (diasRestantesParaEdicao ?? diasRestantes) : diasRestantes;
          const saldoApos = Math.max(0, limite - totalConsumido);
          const saldoEstourado = totalConsumido > limite;

          return (
            <div
              className={cn(
                "rounded-lg p-4 transition-colors",
                saldoEstourado
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200"
                  : "bg-muted/50 border border-border/50"
              )}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Descanso:</span>
                <span className="font-semibold">{diasCalculados} dias</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Abono pecuniário:</span>
                <span className="font-semibold">{diasAbono} dias</span>
              </div>
              <div className="border-t border-border/60 my-2 pt-2 flex items-center justify-between font-bold">
                <span>Total consumido:</span>
                <span
                  className={cn(
                    "text-xl",
                    saldoEstourado ? "text-amber-600 dark:text-amber-400" : "text-primary"
                  )}
                >
                  {totalConsumido} dias
                </span>
              </div>
              {!editingGozo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Disponíveis antes: {diasRestantes} dias · Restantes após: {saldoApos} dias
                </p>
              )}
            </div>
          );
        })()}

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
