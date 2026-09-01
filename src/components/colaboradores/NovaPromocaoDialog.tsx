import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, TrendingUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreatePromocao, useCreatePromocaoRetroativa } from "@/hooks/usePromocoes";
import { useNiveisMaturidade } from "@/hooks/useEstruturaConfig";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";


const promocaoSchema = z.object({
  data_promocao: z.date({ required_error: "Selecione a data" }).refine(
    (date) => date <= new Date(),
    { message: "A data não pode ser futura" }
  ),
  cargo_novo: z.string().min(2, "Informe o novo cargo"),
  salario_novo: z.string().min(1, "Informe o novo salário"),
  nivel_novo: z.string().optional(),
  departamento_novo: z.string().optional(),
  motivo: z.string().optional(),
  aprovado_por: z.string().min(2, "Informe quem aprovou"),
  observacoes: z.string().optional(),
  // Campos retroativos (opcionais — validados condicionalmente)
  cargo_anterior: z.string().optional(),
  salario_anterior: z.string().optional(),
  nivel_anterior: z.string().optional(),
  departamento_anterior: z.string().optional(),
});

type PromocaoFormData = z.infer<typeof promocaoSchema>;

interface NovaPromocaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: {
    id: string;
    company_id: string;
    full_name: string;
    job_title: string;
    base_salary: number;
    job_level: string | null;
    department: string;
  };
}

