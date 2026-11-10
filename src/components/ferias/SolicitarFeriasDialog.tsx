import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSolicitarFerias } from "@/hooks/useMinhasFerias";
import { validarFracionamento } from "@/lib/feriasEngine";

interface SolicitarFeriasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  companyId: string;
  periodoAquisitivoId: string;
  diasRestantes: number;
  fracionamentosAtuais: number;
  jaTemPeriodoMaior14: boolean;
  podeFracionar: boolean; // false se < 18 ou > 50 (CLT art. 134 §2 antiga regra) — mantido true por padrão
}

const buildSchema = (
  diasRestantes: number,
  fracionamentosAtuais: number,
  jaTemPeriodoMaior14: boolean
) =>
  z
    .object({
      data_inicio_gozo: z.date({ required_error: "Obrigatório" }),
      data_fim_gozo: z.date({ required_error: "Obrigatório" }),
      data_pagamento: z.date({ required_error: "Obrigatório" }),
      abono_pecuniario_dias: z.coerce.number().min(0).max(10).default(0),
      observacoes: z.string().optional(),
    })
    .refine((d) => d.data_fim_gozo >= d.data_inicio_gozo, {
      message: "A data de fim deve ser igual ou posterior ao início",
      path: ["data_fim_gozo"],
    })
    .superRefine((d, ctx) => {
      const dias = differenceInDays(d.data_fim_gozo, d.data_inicio_gozo) + 1;
      const periodosSimulados = jaTemPeriodoMaior14
        ? [{ dias: 14 }]
        : Array.from({ length: fracionamentosAtuais }, () => ({ dias: 5 }));

      const res = validarFracionamento({
        periodosExistentes: periodosSimulados,
        novoPeriodo: { dias },
        maxFracionamentos: 3,
      });

      if (!res.valido && res.erro) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.erro,
          path: ["data_fim_gozo"],
        });
      }
    })
    .refine(
      (d) => {
        const dias = differenceInDays(d.data_fim_gozo, d.data_inicio_gozo) + 1;
        return dias <= diasRestantes;
      },
      {
        message: `Você só tem ${diasRestantes} dias disponíveis`,
        path: ["data_fim_gozo"],
      },
    )
    .refine((d) => d.data_pagamento <= subDays(d.data_inicio_gozo, 2), {
      message: "Pagamento deve ser pelo menos 2 dias antes do início (CLT art. 145)",
      path: ["data_pagamento"],
    })
    .refine((d) => ![0, 5, 6].includes(d.data_inicio_gozo.getDay()), {
      // CLT art. 134, §3º — não iniciar em 2 dias antes de feriado/DSR
      message: "Não é permitido iniciar férias em sexta, sábado ou domingo (CLT art. 134, §3º)",
      path: ["data_inicio_gozo"],
    });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function SolicitarFeriasDialog({
  open,
  onOpenChange,
  colaboradorId,
  companyId,
  periodoAquisitivoId,
  diasRestantes,
  fracionamentosAtuais,
  jaTemPeriodoMaior14,
}: SolicitarFeriasDialogProps) {
  const solicitar = useSolicitarFerias();
  const [diasCalculados, setDiasCalculados] = useState(0);

  const schema = buildSchema(diasRestantes, fracionamentosAtuais, jaTemPeriodoMaior14);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { abono_pecuniario_dias: 0, observacoes: "" },
  });

  const dataInicio = form.watch("data_inicio_gozo");
  const dataFim = form.watch("data_fim_gozo");

  useEffect(() => {
    if (dataInicio && dataFim) {
      const d = differenceInDays(dataFim, dataInicio) + 1;
      setDiasCalculados(d > 0 ? d : 0);
    } else setDiasCalculados(0);
  }, [dataInicio, dataFim]);

  useEffect(() => {
    if (!open) {
      form.reset({ abono_pecuniario_dias: 0, observacoes: "" });
      setDiasCalculados(0);
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    const dias = differenceInDays(values.data_fim_gozo, values.data_inicio_gozo) + 1;
    const periodosSimulados = jaTemPeriodoMaior14
      ? [{ dias: 14 }]
      : Array.from({ length: fracionamentosAtuais }, () => ({ dias: 5 }));

    const resFrac = validarFracionamento({
      periodosExistentes: periodosSimulados,
      novoPeriodo: { dias },
      maxFracionamentos: 3,
    });
    if (!resFrac.valido && resFrac.erro) {
      form.setError("data_fim_gozo", { message: resFrac.erro });
      return;
    }
    await solicitar.mutateAsync({
      colaborador_id: colaboradorId,
      company_id: companyId,
      periodo_aquisitivo_id: periodoAquisitivoId,
      data_inicio_gozo: values.data_inicio_gozo,
      data_fim_gozo: values.data_fim_gozo,
      dias_gozados: dias,
      data_pagamento: values.data_pagamento,
      abono_pecuniario_dias: values.abono_pecuniario_dias,
      observacoes: values.observacoes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Férias</DialogTitle>
          <DialogDescription>
            Sua solicitação será enviada para aprovação do gestor.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm space-y-1">
            <p><strong>Regras CLT:</strong></p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Mínimo de 5 dias por fracionamento</li>
              <li>Pelo menos um período deve ter 14 dias ou mais</li>
              <li>Máximo de 3 fracionamentos por período aquisitivo</li>
              <li>Pagamento até 2 dias antes do início</li>
              <li>Não pode iniciar em sexta, sábado, domingo ou véspera de feriado</li>
              <li>Abono pecuniário opcional: até 1/3 das férias (10 dias)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="data_inicio_gozo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(d) => d < new Date()} className="pointer-events-auto" />
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
                    <FormLabel>Fim</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(d) => (dataInicio ? d < dataInicio : d < new Date())} className="pointer-events-auto" />
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
                    <FormLabel>Pagamento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(d) => (dataInicio ? d > subDays(dataInicio, 2) : false)} className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs">Até D-2</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="abono_pecuniario_dias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abono pecuniário (dias)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={10} {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    "Vender" até 10 dias (1/3 das férias). Deixe 0 se não desejar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dias solicitados:</span>
              <span className="text-2xl font-bold">{diasCalculados}</span>
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Ex.: viagem em família..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={solicitar.isPending}>
                {solicitar.isPending ? "Enviando..." : "Solicitar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
