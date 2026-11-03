import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { classifyRisk } from "@/lib/riskMatrix";
import type { PgrRisco } from "@/hooks/usePgrRiscos";

export const CATEGORIAS: { value: string; label: string }[] = [
  { value: "fisico", label: "Físico" },
  { value: "quimico", label: "Químico" },
  { value: "biologico", label: "Biológico" },
  { value: "ergonomico", label: "Ergonômico" },
  { value: "acidente", label: "Acidente" },
  { value: "psicossocial", label: "Psicossocial" },
];

export const riscoSchema = z.object({
  categoria: z.string().min(1, "Selecione uma categoria"),
  nome: z
    .string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  probabilidade: z.coerce.number().min(1, "Obrigatório").max(5, "Máximo 5"),
  severidade: z.coerce.number().min(1, "Obrigatório").max(5, "Máximo 5"),
  descricao: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
  medidas_existentes: z.string().max(2000, "Máximo de 2000 caracteres").optional(),
  grupo_exposto: z.string().max(120, "Máximo de 120 caracteres").optional(),
});

export type RiscoFormValues = z.infer<typeof riscoSchema>;

export interface RiscoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risco?: PgrRisco;
  onSubmit: (dados: {
    categoria: string;
    nome: string;
    probabilidade: number;
    severidade: number;
    descricao?: string | null;
    medidas_existentes?: string | null;
    grupo_exposto?: string | null;
  }) => void;
  isPending: boolean;
}

export function RiscoDialog({
  open,
  onOpenChange,
  risco,
  onSubmit,
  isPending,
}: RiscoDialogProps) {
  const isEditing = !!risco;

  const form = useForm<RiscoFormValues>({
    resolver: zodResolver(riscoSchema),
    defaultValues: {
      categoria: "fisico",
      nome: "",
      probabilidade: 1,
      severidade: 1,
      descricao: "",
      medidas_existentes: "",
      grupo_exposto: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (risco) {
        form.reset({
          categoria: risco.categoria || "fisico",
          nome: risco.nome || "",
          probabilidade: risco.probabilidade || 1,
          severidade: risco.severidade || 1,
          descricao: risco.descricao || "",
          medidas_existentes: risco.medidas_existentes || "",
          grupo_exposto: risco.grupo_exposto || "",
        });
      } else {
        form.reset({
          categoria: "fisico",
          nome: "",
          probabilidade: 1,
          severidade: 1,
          descricao: "",
          medidas_existentes: "",
          grupo_exposto: "",
        });
      }
    }
  }, [open, risco, form]);

  const handleSubmit = (values: RiscoFormValues) => {
    onSubmit({
      categoria: values.categoria,
      nome: values.nome.trim(),
      probabilidade: Number(values.probabilidade),
      severidade: Number(values.severidade),
      descricao: values.descricao?.trim() || null,
      medidas_existentes: values.medidas_existentes?.trim() || null,
      grupo_exposto: values.grupo_exposto?.trim() || null,
    });
  };

  const probValue = form.watch("probabilidade") ?? 1;
  const sevValue = form.watch("severidade") ?? 1;
  const descValue = form.watch("descricao") || "";
  const medidasValue = form.watch("medidas_existentes") || "";

  const { nivel, classificacao, bgClasse, textClasse } = classifyRisk(
    Number(probValue) || 1,
    Number(sevValue) || 1,
    "5x5"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar risco" : "Novo risco"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do risco identificado no inventário."
              : "Preencha as informações do risco para adicionar ao inventário do PGR."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grupo_exposto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo exposto (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Operadores de máquinas"
                        maxLength={120}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do risco *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Ruído contínuo ou intermitente"
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="probabilidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probabilidade (1 a 5) *</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value ? String(field.value) : "1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (1-5)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Muito Baixa</SelectItem>
                        <SelectItem value="2">2 - Baixa</SelectItem>
                        <SelectItem value="3">3 - Média</SelectItem>
                        <SelectItem value="4">4 - Alta</SelectItem>
                        <SelectItem value="5">5 - Muito Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severidade (1 a 5) *</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value ? String(field.value) : "1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (1-5)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Leve</SelectItem>
                        <SelectItem value="2">2 - Moderada</SelectItem>
                        <SelectItem value="3">3 - Severa</SelectItem>
                        <SelectItem value="4">4 - Crítica</SelectItem>
                        <SelectItem value="5">5 - Fatal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Descrição</FormLabel>
                    <span className="text-[11px] text-muted-foreground">
                      {descValue.length}/2000
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva as fontes geradoras e detalhes do risco..."
                      rows={3}
                      maxLength={2000}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medidas_existentes"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Medidas existentes</FormLabel>
                    <span className="text-[11px] text-muted-foreground">
                      {medidasValue.length}/2000
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Medidas de controle, EPIs, EPCs ou procedimentos já adotados..."
                      rows={3}
                      maxLength={2000}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Nível:</span>
                <Badge className={`${bgClasse} ${textClasse} hover:${bgClasse}`}>
                  {probValue} × {sevValue} = {nivel} ({classificacao})
                </Badge>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

