import { useEffect, useState } from "react";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, ImageIcon, X, Calendar as CalIcon, Paperclip, Upload, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Campanha,
  CampanhaMaterial,
  useCreateCampanha,
  useUpdateCampanha,
  computeStatus,
} from "@/hooks/useCampanhasComunicados";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campanha?: Campanha | null;
}

export function CampanhaFormDialog({ open, onOpenChange, campanha }: Props) {
  const { toast } = useToast();
  const createMut = useCreateCampanha();
  const updateMut = useUpdateCampanha();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [uploading, setUploading] = useState(false);
  const [materiais, setMateriais] = useState<CampanhaMaterial[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [exigeLeitura, setExigeLeitura] = useState(true);

  useEffect(() => {
    if (campanha) {
      setTitulo(campanha.titulo);
      setDescricao(campanha.descricao ?? "");
      setImagemUrl(campanha.imagem_url);
      setDataInicio(campanha.data_inicio);
      setDataFim(campanha.data_fim);
      setMateriais(Array.isArray(campanha.materiais) ? campanha.materiais : []);
      setExigeLeitura(campanha.exige_leitura ?? true);
    } else {
      setTitulo("");
      setDescricao("");
      setImagemUrl(null);
      setDataInicio("");
      setDataFim("");
      setMateriais([]);
      setExigeLeitura(true);
    }
  }, [campanha, open]);

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingMaterial(true);
    try {
      const novos: CampanhaMaterial[] = [];
      for (const file of files) {
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `campanhas/materiais/${Date.now()}_${sanitized}`;
        const { error: upErr } = await supabase.storage
          .from("comunicados_media")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("comunicados_media").getPublicUrl(path);
        novos.push({ nome: file.name, url: data.publicUrl, tipo: file.type });
      }
      setMateriais((prev) => [...prev, ...novos]);
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMaterial(false);
      e.target.value = "";
    }
  };

  const removeMaterial = (idx: number) => {
    setMateriais((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `campanhas/${Date.now()}_${sanitized}`;
      const { error: upErr } = await supabase.storage
        .from("comunicados_media")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("comunicados_media").getPublicUrl(path);
      setImagemUrl(data.publicUrl);
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !dataInicio || !dataFim) {
      toast({ title: "Preencha título e datas", variant: "destructive" });
      return;
    }
    if (dataInicio > dataFim) {
      toast({ title: "A data de início precisa ser anterior à data de fim", variant: "destructive" });
      return;
    }
    try {
      if (campanha) {
        await updateMut.mutateAsync({
          id: campanha.id,
          titulo,
          descricao: descricao || null,
          imagem_url: imagemUrl,
          data_inicio: dataInicio,
          data_fim: dataFim,
          materiais,
          exige_leitura: exigeLeitura,
        });
      } else {
        await createMut.mutateAsync({
          titulo,
          descricao: descricao || null,
          imagem_url: imagemUrl,
          data_inicio: dataInicio,
          data_fim: dataFim,
          materiais,
          exige_leitura: exigeLeitura,
        });
      }
      onOpenChange(false);
    } catch {
      /* toast já disparado */
    }
  };

  const previewStatus = dataInicio && dataFim ? computeStatus(dataInicio, dataFim) : null;
  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campanha ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          <DialogDescription>
            Defina o período e o conteúdo visual da campanha.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Outubro Rosa 2026" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Mensagem curta da campanha..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de início *</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data de fim *</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Imagem da campanha
              </Label>
              {imagemUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <SignedComunicadoImg src={imagemUrl} alt="" className="w-full h-44 object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setImagemUrl(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    id="campanha-img"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <label
                    htmlFor="campanha-img"
                    className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <ImageIcon className="h-8 w-8 mb-2" />
                    )}
                    <span className="text-sm">{uploading ? "Enviando..." : "Clique para enviar"}</span>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Materiais para os colaboradores
              </Label>
              <p className="text-xs text-muted-foreground">
                Anexe PDFs, imagens ou documentos. Aparecerão para download no modal da campanha.
              </p>
              {materiais.length > 0 && (
                <ul className="space-y-1.5">
                  {materiais.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 border border-border rounded-md px-2 py-1.5 text-sm bg-muted/30"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">{m.nome}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => removeMaterial(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  id="campanha-materiais"
                  className="hidden"
                  onChange={handleMaterialUpload}
                />
                <label
                  htmlFor="campanha-materiais"
                  className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  {uploadingMaterial ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 mb-1" />
                  )}
                  <span className="text-sm">
                    {uploadingMaterial ? "Enviando..." : "Clique para enviar arquivos"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Pré-visualização</Label>
            <Card className="overflow-hidden">
              {imagemUrl ? (
                <SignedComunicadoImg src={imagemUrl} alt="" className="w-full h-44 object-cover" />
              ) : (
                <div className="w-full h-44 bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold leading-tight">
                    {titulo || "Título da campanha"}
                  </h3>
                  {previewStatus && (
                    <Badge
                      variant={
                        previewStatus === "ativo"
                          ? "default"
                          : previewStatus === "agendado"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {previewStatus}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {descricao || "Descrição curta da campanha aparece aqui."}
                </p>
                {dataInicio && dataFim && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalIcon className="h-3 w-3" />
                    {format(parseISO(dataInicio), "dd MMM", { locale: ptBR })} —{" "}
                    {format(parseISO(dataFim), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 mt-2">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="campanha-exige-leitura" className="text-sm font-medium cursor-pointer">
                Exigir confirmação de leitura
              </Label>
              <Switch
                id="campanha-exige-leitura"
                checked={exigeLeitura}
                onCheckedChange={setExigeLeitura}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quando ativada, a campanha trava a tela do colaborador no login até a confirmação (com scroll até o fim).
            </p>
          </div>
        </div>


        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {campanha ? "Salvar alterações" : "Criar campanha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
