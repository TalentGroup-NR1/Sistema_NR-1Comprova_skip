import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCicloMutations, CicloAvaliacao, CicloAvaliacaoStatus, CicloInput } from "@/hooks/useAvaliacoes";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { GlobalReplicationToggle } from "@/components/shared/GlobalReplicationToggle";
import { useReplicateCicloAvaliacao } from "@/hooks/useGlobalReplication";

const cicloSchema = z.object({
  nome_ciclo: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_fim: z.string().min(1, "Data de fim é obrigatória"),
  status: z.enum(['configuracao', 'ativo', 'finalizado']),
}).refine((data) => new Date(data.data_fim) >= new Date(data.data_inicio), {
  message: "Data de fim deve ser posterior à data de início",
  path: ["data_fim"],
});

type CicloFormData = z.infer<typeof cicloSchema>;

interface CicloFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ciclo?: CicloAvaliacao | null;
}

const statusOptions: { value: CicloAvaliacaoStatus; label: string }[] = [
  { value: 'configuracao', label: 'Em Configuração' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'finalizado', label: 'Finalizado' },
];

export function CicloFormDialog({ open, onOpenChange, ciclo }: CicloFormDialogProps) {
  const { createCiclo, updateCiclo } = useCicloMutations();
  const { isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const replicateCiclo = useReplicateCicloAvaliacao();
  const isEditing = !!ciclo;

  const [replicateGlobally, setReplicateGlobally] = useState(false);

  const form = useForm<CicloFormData>({
    resolver: zodResolver(cicloSchema),
    defaultValues: {
      nome_ciclo: "",
      descricao: "",
      data_inicio: "",
      data_fim: "",
      status: "configuracao",
    },
  });

  useEffect(() => {
    if (ciclo) {
      form.reset({
        nome_ciclo: ciclo.nome_ciclo,
        descricao: ciclo.descricao || "",
        data_inicio: ciclo.data_inicio,
        data_fim: ciclo.data_fim,
        status: ciclo.status,
      });
      setReplicateGlobally(false);
    } else {
      form.reset({
        nome_ciclo: "",
        descricao: "",
        data_inicio: "",
        data_fim: "",
        status: "configuracao",
      });
      setReplicateGlobally(false);
    }
  }, [ciclo, form]);

  const onSubmit = async (data: CicloFormData) => {
    try {
      const input: CicloInput = {
        nome_ciclo: data.nome_ciclo,
        descricao: data.descricao || null,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        status: data.status,
      };

      if (isEditing) {
        await updateCiclo.mutateAsync({ id: ciclo.id, ...input });
      } else {
        const result = await createCiclo.mutateAsync(input);

        // If replication is enabled and we have a company ID, replicate
        if (replicateGlobally && effectiveCompanyId && result?.id) {
          await replicateCiclo.mutateAsync({
            cicloId: result.id,
            sourceCompanyId: effectiveCompanyId,
          });
        }
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createCiclo.isPending || updateCiclo.isPending || replicateCiclo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Ciclo" : "Novo Ciclo de Avaliação"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize as informações do ciclo" : "Preencha os dados para criar um novo ciclo de avaliação"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_ciclo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Ciclo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Avaliação de Desempenho 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição opcional do ciclo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Global Replication Toggle - only for new ciclos */}
            {isAdminMaster && !isEditing && (
              <GlobalReplicationToggle
                sourceCompanyId={effectiveCompanyId}
                enabled={replicateGlobally}
                onEnabledChange={setReplicateGlobally}
                disabled={isPending}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? "Salvar" : "Criar Ciclo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