function formatCurrencyInput(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseCurrencyToNumber(value: string): number {
  const cleaned = (value || "").replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function NovaPromocaoDialog({ open, onOpenChange, colaborador }: NovaPromocaoDialogProps) {
  const createPromocao = useCreatePromocao();
  const companyId = useEffectiveCompanyId();
  const { data: niveis = [] } = useNiveisMaturidade(companyId);
  const niveisAtivos = niveis.filter((n) => n.ativo);
  const createRetroativa = useCreatePromocaoRetroativa();
  const [retroativo, setRetroativo] = useState(false);
  const [salarioPreview, setSalarioPreview] = useState<number | null>(null);

  const form = useForm<PromocaoFormData>({
    resolver: zodResolver(promocaoSchema),
    defaultValues: {
      cargo_novo: colaborador.job_title,
      salario_novo: formatCurrencyInput(colaborador.base_salary),
      nivel_novo: colaborador.job_level || "",
      departamento_novo: colaborador.department,
      motivo: "",
      aprovado_por: "",
      observacoes: "",
      cargo_anterior: "",
      salario_anterior: "",
      nivel_anterior: "",
      departamento_anterior: "",
    },
  });

  useEffect(() => {
    if (open) {
      setRetroativo(false);
      form.reset({
        cargo_novo: colaborador.job_title,
        salario_novo: formatCurrencyInput(colaborador.base_salary),
        nivel_novo: colaborador.job_level || "",
        departamento_novo: colaborador.department,
        motivo: "",
        aprovado_por: "",
        observacoes: "",
        cargo_anterior: "",
        salario_anterior: "",
        nivel_anterior: "",
        departamento_anterior: "",
      });
      setSalarioPreview(colaborador.base_salary);
    }
  }, [open, colaborador, form]);

  const salarioNovoStr = form.watch("salario_novo");
  const salarioAnteriorStr = form.watch("salario_anterior");

  useEffect(() => {
    setSalarioPreview(parseCurrencyToNumber(salarioNovoStr));
  }, [salarioNovoStr]);

  const baseSalarioComparacao = retroativo
    ? parseCurrencyToNumber(salarioAnteriorStr || "0")
    : colaborador.base_salary;
  const variacaoSalarial =
    salarioPreview && baseSalarioComparacao
      ? ((salarioPreview - baseSalarioComparacao) / baseSalarioComparacao) * 100
      : 0;

  async function onSubmit(data: PromocaoFormData) {
    if (retroativo) {
      if (!data.cargo_anterior || data.cargo_anterior.trim().length < 2) {
        form.setError("cargo_anterior", { message: "Informe o cargo anterior" });
        return;
      }
      if (!data.salario_anterior || parseCurrencyToNumber(data.salario_anterior) <= 0) {
        form.setError("salario_anterior", { message: "Informe o salário anterior" });
        return;
      }
      await createRetroativa.mutateAsync({
        colaborador_id: colaborador.id,
        company_id: colaborador.company_id,
        data_promocao: format(data.data_promocao, "yyyy-MM-dd"),
        cargo_anterior: data.cargo_anterior,
        salario_anterior: parseCurrencyToNumber(data.salario_anterior),
        nivel_anterior: data.nivel_anterior || null,
        departamento_anterior: data.departamento_anterior || null,
        cargo_novo: data.cargo_novo,
        salario_novo: parseCurrencyToNumber(data.salario_novo),
        nivel_novo: data.nivel_novo || null,
        departamento_novo: data.departamento_novo || null,
        motivo: data.motivo || null,
        aprovado_por: data.aprovado_por,
        observacoes: data.observacoes || null,
      });
    } else {
      await createPromocao.mutateAsync({
        colaborador_id: colaborador.id,
        company_id: colaborador.company_id,
        data_promocao: format(data.data_promocao, "yyyy-MM-dd"),
        cargo_novo: data.cargo_novo,
        salario_novo: parseCurrencyToNumber(data.salario_novo),
        nivel_novo: data.nivel_novo || null,
        departamento_novo: data.departamento_novo || null,
        motivo: data.motivo || null,
        aprovado_por: data.aprovado_por,
        observacoes: data.observacoes || null,
      });
    }
    onOpenChange(false);
  }

  const isPending = createPromocao.isPending || createRetroativa.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {retroativo ? <History className="h-5 w-5 text-amber-600" /> : <TrendingUp className="h-5 w-5 text-primary" />}
            {retroativo ? "Histórico Retroativo" : "Nova Promoção"}
          </DialogTitle>
          <DialogDescription>
            {retroativo ? "Registrar alteração antiga para " : "Registrar promoção para "}
            <strong>{colaborador.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Toggle Retroativo */}
        <div className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-muted/30">
          <div className="flex-1">
            <div className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4" /> Lançamento retroativo
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Para cadastrar histórico antigo. Não altera o cargo/salário atual do colaborador.
            </p>
          </div>
          <Switch checked={retroativo} onCheckedChange={setRetroativo} />
        </div>

        {retroativo && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <strong>Atenção:</strong> Este lançamento apenas adiciona um registro ao histórico.
            O cargo e salário atuais do colaborador <strong>permanecem inalterados</strong>.
          </div>
        )}

        {/* Dados atuais (apenas no modo normal) */}
        {!retroativo && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase">Dados Atuais</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Cargo:</span> <span className="font-medium">{colaborador.job_title}</span></div>
              <div><span className="text-muted-foreground">Salário:</span> <span className="font-medium">{formatCurrency(colaborador.base_salary)}</span></div>
              <div><span className="text-muted-foreground">Nível:</span> <span className="font-medium">{colaborador.job_level || "—"}</span></div>
              <div><span className="text-muted-foreground">Depto:</span> <span className="font-medium">{colaborador.department}</span></div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data_promocao"
              render={({ field }) => {
                const [text, setText] = [
                  (field as any)._text ?? (field.value ? format(field.value, "dd/MM/yyyy") : ""),
                  (v: string) => {},
                ];
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>{retroativo ? "Data da alteração *" : "Data da Promoção *"}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/aaaa"
                        maxLength={10}
                        defaultValue={field.value ? format(field.value, "dd/MM/yyyy") : ""}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                          if (v.length >= 5) v = `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
                          else if (v.length >= 3) v = `${v.slice(0,2)}/${v.slice(2)}`;
                          e.target.value = v;
                          const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                          if (m) {
                            const [, dd, mm, yyyy] = m;
                            const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
                            if (
                              d.getFullYear() === Number(yyyy) &&
                              d.getMonth() === Number(mm) - 1 &&
                              d.getDate() === Number(dd)
                            ) {
                              field.onChange(d);
                              return;
                            }
                          }
                          field.onChange(undefined as any);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Bloco "anterior" - apenas em modo retroativo */}
            {retroativo && (
              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Dados Anteriores</div>
                <FormField control={form.control} name="cargo_anterior" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo anterior *</FormLabel>
                    <FormControl><Input {...field} placeholder="Ex: Analista Júnior" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="salario_anterior" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salário anterior *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input {...field} className="pl-10" placeholder="0,00" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="nivel_anterior" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível anterior</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {niveisAtivos.map((n) => <SelectItem key={n.id} value={n.nome}>{n.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="departamento_anterior" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depto anterior</FormLabel>
                      <FormControl><Input {...field} placeholder="Opcional" /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            <div className={retroativo ? "rounded-lg border border-dashed p-3 space-y-3" : "space-y-4"}>
              {retroativo && <div className="text-xs font-semibold uppercase text-muted-foreground">Dados Novos (após a alteração)</div>}

              <FormField control={form.control} name="cargo_novo" render={({ field }) => (
                <FormItem>
                  <FormLabel>{retroativo ? "Cargo novo *" : "Novo Cargo *"}</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: Analista Sênior" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="salario_novo" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <span>{retroativo ? "Salário novo *" : "Novo Salário *"}</span>
                    {salarioPreview !== null && salarioPreview !== baseSalarioComparacao && baseSalarioComparacao > 0 && (
                      <Badge variant="outline" className={cn("ml-2", variacaoSalarial >= 0 ? "text-green-600 border-green-600" : "text-red-600 border-red-600")}>
                        {variacaoSalarial >= 0 ? "+" : ""}{variacaoSalarial.toFixed(1)}%
                      </Badge>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input {...field} className="pl-10" placeholder="0,00" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nivel_novo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{retroativo ? "Nível novo" : "Novo Nível"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {niveisAtivos.map((n) => <SelectItem key={n.id} value={n.nome}>{n.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="departamento_novo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{retroativo ? "Depto novo" : "Novo Departamento"}</FormLabel>
                    <FormControl><Input {...field} placeholder="Opcional" /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="motivo" render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Mérito">Mérito</SelectItem>
                    <SelectItem value="Promoção">Promoção</SelectItem>
                    <SelectItem value="Dissídio">Dissídio</SelectItem>
                    <SelectItem value="Enquadramento">Enquadramento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="aprovado_por" render={({ field }) => (
              <FormItem>
                <FormLabel>Aprovado por *</FormLabel>
                <FormControl><Input {...field} placeholder="Nome do aprovador" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea {...field} placeholder="Observações adicionais..." rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                ) : retroativo ? "Adicionar ao Histórico" : "Registrar Promoção"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
