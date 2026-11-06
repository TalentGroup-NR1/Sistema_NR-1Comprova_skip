import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCreateTreinamento, useCategoriasTreinamento, useUpdateTreinamento } from "@/hooks/useTreinamentos";
import { useUploadTreinamentoFile, UploadableFileType } from "@/hooks/useTreinamentoStorage";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/hooks/useAuth";
import { FileUploadArea } from "./FileUploadArea";
import { Loader2, Info } from "lucide-react";

type TipoTreinamento = "link" | "pdf" | "ppt" | "video";

const CONTRACT_TYPES = ["CLT", "PJ", "Estágio", "Outros"] as const;

const formSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  tipo: z.enum(["link", "pdf", "ppt", "video"]),
  url_conteudo: z.string().optional(),
  categoria_id: z.string().optional(),
  duracao_estimada_minutos: z.number().optional(),
  nivel: z.string().optional(),
  obrigatorio: z.boolean().default(false),
  target_company_ids: z.array(z.string()).default([]),
  target_contract_types: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface TreinamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TreinamentoFormDialog({ open, onOpenChange }: TreinamentoFormDialogProps) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { role } = useAuth();
  const isAdminMaster = role === "admin_master";
  const { data: companies } = useCompanies();
  const { data: categorias } = useCategoriasTreinamento();
  const createTreinamento = useCreateTreinamento();
  const updateTreinamento = useUpdateTreinamento();
  const uploadFile = useUploadTreinamentoFile();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      tipo: "link",
      url_conteudo: "",
      categoria_id: "",
      duracao_estimada_minutos: undefined,
      nivel: "",
      obrigatorio: false,
      target_company_ids: [],
      target_contract_types: [],
    },
  });

  const tipoValue = form.watch("tipo") as TipoTreinamento;
  const isFileType = tipoValue === "pdf" || tipoValue === "ppt" || tipoValue === "video";

  const onSubmit = async (data: FormData) => {
    if (!effectiveCompanyId) return;

    if (isFileType && !selectedFile) {
      form.setError("root", { message: "Selecione um arquivo para continuar" });
      return;
    }

    if (!isFileType && !data.url_conteudo) {
      form.setError("url_conteudo", { message: "URL é obrigatória" });
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedFilePath: string | null = null;
      let uploadedFileName: string | null = null;
      const generatedId = crypto.randomUUID();

      if (isFileType && selectedFile) {
        const uploadResult = await uploadFile.mutateAsync({
          treinamentoId: generatedId,
          file: selectedFile,
          fileType: data.tipo as UploadableFileType,
        });
        uploadedFilePath = uploadResult.filePath;
        uploadedFileName = uploadResult.fileName;
      }

      const finalUrl = isFileType ? uploadedFilePath : (data.url_conteudo || null);
      const finalNome = isFileType ? uploadedFileName : null;

      const treinamento = await createTreinamento.mutateAsync({
        id: generatedId,
        company_id: effectiveCompanyId,
        titulo: data.titulo,
        descricao: data.descricao || null,
        tipo: data.tipo as 'link' | 'pdf' | 'ppt' | 'video',
        url_conteudo: finalUrl,
        categoria_id: data.categoria_id || null,
        duracao_estimada_minutos: data.duracao_estimada_minutos || null,
        nivel: data.nivel || null,
        nome_arquivo: finalNome,
        idioma: "Português",
        tags: null,
        tempo_minimo_minutos: 0,
        quiz_obrigatorio: false,
        termo_ciencia_obrigatorio: false,
        texto_termo_ciencia: null,
        status: "rascunho",
        publicado_em: null,
        publicado_por_user_id: null,
        obrigatorio: data.obrigatorio,
        target_company_ids: isAdminMaster && data.target_company_ids.length > 0 ? data.target_company_ids : null,
        target_contract_types: data.target_contract_types.length > 0 ? data.target_contract_types : null,
        capa_path: null,
        destaque: false,
      } as any);

      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating training:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Treinamento</DialogTitle>
          <DialogDescription>
            Crie um novo treinamento para disponibilizar à sua equipe.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Introdução à Segurança do Trabalho" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedFile(null);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="link">Link externo</SelectItem>
                        <SelectItem value="pdf">Arquivo PDF</SelectItem>
                        <SelectItem value="ppt">PowerPoint (PPT)</SelectItem>
                        <SelectItem value="video">Vídeo (MP4)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoria_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias?.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isFileType && (
              <FormField
                control={form.control}
                name="url_conteudo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      O link será aberto em uma nova aba quando o colaborador acessar.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isFileType && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tipoValue === "pdf" && "Arquivo PDF *"}
                  {tipoValue === "ppt" && "Arquivo PowerPoint *"}
                  {tipoValue === "video" && "Arquivo de Vídeo *"}
                </label>
                <FileUploadArea
                  fileType={tipoValue as UploadableFileType}
                  selectedFile={selectedFile}
                  onFileSelect={setSelectedFile}
                  disabled={isSubmitting}
                />
                {form.formState.errors.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
                )}
              </div>
            )}

            {/* Passo 4.1: Aviso após upload ou link preenchido */}
            {(selectedFile || (!isFileType && form.watch("url_conteudo"))) && (
              <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 p-3 text-xs text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                <span>
                  O arquivo será adicionado automaticamente como a primeira aula. Você pode criar módulos e aulas adicionais em <strong>Gerenciar → Currículo</strong>, e o quiz em <strong>Gerenciar → Quiz</strong>.
                </span>
              </div>
            )}

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o conteúdo do treinamento..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duracao_estimada_minutos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração estimada (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nivel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="básico">Básico</SelectItem>
                        <SelectItem value="intermediário">Intermediário</SelectItem>
                        <SelectItem value="avançado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* === Disponibilização === */}
            <div className="space-y-4 rounded-md border p-4 bg-muted/30">
              <div>
                <h4 className="text-sm font-semibold">Disponibilização</h4>
                <p className="text-xs text-muted-foreground">
                  Defina para quem este treinamento ficará disponível.
                </p>
              </div>

              <FormField
                control={form.control}
                name="obrigatorio"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border bg-background p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Treinamento obrigatório</FormLabel>
                      <FormDescription className="text-xs">
                        Será destacado no catálogo do colaborador.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isAdminMaster && (
                <FormField
                  control={form.control}
                  name="target_company_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresas com acesso</FormLabel>
                      <FormDescription className="text-xs">
                        Além da empresa de criação, marque outras empresas que poderão visualizar.
                        Deixe vazio para restringir apenas à empresa atual.
                      </FormDescription>
                      <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border bg-background p-2">
                        {companies?.map((c) => {
                          const checked = field.value?.includes(c.id);
                          return (
                            <div key={c.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`comp-${c.id}`}
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const next = new Set(field.value || []);
                                  if (v) next.add(c.id); else next.delete(c.id);
                                  field.onChange(Array.from(next));
                                }}
                              />
                              <Label htmlFor={`comp-${c.id}`} className="text-sm font-normal cursor-pointer">
                                {c.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="target_contract_types"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Público-alvo por vínculo</FormLabel>
                    <FormDescription className="text-xs">
                      Marque os vínculos que devem ver este treinamento. Vazio = todos.
                    </FormDescription>
                    <div className="flex flex-wrap gap-3 rounded-md border bg-background p-3">
                      {CONTRACT_TYPES.map((ct) => {
                        const checked = field.value?.includes(ct);
                        return (
                          <div key={ct} className="flex items-center gap-2">
                            <Checkbox
                              id={`ct-${ct}`}
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = new Set(field.value || []);
                                if (v) next.add(ct); else next.delete(ct);
                                field.onChange(Array.from(next));
                              }}
                            />
                            <Label htmlFor={`ct-${ct}`} className="text-sm font-normal cursor-pointer">
                              {ct}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploadFile.isPending ? "Enviando arquivo..." : "Criando..."}
                  </>
                ) : (
                  "Criar Treinamento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
