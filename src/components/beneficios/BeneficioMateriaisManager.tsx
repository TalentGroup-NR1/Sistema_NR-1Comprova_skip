import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  useBeneficioMateriais, 
  useCreateBeneficioMaterial, 
  useDeleteBeneficioMaterial 
} from "@/hooks/useBeneficioMateriais";
import { 
  Plus, 
  Trash2, 
  FileText, 
  FileSpreadsheet, 
  Video, 
  Upload,
  Loader2,
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BeneficioMateriaisManagerProps {
  beneficioId: string;
}

export function BeneficioMateriaisManager({ beneficioId }: BeneficioMateriaisManagerProps) {
  const { data: materiais, isLoading } = useBeneficioMateriais(beneficioId);
  const createMaterial = useCreateBeneficioMaterial();
  const deleteMaterial = useDeleteBeneficioMaterial();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [modo, setModo] = useState<'arquivo' | 'link'>('arquivo');
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkExterno, setLinkExterno] = useState("");
  const [deleteId, setDeleteId] = useState<{ id: string; url: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!titulo) {
        setTitulo(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const canSubmit = () => {
    if (!titulo.trim()) return false;
    if (modo === 'arquivo') return !!selectedFile;
    return linkExterno.trim() !== '' && isValidUrl(linkExterno.trim());
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    await createMaterial.mutateAsync({
      beneficioId,
      file: modo === 'arquivo' ? selectedFile! : undefined,
      linkExterno: modo === 'link' ? linkExterno.trim() : undefined,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
    });

    resetForm();
  };

  const resetForm = () => {
    setShowAddForm(false);
    setModo('arquivo');
    setTitulo("");
    setDescricao("");
    setSelectedFile(null);
    setLinkExterno("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMaterial.mutateAsync({
        id: deleteId.id,
        arquivoUrl: deleteId.url,
        beneficioId,
      });
      setDeleteId(null);
    }
  };

  const MaterialIcon = ({ tipo }: { tipo: string }) => {
    switch (tipo) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'ppt': return <FileSpreadsheet className="h-5 w-5 text-orange-500" />;
      case 'video': return <Video className="h-5 w-5 text-blue-500" />;
      case 'link': return <LinkIcon className="h-5 w-5 text-green-500" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'pdf': return 'PDF';
      case 'ppt': return 'Apresentação';
      case 'video': return 'Vídeo';
      case 'link': return 'Link externo';
      default: return tipo;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Adicione materiais educativos como PDFs, apresentações, vídeos ou links externos.
        </p>
        {!showAddForm && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-4">
            {/* Modo toggle */}
            <div>
              <Label className="mb-2 block">Tipo de material</Label>
              <RadioGroup
                value={modo}
                onValueChange={(v) => setModo(v as 'arquivo' | 'link')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="arquivo" id="modo-arquivo" />
                  <Label htmlFor="modo-arquivo" className="cursor-pointer flex items-center gap-1">
                    <Upload className="h-4 w-4" />
                    Arquivo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="link" id="modo-link" />
                  <Label htmlFor="modo-link" className="cursor-pointer flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    Link externo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {modo === 'arquivo' ? (
              <div>
                <Label>Arquivo *</Label>
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ppt,.pptx,.mp4"
                    onChange={handleFileChange}
                    className="hidden"
                    id="material-file"
                  />
                  <label 
                    htmlFor="material-file" 
                    className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {selectedFile ? (
                      <span className="text-sm">{selectedFile.name}</span>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          PDF, PPT ou MP4 (máx. 50MB PDF/PPT, 500MB vídeo)
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="link-externo">URL do link *</Label>
                <Input 
                  id="link-externo"
                  value={linkExterno}
                  onChange={(e) => setLinkExterno(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  type="url"
                />
                {linkExterno && !isValidUrl(linkExterno) && (
                  <p className="text-sm text-destructive mt-1">URL inválida</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input 
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={modo === 'link' ? "Ex: Vídeo explicativo no YouTube" : "Ex: Guia de Primeiro Acesso"}
              />
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea 
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição do material..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit() || createMaterial.isPending}
              >
                {createMaterial.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Salvar Material
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {materiais && materiais.length > 0 ? (
        <div className="space-y-2">
          {materiais.map((material) => (
            <Card key={material.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MaterialIcon tipo={material.tipo} />
                  <div>
                    <p className="font-medium text-sm">{material.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTipoLabel(material.tipo)}
                      {material.descricao && ` • ${material.descricao}`}
                    </p>
                    {material.tipo === 'link' && material.link_externo && (
                      <a 
                        href={material.link_externo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {material.link_externo.length > 50 
                          ? material.link_externo.substring(0, 50) + '...' 
                          : material.link_externo}
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId({ id: material.id, url: material.arquivo_url })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !showAddForm ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum material cadastrado</p>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O material será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
