import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateColaboradorBeneficio, ColaboradorBeneficio } from "@/hooks/useBeneficios";

const formSchema = z.object({
  numero_cartao: z.string().optional(),
  status: z.string().min(1, "Status é obrigatório"),
  data_fim: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditarAtribuicaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atribuicao: ColaboradorBeneficio | null;
}

export function EditarAtribuicaoDialog({
  open,
  onOpenChange,
  atribuicao,
}: EditarAtribuicaoDialogProps) {
  const updateAtribuicao = useUpdateColaboradorBeneficio();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_cartao: "",
      status: "ativo",
      data_fim: "",
      observacoes: "",
    },
  });
  
  useEffect(() => {
    if (open && atribuicao) {
      form.reset({
        numero_cartao: atribuicao.numero_cartao || "",
        status: atribuicao.status,
        data_fim: atribuicao.data_fim || "",
        observacoes: atribuicao.observacoes || "",
      });
    }
  }, [open, atribuicao, form]);
  
  const onSubmit = async (data: FormData) => {
    if (!atribuicao) return;
    
    await updateAtribuicao.mutateAsync({
      id: atribuicao.id,
      data: {
        numero_cartao: data.numero_cartao || undefined,
        status: data.status,
        data_fim: data.data_fim || undefined,
        observacoes: data.observacoes || undefined,
      },
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Atribuição</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numero_cartao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Cartão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 1234 5678 9012 3456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="data_fim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Término</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais..."
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateAtribuicao.isPending}>
                {updateAtribuicao.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
