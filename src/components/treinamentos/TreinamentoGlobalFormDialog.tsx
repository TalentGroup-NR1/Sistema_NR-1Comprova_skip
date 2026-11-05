import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Globe, ShieldAlert, Award } from "lucide-react";
import { FileUploadArea } from "./FileUploadArea";
import { useUploadTreinamentoFile, UploadableFileType } from "@/hooks/useTreinamentoStorage";
import {
  useCategoriasPlataforma,
  useCreateTreinamentoGlobal,
  useUpdateTreinamentoGlobal,
  TreinamentoGlobal,
} from "@/hooks/useCatalogoGlobal";
import { TreinamentoTipo, TreinamentoStatus } from "@/hooks/useTreinamentos";

const formSchema = z.object({
  titulo: z.string().min(2, "Título deve ter pelo menos 2 caracteres"),
  descricao: z.string().optional(),
  tipo: z.enum(["arquivo", "link", "video", "pdf", "ppt"] as const),
  url_conteudo: z.string().optional(),
  categoria_id: z.string().optional(),
  duracao_estimada_minutos: z.coerce.number().min(1, "Duração mínima é de 1 minuto").optional(),
  nivel: z.string().optional(),
  gera_certificado: z.boolean().default(true),
  validade_meses: z.coerce.number().min(1, "Validade mínima é de 1 mês").optional().nullable(),
  status: z.enum(["rascunho", "publicado", "arquivado"] as const).default("rascunho"),
});

type FormData = z.infer<typeof formSchema>;

interface TreinamentoGlobalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinamentoToEdit?: TreinamentoGlobal | null;
}

