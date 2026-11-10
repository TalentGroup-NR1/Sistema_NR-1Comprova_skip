import { useState, useEffect } from "react";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "./RichTextEditor";
import { 
  useCreateComunicado, 
  useUpdateComunicado, 
  useUploadAnexo, 
  useDeleteAnexo,
  getSignedUrl,
  type ComunicadoWithAnexos 
} from "@/hooks/useComunicados";
import { useToast } from "@/hooks/use-toast";
import { useColaboradores } from "@/hooks/useColaboradores";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, FileIcon, Save, Send, Clock, User, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { GlobalReplicationToggle } from "@/components/shared/GlobalReplicationToggle";
import { useReplicateComunicado } from "@/hooks/useGlobalReplication";

interface ComunicadoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comunicado?: ComunicadoWithAnexos | null;
}

export function ComunicadoFormDialog({ open, onOpenChange, comunicado }: ComunicadoFormDialogProps) {
  const { user, isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const { data: colaboradores } = useColaboradores();
  const createMutation = useCreateComunicado();
  const updateMutation = useUpdateComunicado();
  const uploadAnexoMutation = useUploadAnexo();
  const deleteAnexoMutation = useDeleteAnexo();
  const replicateComunicado = useReplicateComunicado();
  const { toast } = useToast();

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [dataPublicacao, setDataPublicacao] = useState("");
  const [publicoAlvoTipo, setPublicoAlvoTipo] = useState<"todos" | "departamento" | "cargo">("todos");
  const [publicoAlvoValor, setPublicoAlvoValor] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [exigeLeitura, setExigeLeitura] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [downloadingAnexo, setDownloadingAnexo] = useState<string | null>(null);
  const [replicateGlobally, setReplicateGlobally] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleViewAnexo = async (filePath: string, fileName: string) => {
    try {
      const signedUrl = await getSignedUrl(filePath);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast({ title: "Erro ao abrir anexo", description: "Não foi possível gerar o link.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao abrir anexo", description: "Ocorreu um erro.", variant: "destructive" });
    }
  };

  const isEditing = !!comunicado;
  const [autorNome, setAutorNome] = useState<string>(user?.email?.split('@')[0] || 'Autor');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && prof?.full_name) {
        setAutorNome(prof.full_name);
        return;
      }
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled && colab?.full_name) setAutorNome(colab.full_name);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const departments = [...new Set(colaboradores?.map(c => c.department).filter(Boolean) || [])];
  const jobTitles = [...new Set(colaboradores?.map(c => c.job_title).filter(Boolean) || [])];

  useEffect(() => {
    if (comunicado) {
      setTitulo(comunicado.titulo);
      setConteudo(comunicado.conteudo);
      setDataPublicacao(comunicado.data_publicacao ? format(new Date(comunicado.data_publicacao), "yyyy-MM-dd'T'HH:mm") : "");
      setPublicoAlvoTipo(comunicado.publico_alvo_tipo);
      setPublicoAlvoValor(comunicado.publico_alvo_valor || "");
      setIsPinned(comunicado.is_pinned);
      setExigeLeitura((comunicado as any).exige_leitura ?? true);
      setImageUrl(comunicado.image_url || null);
      setReplicateGlobally(false);
    } else {
      resetForm();
    }
  }, [comunicado, open]);

  const resetForm = () => {
    setTitulo("");
    setConteudo("");
    setDataPublicacao("");
    setPublicoAlvoTipo("todos");
    setPublicoAlvoValor("");
    setIsPinned(false);
    setExigeLeitura(true);
    setPendingFiles([]);
    setReplicateGlobally(false);
    setImageUrl(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }

    setUploadingImage(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `covers/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from('comunicados_media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('comunicados_media')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast({ title: "Imagem enviada com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao enviar imagem", description: error.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
  };

  const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleImageUpload({ target: input } as any);
    }
  };

  const handleSubmit = async (status: "rascunho" | "publicado" | "agendado") => {
    if (!effectiveCompanyId || !user) return;
    if (!titulo.trim()) return;

    const dataPublicacaoValue = status === 'rascunho' 
      ? null 
      : status === 'publicado' 
        ? new Date().toISOString() 
        : dataPublicacao || new Date().toISOString();

    const data = {
      company_id: effectiveCompanyId,
      titulo,
      conteudo,
      autor_id: user.id,
      autor_nome: autorNome,
      status,
      data_publicacao: dataPublicacaoValue,
      publico_alvo_tipo: publicoAlvoTipo,
      publico_alvo_valor: publicoAlvoTipo === 'todos' ? null : publicoAlvoValor,
      is_pinned: isPinned,
      exige_leitura: exigeLeitura,
      image_url: imageUrl || '',
    } as any;

    try {
      let comunicadoId: string;
      
      if (isEditing && comunicado) {
        await updateMutation.mutateAsync({ id: comunicado.id, ...data });
        comunicadoId = comunicado.id;
      } else {
        const result = await createMutation.mutateAsync(data);
        comunicadoId = result.id;

        if (replicateGlobally && effectiveCompanyId) {
          await replicateComunicado.mutateAsync({
            comunicadoId: comunicadoId,
            sourceCompanyId: effectiveCompanyId,
          });
        }
      }

      for (const file of pendingFiles) {
        await uploadAnexoMutation.mutateAsync({ comunicadoId, file });
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving comunicado:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteAnexo = async (anexoId: string, urlArquivo: string) => {
    await deleteAnexoMutation.mutateAsync({ id: anexoId, urlArquivo });
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || uploadAnexoMutation.isPending || replicateComunicado.isPending;
  const canSchedule = !!dataPublicacao;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Comunicado' : 'Novo Comunicado'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Autor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Autor
            </Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {autorNome.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium">{autorNome}</span>
              <Badge variant="secondary" className="ml-auto">RH/Admin</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Comunicado *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Digite o título do comunicado"
              required
            />
          </div>

          {/* Image Upload - Cover */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Imagem de Capa / Banner
            </Label>
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <SignedComunicadoImg
                  src={imageUrl}
                  alt="Capa do comunicado"
                  className="w-full h-48 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="cover-image-upload"
                />
                <label
                  htmlFor="cover-image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-10 w-10 mb-3 animate-spin text-primary" />
                  ) : (
                    <ImageIcon className="h-10 w-10 mb-3" />
                  )}
                  <span className="text-sm font-medium">
                    {uploadingImage ? 'Enviando...' : 'Arraste ou clique para adicionar imagem de capa'}
                  </span>
                  <span className="text-xs mt-1">PNG, JPG, WEBP</span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Conteúdo do Comunicado *</Label>
            <RichTextEditor content={conteudo} onChange={setConteudo} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publicoAlvo">Público-Alvo</Label>
              <Select value={publicoAlvoTipo} onValueChange={(v) => {
                setPublicoAlvoTipo(v as typeof publicoAlvoTipo);
                setPublicoAlvoValor("");
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Colaboradores</SelectItem>
                  <SelectItem value="departamento">Por Departamento</SelectItem>
                  <SelectItem value="cargo">Por Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {publicoAlvoTipo !== 'todos' && (
              <div className="space-y-2">
                <Label htmlFor="publicoAlvoValor">
                  {publicoAlvoTipo === 'departamento' ? 'Selecione o Departamento' : 'Selecione o Cargo'}
                </Label>
                <Select value={publicoAlvoValor} onValueChange={setPublicoAlvoValor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(publicoAlvoTipo === 'departamento' ? departments : jobTitles).map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataPublicacao">Data de Publicação (para agendamento)</Label>
            <Input
              id="dataPublicacao"
              type="datetime-local"
              value={dataPublicacao}
              onChange={(e) => setDataPublicacao(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defina uma data futura para agendar a publicação do comunicado.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
            <Label htmlFor="isPinned">Fixar comunicado no topo</Label>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-border bg-muted/30 p-3">
            <Switch
              id="exigeLeitura"
              checked={exigeLeitura}
              onCheckedChange={setExigeLeitura}
            />
            <div className="space-y-0.5">
              <Label htmlFor="exigeLeitura" className="cursor-pointer">
                Exigir confirmação de leitura (bloqueio de tela)
              </Label>
              <p className="text-xs text-muted-foreground">
                O colaborador verá um modal obrigatório ao entrar no sistema e precisará
                rolar até o fim para confirmar.
              </p>
            </div>
          </div>

          {isAdminMaster && !isEditing && (
            <GlobalReplicationToggle
              sourceCompanyId={effectiveCompanyId}
              enabled={replicateGlobally}
              onEnabledChange={setReplicateGlobally}
              disabled={isLoading}
            />
          )}

          {/* Anexos existentes */}
          {isEditing && comunicado?.comunicados_anexos && comunicado.comunicados_anexos.length > 0 && (
            <div className="space-y-2">
              <Label>Anexos Existentes</Label>
              <div className="flex flex-wrap gap-2">
                {comunicado.comunicados_anexos.map((anexo) => (
                  <Badge key={anexo.id} variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                    <FileIcon className="h-3 w-3" />
                    <button
                      type="button"
                      onClick={() => handleViewAnexo(anexo.url_arquivo, anexo.nome_arquivo)}
                      className="hover:underline"
                    >
                      {anexo.nome_arquivo}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAnexo(anexo.id, anexo.url_arquivo)}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Upload de novos anexos */}
          <div className="space-y-2">
            <Label>Anexos (PDFs, Imagens, Documentos)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-10 w-10 mb-3" />
                <span className="text-sm font-medium">Clique para adicionar arquivos</span>
                <span className="text-xs mt-1">PDF, DOC, XLS, PNG, JPG</span>
              </label>
            </div>
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {pendingFiles.map((file, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-2 py-1.5 px-3">
                    <FileIcon className="h-3 w-3" />
                    {file.name}
                    <button type="button" onClick={() => removePendingFile(index)} className="hover:text-destructive ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="sm:order-1"
            >
              Cancelar
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto sm:order-2">
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => handleSubmit('rascunho')}
                disabled={isLoading || !titulo.trim()}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Salvar Rascunho
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => handleSubmit('agendado')}
                disabled={isLoading || !titulo.trim() || !canSchedule}
                className="border-warning text-warning hover:bg-warning/10"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Clock className="h-4 w-4 mr-2" />
                Agendar Publicação
              </Button>
              
              <Button 
                type="button"
                onClick={() => handleSubmit('publicado')}
                disabled={isLoading || !titulo.trim()}
                className="gradient-primary text-primary-foreground"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Publicar Agora
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
