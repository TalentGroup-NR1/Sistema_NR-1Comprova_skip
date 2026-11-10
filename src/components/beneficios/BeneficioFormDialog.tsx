import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateBeneficio, useUpdateBeneficio, Beneficio } from "@/hooks/useBeneficios";
import { uploadBeneficioImagem, deleteBeneficioImagem } from "@/hooks/useBeneficioStorage";
import { BeneficioMateriaisManager } from "./BeneficioMateriaisManager";
import { toast } from "sonner";
import { Info, FileText, Image, Upload, X, Loader2 } from "lucide-react";

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  valor_mensal: z.string().optional(),
  operadora_fornecedor: z.string().optional(),
  empresa: z.string().optional(),
  instrucoes: z.string().optional(),
  importancia: z.string().optional(),
  link_externo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BeneficioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficio?: Beneficio | null;
}

const CATEGORIAS = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "saude", label: "Saúde" },
  { value: "odontologico", label: "Odontológico" },
  { value: "seguros", label: "Seguros" },
  { value: "transporte", label: "Transporte" },
  { value: "lazer", label: "Lazer" },
  { value: "educacao", label: "Educação" },
  { value: "clube_descontos", label: "Clube de Descontos" },
  { value: "outros", label: "Outros" },
];

export function BeneficioFormDialog({
  open,
  onOpenChange,
  beneficio,
}: BeneficioFormDialogProps) {
  const createBeneficio = useCreateBeneficio();
  const updateBeneficio = useUpdateBeneficio();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      categoria: "alimentacao",
      valor_mensal: "",
      operadora_fornecedor: "",
      empresa: "",
      instrucoes: "",
      importancia: "",
      link_externo: "",
    },
  });

  const extendedBeneficio = beneficio as any;
  
  useEffect(() => {
    if (open) {
      setActiveTab("basico");
      if (beneficio) {
        form.reset({
          nome: beneficio.nome,
          descricao: beneficio.descricao || "",
          categoria: extendedBeneficio?.categoria || "alimentacao",
          valor_mensal: beneficio.valor_mensal?.toString() || "",
          operadora_fornecedor: beneficio.operadora_fornecedor || "",
          empresa: extendedBeneficio?.empresa || "",
          instrucoes: extendedBeneficio?.instrucoes || "",
          importancia: extendedBeneficio?.importancia || "",
          link_externo: extendedBeneficio?.link_externo || "",
        });
        setImagePreview(extendedBeneficio?.imagem_capa || null);
      } else {
        form.reset({
          nome: "",
          descricao: "",
          categoria: "alimentacao",
          valor_mensal: "",
          operadora_fornecedor: "",
          empresa: "",
          instrucoes: "",
          importancia: "",
          link_externo: "",
        });
        setImagePreview(null);
      }
      setImageFile(null);
    }
  }, [open, beneficio, form]);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Formato inválido. Use JPG, PNG ou WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: FormData) => {
    try {
      let imagemCapa = extendedBeneficio?.imagem_capa || null;
      
      // Upload de nova imagem se houver
      if (imageFile && beneficio?.id) {
        setUploadingImage(true);
        // Delete old image if exists
        if (imagemCapa) {
          await deleteBeneficioImagem(imagemCapa);
        }
        imagemCapa = await uploadBeneficioImagem(imageFile, beneficio.id);
        setUploadingImage(false);
      }

      const payload: any = {
        nome: data.nome,
        descricao: data.descricao || null,
        categoria: data.categoria || "alimentacao",
        valor_mensal: data.valor_mensal ? parseFloat(data.valor_mensal) : null,
        operadora_fornecedor: data.operadora_fornecedor || null,
        empresa: data.empresa || null,
        instrucoes: data.instrucoes || null,
        importancia: data.importancia || null,
        link_externo: data.link_externo || null,
      };

      if (beneficio) {
        payload.imagem_capa = imagemCapa;
        await updateBeneficio.mutateAsync({ id: beneficio.id, data: payload });
      } else {
        const result = await createBeneficio.mutateAsync(payload) as any;
        // Upload image after creation
        if (imageFile && result?.id) {
          setUploadingImage(true);
          const imageUrl = await uploadBeneficioImagem(imageFile, result.id);
          if (imageUrl) {
            await updateBeneficio.mutateAsync({ 
              id: result.id, 
              data: { imagem_capa: imageUrl } as any 
            });
          }
          setUploadingImage(false);
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      setUploadingImage(false);
      console.error(error);
    }
  };
  
  const isSubmitting = createBeneficio.isPending || updateBeneficio.isPending || uploadingImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {beneficio ? "Editar Benefício" : "Novo Benefício"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basico" className="text-xs sm:text-sm">
              <Info className="h-4 w-4 mr-1 hidden sm:inline" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="conteudo" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
              Conteúdo
            </TabsTrigger>
            <TabsTrigger value="imagem" className="text-xs sm:text-sm">
              <Image className="h-4 w-4 mr-1 hidden sm:inline" />
              Imagem
            </TabsTrigger>
            <TabsTrigger value="materiais" className="text-xs sm:text-sm" disabled={!beneficio}>
              <Upload className="h-4 w-4 mr-1 hidden sm:inline" />
              Materiais
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              {/* Aba Básico */}
              <TabsContent value="basico" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nome do Benefício *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Vale Refeição Sodexo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIAS.map(cat => (
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
                    name="empresa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa Fornecedora</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Sodexo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operadora_fornecedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operadora</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: VR, Alelo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="valor_mensal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Mensal (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="500.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="link_externo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link do Portal</FormLabel>
                        <FormControl>
                          <Input 
                            type="url"
                            placeholder="https://..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Aba Conteúdo */}
              <TabsContent value="conteudo" className="space-y-4 mt-0">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Benefício</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva o benefício de forma detalhada..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instrucoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruções de Uso</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Como usar o benefício, onde é aceito, passo a passo..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="importancia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Por que é Importante</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Benefícios para o colaborador, vantagens..."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Aba Imagem */}
              <TabsContent value="imagem" className="space-y-4 mt-0">
                <Card className="border-dashed">
                  <CardContent className="p-6">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors">
                        <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                        <span className="text-muted-foreground text-sm">
                          Clique para fazer upload da imagem de capa
                        </span>
                        <span className="text-muted-foreground text-xs mt-1">
                          JPG, PNG ou WebP (máx. 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </CardContent>
                </Card>
                <p className="text-sm text-muted-foreground">
                  A imagem de capa será exibida no catálogo de benefícios estilo Netflix.
                  Recomendamos imagens com proporção 16:10 para melhor visualização.
                </p>
              </TabsContent>

              {/* Aba Materiais */}
              <TabsContent value="materiais" className="mt-0">
                {beneficio ? (
                  <BeneficioMateriaisManager beneficioId={beneficio.id} />
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Salve o benefício primeiro para adicionar materiais educativos.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSubmitting ? "Salvando..." : beneficio ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
