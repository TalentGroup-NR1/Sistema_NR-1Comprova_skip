import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Treinamento, useUpdateTreinamento, useCategoriasTreinamento } from "@/hooks/useTreinamentos";
import { 
  useUploadTreinamentoFile, 
  useDeleteTreinamentoFile, 
  getSignedUrlTreinamento,
  isStoragePath,
  UploadableFileType
} from "@/hooks/useTreinamentoStorage";
import { FileUploadArea } from "../FileUploadArea";
import { FileText, Link, Video, Save, Download, Trash2, Loader2, FileType2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TreinamentoConteudoTabProps {
  treinamento: Treinamento;
}

export function TreinamentoConteudoTab({ treinamento }: TreinamentoConteudoTabProps) {
  const { data: categorias } = useCategoriasTreinamento();
  const updateTreinamento = useUpdateTreinamento();
  const uploadFile = useUploadTreinamentoFile();
  const deleteFile = useDeleteTreinamentoFile();

  const [titulo, setTitulo] = useState(treinamento.titulo);
  const [descricao, setDescricao] = useState(treinamento.descricao || "");
  const [urlConteudo, setUrlConteudo] = useState(treinamento.url_conteudo || "");
  const [categoriaId, setCategoriaId] = useState(treinamento.categoria_id || "");
  const [duracaoEstimada, setDuracaoEstimada] = useState(treinamento.duracao_estimada_minutos?.toString() || "");
  const [nivel, setNivel] = useState(treinamento.nivel || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Determine if current content is a file upload or external URL
  const isFileType = treinamento.tipo === "pdf" || treinamento.tipo === "ppt" || treinamento.tipo === "video";
  const hasUploadedFile = isFileType && treinamento.url_conteudo && isStoragePath(treinamento.url_conteudo);

  const handleSave = async () => {
    setIsUploading(true);
    try {
      let newUrlConteudo = urlConteudo;
      let newNomeArquivo = treinamento.nome_arquivo;

      // If there's a new file to upload
      if (selectedFile && isFileType) {
        // Delete old file if it exists
        if (hasUploadedFile && treinamento.url_conteudo) {
          await deleteFile.mutateAsync(treinamento.url_conteudo);
        }

        // Upload new file
        const uploadResult = await uploadFile.mutateAsync({
          treinamentoId: treinamento.id,
          file: selectedFile,
          fileType: treinamento.tipo as UploadableFileType,
        });

        newUrlConteudo = uploadResult.filePath;
        newNomeArquivo = uploadResult.fileName;
      }

      await updateTreinamento.mutateAsync({
        id: treinamento.id,
        titulo,
        descricao: descricao || null,
        url_conteudo: newUrlConteudo || null,
        categoria_id: categoriaId || null,
        duracao_estimada_minutos: duracaoEstimada ? parseInt(duracaoEstimada) : null,
        nivel: nivel || null,
        nome_arquivo: newNomeArquivo,
      });

      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = async () => {
    if (!treinamento.url_conteudo || !hasUploadedFile) return;

    const signedUrl = await getSignedUrlTreinamento(treinamento.url_conteudo);
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    } else {
      toast.error("Não foi possível gerar o link de download");
    }
  };

  const handleDeleteFile = async () => {
    if (!treinamento.url_conteudo || !hasUploadedFile) return;

    try {
      await deleteFile.mutateAsync(treinamento.url_conteudo);
      await updateTreinamento.mutateAsync({
        id: treinamento.id,
        url_conteudo: null,
        nome_arquivo: null,
      });
      toast.success("Arquivo removido com sucesso");
    } catch (error) {
      toast.error("Erro ao remover arquivo");
    }
  };

  const tipoIcons = { 
    arquivo: FileText, 
    link: Link, 
    video: Video,
    pdf: FileText,
    ppt: FileType2,
  };
  const TipoIcon = tipoIcons[treinamento.tipo] || FileText;

  const getTipoLabel = () => {
    switch (treinamento.tipo) {
      case "pdf": return "PDF";
      case "ppt": return "PowerPoint";
      case "video": return "Vídeo";
      case "link": return "Link Externo";
      default: return "Arquivo";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TipoIcon className="h-5 w-5" />
          Conteúdo do Treinamento ({getTipoLabel()})
        </CardTitle>
        <CardDescription>Configure as informações básicas do treinamento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categorias?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content field - URL for link, file upload for file types */}
        {!isFileType ? (
          <div className="space-y-2">
            <Label>URL do conteúdo *</Label>
            <Input value={urlConteudo} onChange={(e) => setUrlConteudo(e.target.value)} placeholder="https://..." />
          </div>
        ) : (
          <div className="space-y-4">
            <Label>Arquivo</Label>
            
            {/* Show current file if exists */}
            {hasUploadedFile && treinamento.nome_arquivo && !selectedFile && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                <TipoIcon className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{treinamento.nome_arquivo}</p>
                  <p className="text-sm text-muted-foreground">Arquivo atual</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadFile}>
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação irá remover o arquivo "{treinamento.nome_arquivo}" permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteFile}>Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* File upload area */}
            {(!hasUploadedFile || selectedFile) && (
              <FileUploadArea
                fileType={treinamento.tipo as UploadableFileType}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                existingFileName={hasUploadedFile ? treinamento.nome_arquivo : undefined}
                disabled={isUploading}
              />
            )}

            {/* Option to replace file */}
            {hasUploadedFile && !selectedFile && (
              <p className="text-sm text-muted-foreground">
                Para substituir o arquivo atual, use o componente de upload abaixo ou clique em "Remover" acima.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Duração estimada (minutos)</Label>
            <Input type="number" value={duracaoEstimada} onChange={(e) => setDuracaoEstimada(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="básico">Básico</SelectItem>
                <SelectItem value="intermediário">Intermediário</SelectItem>
                <SelectItem value="avançado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateTreinamento.isPending || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploadFile.isPending ? "Enviando arquivo..." : "Salvando..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