export function TreinamentoGlobalFormDialog({
  open,
  onOpenChange,
  treinamentoToEdit,
}: TreinamentoGlobalFormDialogProps) {
  const { data: categoriasPlataforma } = useCategoriasPlataforma();
  const createTreinamento = useCreateTreinamentoGlobal();
  const updateTreinamento = useUpdateTreinamentoGlobal();
  const uploadFile = useUploadTreinamentoFile();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      tipo: "pdf",
      url_conteudo: "",
      categoria_id: "",
      duracao_estimada_minutos: undefined,
      nivel: "Iniciante",
      gera_certificado: true,
      validade_meses: null,
      status: "rascunho",
    },
  });

  const tipoValue = form.watch("tipo");
  const isLink = tipoValue === "link";
  const isFileBased = tipoValue === "pdf" || tipoValue === "ppt" || tipoValue === "video" || tipoValue === "arquivo";

  // Sincronizar dados ao abrir em modo edição
  useEffect(() => {
    if (treinamentoToEdit) {
      form.reset({
        titulo: treinamentoToEdit.titulo,
        descricao: treinamentoToEdit.descricao || "",
        tipo: treinamentoToEdit.tipo,
        url_conteudo: treinamentoToEdit.url_conteudo || "",
        categoria_id: treinamentoToEdit.categoria_id || "",
        duracao_estimada_minutos: treinamentoToEdit.duracao_estimada_minutos || undefined,
        nivel: treinamentoToEdit.nivel || "Iniciante",
        gera_certificado: treinamentoToEdit.tipo === "link" ? false : treinamentoToEdit.gera_certificado,
        validade_meses: treinamentoToEdit.validade_meses || null,
        status: treinamentoToEdit.status,
      });
      setSelectedFile(null);
    } else {
      form.reset({
        titulo: "",
        descricao: "",
        tipo: "pdf",
        url_conteudo: "",
        categoria_id: "",
        duracao_estimada_minutos: undefined,
        nivel: "Iniciante",
        gera_certificado: true,
        validade_meses: null,
        status: "rascunho",
      });
      setSelectedFile(null);
    }
  }, [treinamentoToEdit, form, open]);

  // Se tipo mudar para 'link', força gera_certificado para false
  useEffect(() => {
    if (isLink) {
      form.setValue("gera_certificado", false);
    }
  }, [isLink, form]);

  const onSubmit = async (data: FormData) => {
    if (isFileBased && !selectedFile && !treinamentoToEdit?.url_conteudo) {
      form.setError("root", { message: "Selecione um arquivo de mídia/documento para continuar" });
      return;
    }

    if (isLink && !data.url_conteudo) {
      form.setError("url_conteudo", { message: "A URL externa é obrigatória" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (treinamentoToEdit) {
        // Modo Edição
        let finalUrl = data.url_conteudo || treinamentoToEdit.url_conteudo;
        let finalNomeArquivo = treinamentoToEdit.nome_arquivo;

        if (isFileBased && selectedFile) {
          const uploadResult = await uploadFile.mutateAsync({
            treinamentoId: treinamentoToEdit.id,
            file: selectedFile,
            fileType: data.tipo as UploadableFileType,
          });
          finalUrl = uploadResult.filePath;
          finalNomeArquivo = uploadResult.fileName;
        }

        await updateTreinamento.mutateAsync({
          id: treinamentoToEdit.id,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          url_conteudo: finalUrl,
          nome_arquivo: finalNomeArquivo,
          categoria_id: data.categoria_id || null,
          duracao_estimada_minutos: data.duracao_estimada_minutos || null,
          nivel: data.nivel || null,
          gera_certificado: isLink ? false : data.gera_certificado,
          validade_meses: data.validade_meses || null,
          status: data.status,
        });
      } else {
        // Modo Criação
        const novo = await createTreinamento.mutateAsync({
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo,
          url_conteudo: isLink ? data.url_conteudo : null,
          categoria_id: data.categoria_id || null,
          duracao_estimada_minutos: data.duracao_estimada_minutos || null,
          nivel: data.nivel || null,
          gera_certificado: isLink ? false : data.gera_certificado,
          validade_meses: data.validade_meses || null,
          status: data.status,
        });

        if (isFileBased && selectedFile && novo?.id) {
          const uploadResult = await uploadFile.mutateAsync({
            treinamentoId: novo.id,
            file: selectedFile,
            fileType: data.tipo as UploadableFileType,
          });

          await updateTreinamento.mutateAsync({
            id: novo.id,
            url_conteudo: uploadResult.filePath,
            nome_arquivo: uploadResult.fileName,
          });
        }
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao salvar treinamento global:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <DialogTitle>
              {treinamentoToEdit ? "Editar Treinamento da Plataforma" : "Novo Treinamento da Plataforma"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Este treinamento será disponibilizado no Catálogo Global com origem{" "}
            <Badge variant="outline" className="font-mono text-xs">plataforma</Badge> (company_id: NULL) para habilitação pelos clientes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}

            {/* Título */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Treinamento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: NR-1 — Gerenciamento de Riscos Ocupacionais" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria da Plataforma & Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria da Plataforma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria global" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriasPlataforma?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: cat.cor }}
                              />
                              {cat.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Categorias com taxonomia global</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conteúdo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o formato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pdf">Documento PDF (Apostila)</SelectItem>
                        <SelectItem value="video">Vídeo (MP4)</SelectItem>
                        <SelectItem value="ppt">Apresentação PPT</SelectItem>
                        <SelectItem value="arquivo">Outro Arquivo</SelectItem>
                        <SelectItem value="link">Link Externo (Web / Plataforma parceira)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Upload ou URL do Link */}
            {isLink ? (
              <FormField
                control={form.control}
                name="url_conteudo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Conteúdo Externo *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://exemplo.gov.br/treinamento" {...field} />
                    </FormControl>
                    <FormDescription>
                      Endereço web que será aberto pelos colaboradores quando o treinamento for iniciado.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-2">
                <Label>Arquivo de Conteúdo ({tipoValue.toUpperCase()})</Label>
                <FileUploadArea
                  fileType={tipoValue as UploadableFileType}
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  existingFileName={treinamentoToEdit?.nome_arquivo || undefined}
                />
              </div>
            )}

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Pedagógica</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Resumo dos objetivos de aprendizagem, público-alvo e conteúdo programático..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duração & Validade em Meses */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duracao_estimada_minutos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Horária (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 60"
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
                name="validade_meses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (Meses)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 12 (1 ano)"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Para reciclagens periódicas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status de Publicação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho (oculto aos clientes)</SelectItem>
                        <SelectItem value="publicado">Publicado (disponível no catálogo)</SelectItem>
                        <SelectItem value="arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emissão de Certificado */}
            <div className="p-4 border rounded-lg bg-card space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <Label className="font-medium text-sm">Emissão de Certificado de Conclusão</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gera certificado auditável com hash verificador após a conclusão.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="gera_certificado"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLink}
                    />
                  )}
                />
              </div>

              {isLink && (
                <Alert className="mt-2 py-2 bg-muted/60 border-amber-200 dark:border-amber-900">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    Regra mandatória: Treinamentos de <strong>Link Externo</strong> não emitem certificados de conformidade NR-1 na plataforma.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {treinamentoToEdit ? "Salvar Alterações" : "Publicar no Catálogo Global"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
