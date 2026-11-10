import { useEffect, useRef, useState } from "react";
import { Upload, Link as LinkIcon, X, FileIcon, Loader2, Globe, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CATEGORIAS_CUIDAR,
  CUIDAR_MAX_BYTES,
  useGerenciarConteudos,
  uploadCuidarArquivo,
  uploadCuidarCapa,
  useCuidarCapaUrl,
  sanitizeExternalUrl,
  formatarTamanho,
  type CuidarConteudo,
  type CuidarConteudoInput,
  type CuidarConteudoOrigem,
  type CuidarConteudoTipo,
} from "@/hooks/useCuidarConteudos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conteudo?: CuidarConteudo | null;
}

const ACCEPT_BY_TIPO: Record<CuidarConteudoTipo, string> = {
  video: "video/mp4,video/webm,video/quicktime,video/x-matroska",
  cartilha: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  artigo: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg",
};

interface FormState {
  titulo: string;
  descricao: string;
  tipo: CuidarConteudoTipo;
  categoria: string;
  status: "ativo" | "inativo";
  origem: CuidarConteudoOrigem;
  url: string;
  storage_path: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  arquivo_nome: string | null;
  capa_path: string | null;
  conteudo_detalhado: string;
  parceiro_nome: string;
  parceiro_url: string;
  parceiro_cta: string;
  permite_download: boolean;
  destaque: boolean;
  duracao_min: string;
}

const emptyState: FormState = {
  titulo: "",
  descricao: "",
  tipo: "video",
  categoria: "Bem-estar",
  status: "ativo",
  origem: "url",
  url: "",
  storage_path: null,
  mime_type: null,
  tamanho_bytes: null,
  arquivo_nome: null,
  capa_path: null,
  conteudo_detalhado: "",
  parceiro_nome: "",
  parceiro_url: "",
  parceiro_cta: "",
  permite_download: true,
  destaque: false,
  duracao_min: "",
};

export function ConteudoFormDialog({ open, onOpenChange, conteudo }: Props) {
  const companyId = useEffectiveCompanyId();
  const { isAdminMaster } = useAuth();
  const [form, setForm] = useState<FormState>(emptyState);
  const [categoriaOutra, setCategoriaOutra] = useState("");
  const [uploading, setUploading] = useState(false);
  const [originalStoragePath, setOriginalStoragePath] = useState<string | null>(null);
  const [originalCapaPath, setOriginalCapaPath] = useState<string | null>(null);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const capaInputRef = useRef<HTMLInputElement>(null);
  const [replicarGlobalFlag, setReplicarGlobalFlag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: capaPreviewUrl } = useCuidarCapaUrl(form.capa_path);
  const { criar, atualizar, replicarGlobal } = useGerenciarConteudos();
  const isEdit = !!conteudo;
  const jaGlobal = !!conteudo && conteudo.company_id === null;

  useEffect(() => {
    if (!open) return;
    if (conteudo) {
      const isPreset = CATEGORIAS_CUIDAR.includes(conteudo.categoria);
      setForm({
        titulo: conteudo.titulo,
        descricao: conteudo.descricao ?? "",
        tipo: conteudo.tipo,
        categoria: isPreset ? conteudo.categoria : "Outros",
        status: conteudo.status,
        origem: conteudo.origem,
        url: conteudo.url ?? "",
        storage_path: conteudo.storage_path,
        mime_type: conteudo.mime_type,
        tamanho_bytes: conteudo.tamanho_bytes,
        arquivo_nome: conteudo.storage_path
          ? conteudo.storage_path.split("/").pop() ?? null
          : null,
        capa_path: conteudo.capa_path,
        conteudo_detalhado: conteudo.conteudo_detalhado ?? "",
        parceiro_nome: conteudo.parceiro_nome ?? "",
        parceiro_url: conteudo.parceiro_url ?? "",
        parceiro_cta: conteudo.parceiro_cta ?? "",
        permite_download: conteudo.permite_download !== false,
        destaque: !!conteudo.destaque,
        duracao_min: conteudo.duracao_min ? String(conteudo.duracao_min) : "",
      });
      setCategoriaOutra(isPreset ? "" : conteudo.categoria);
      setOriginalStoragePath(conteudo.storage_path);
      setOriginalCapaPath(conteudo.capa_path);
    } else {
      setForm(emptyState);
      setCategoriaOutra("");
      setOriginalStoragePath(null);
      setOriginalCapaPath(null);
    }
    setReplicarGlobalFlag(false);
  }, [open, conteudo]);

  const handleSelectFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > CUIDAR_MAX_BYTES) {
      toast.error("Arquivo excede o limite de 500MB.");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadCuidarArquivo(file, companyId);
      setForm((f) => ({
        ...f,
        storage_path: res.storage_path,
        mime_type: res.mime_type,
        tamanho_bytes: res.tamanho_bytes,
        arquivo_nome: file.name,
      }));
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectCapa = async (file: File | null) => {
    if (!file) return;
    setUploadingCapa(true);
    try {
      const path = await uploadCuidarCapa(file, companyId);
      setForm((f) => ({ ...f, capa_path: path }));
      toast.success("Capa enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar capa");
    } finally {
      setUploadingCapa(false);
      if (capaInputRef.current) capaInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = form.titulo.trim();
    if (!titulo) return;

    if (form.origem === "url") {
      const url = form.url.trim();
      if (!url) {
        toast.error("Informe a URL do conteúdo.");
        return;
      }
      try {
        new URL(url);
      } catch {
        toast.error("URL inválida.");
        return;
      }
    } else {
      if (!form.storage_path) {
        toast.error("Envie um arquivo antes de salvar.");
        return;
      }
    }

    const parceiroUrl = form.parceiro_url.trim();
    if (parceiroUrl && !sanitizeExternalUrl(parceiroUrl)) {
      toast.error("O link do parceiro deve começar com http:// ou https://");
      return;
    }

    const categoria =
      form.categoria === "Outros" && categoriaOutra.trim()
        ? categoriaOutra.trim()
        : form.categoria;

    const duracao = parseInt(form.duracao_min, 10);

    const payload: CuidarConteudoInput = {
      titulo,
      descricao: form.descricao.trim() || null,
      tipo: form.tipo,
      categoria,
      status: form.status,
      origem: form.origem,
      url: form.origem === "url" ? form.url.trim() : null,
      storage_path: form.origem === "upload" ? form.storage_path : null,
      mime_type: form.origem === "upload" ? form.mime_type : null,
      tamanho_bytes: form.origem === "upload" ? form.tamanho_bytes : null,
      capa_path: form.capa_path,
      conteudo_detalhado: form.conteudo_detalhado.trim() || null,
      parceiro_nome: form.parceiro_nome.trim() || null,
      parceiro_url: parceiroUrl || null,
      parceiro_cta: form.parceiro_cta.trim() || null,
      permite_download: form.permite_download,
      destaque: form.destaque,
      duracao_min: Number.isFinite(duracao) && duracao > 0 ? duracao : null,
    };

    let saved: CuidarConteudo;
    if (isEdit && conteudo) {
      saved = await atualizar.mutateAsync({
        id: conteudo.id,
        input: payload,
        previousStoragePath: originalStoragePath,
        previousCapaPath: originalCapaPath,
      });
    } else {
      saved = await criar.mutateAsync(payload);
    }

    if (isAdminMaster && replicarGlobalFlag && saved && saved.company_id !== null) {
      await replicarGlobal.mutateAsync({
        id: saved.id,
        origem: saved.origem,
        storage_path: saved.storage_path,
        capa_path: saved.capa_path,
      });
    }
    onOpenChange(false);
  };

  const isSaving = criar.isPending || atualizar.isPending || replicarGlobal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar material" : "Novo material"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as CuidarConteudoTipo }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="artigo">Artigo</SelectItem>
                  <SelectItem value="cartilha">Cartilha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_CUIDAR.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.categoria === "Outros" && (
            <div className="space-y-2">
              <Label htmlFor="categoria-outra">Especifique a categoria</Label>
              <Input
                id="categoria-outra"
                value={categoriaOutra}
                onChange={(e) => setCategoriaOutra(e.target.value)}
                maxLength={60}
              />
            </div>
          )}

          {/* Origem do conteúdo */}
          <div className="space-y-2">
            <Label>Origem do conteúdo *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, origem: "url" }))}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                  form.origem === "url"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <LinkIcon className="h-4 w-4" />
                URL externa
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, origem: "upload" }))}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm transition-colors ${
                  form.origem === "upload"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload de arquivo
              </button>
            </div>
          </div>

          {form.origem === "url" ? (
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                required={form.origem === "url"}
              />
              <p className="text-xs text-muted-foreground">
                Para vídeos do YouTube, cole o link completo da página.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_BY_TIPO[form.tipo]}
                className="hidden"
                onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
              />
              {form.storage_path ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="overflow-hidden">
                      <p className="truncate text-sm font-medium">
                        {form.arquivo_nome ?? "arquivo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatarTamanho(form.tamanho_bytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      Trocar
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          storage_path: null,
                          mime_type: null,
                          tamanho_bytes: null,
                          arquivo_nome: null,
                        }))
                      }
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/30"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm font-medium">Clique para selecionar um arquivo</p>
                      <p className="text-xs text-muted-foreground">
                        {form.tipo === "video"
                          ? "MP4, WebM, MOV"
                          : "PDF, DOC, DOCX, PPT, PPTX"}{" "}
                        — até 500MB
                      </p>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* ---------- Vitrine ---------- */}
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Apresentação na biblioteca</p>

            <div className="space-y-2">
              <Label>Imagem de capa</Label>
              <input
                ref={capaInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleSelectCapa(e.target.files?.[0] ?? null)}
              />
              {form.capa_path ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-background p-2">
                  {capaPreviewUrl ? (
                    <img
                      src={capaPreviewUrl}
                      alt="Pré-visualização da capa"
                      className="h-16 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={uploadingCapa}
                      onClick={() => capaInputRef.current?.click()}
                    >
                      Trocar
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={uploadingCapa}
                      onClick={() => setForm((f) => ({ ...f, capa_path: null }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingCapa}
                  onClick={() => capaInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border p-5 text-center transition-colors hover:bg-muted/30"
                >
                  {uploadingCapa ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">
                    {uploadingCapa ? "Enviando capa..." : "Adicionar imagem de capa"}
                  </p>
                  <p className="text-xs text-muted-foreground">JPG, PNG ou WebP — até 5MB</p>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="conteudo-detalhado">Sobre este material</Label>
              <Textarea
                id="conteudo-detalhado"
                value={form.conteudo_detalhado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, conteudo_detalhado: e.target.value }))
                }
                rows={5}
                maxLength={4000}
                placeholder="Texto exibido ao clicar no ícone de informação: o que o colaborador vai encontrar, para quem é indicado, dicas de uso..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracao">Duração / tempo de leitura (min)</Label>
              <Input
                id="duracao"
                type="number"
                min={1}
                max={600}
                value={form.duracao_min}
                onChange={(e) => setForm((f) => ({ ...f, duracao_min: e.target.value }))}
                placeholder="Ex.: 8"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parceiro-nome">Parceiro (opcional)</Label>
                <Input
                  id="parceiro-nome"
                  value={form.parceiro_nome}
                  onChange={(e) => setForm((f) => ({ ...f, parceiro_nome: e.target.value }))}
                  maxLength={80}
                  placeholder="Ex.: C4Life"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parceiro-cta">Texto do botão</Label>
                <Input
                  id="parceiro-cta"
                  value={form.parceiro_cta}
                  onChange={(e) => setForm((f) => ({ ...f, parceiro_cta: e.target.value }))}
                  maxLength={40}
                  placeholder="Acessar site do parceiro"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parceiro-url">Link do parceiro</Label>
              <Input
                id="parceiro-url"
                type="url"
                value={form.parceiro_url}
                onChange={(e) => setForm((f) => ({ ...f, parceiro_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
              <div>
                <p className="text-sm font-medium">Permitir download</p>
                <p className="text-xs text-muted-foreground">
                  O colaborador poderá baixar o arquivo do material.
                </p>
              </div>
              <Switch
                checked={form.permite_download}
                onCheckedChange={(v) => setForm((f) => ({ ...f, permite_download: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-background p-3">
              <div>
                <p className="text-sm font-medium">Destacar na biblioteca</p>
                <p className="text-xs text-muted-foreground">
                  Aparece em evidência no topo, com card maior.
                </p>
              </div>
              <Switch
                checked={form.destaque}
                onCheckedChange={(v) => setForm((f) => ({ ...f, destaque: v }))}
              />
            </div>
          </div>



          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">
                Quando desativado, o material não aparece para os colaboradores.
              </p>
            </div>
            <Switch
              checked={form.status === "ativo"}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, status: v ? "ativo" : "inativo" }))
              }
            />
          </div>

          {isAdminMaster && !jaGlobal && (
            <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Globe className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Disponibilizar para todas as empresas</p>
                  <p className="text-xs text-muted-foreground">
                    Marca o material como <strong>global</strong>; ficará visível a colaboradores
                    de todas as empresas do sistema.
                  </p>
                </div>
              </div>
              <Switch
                checked={replicarGlobalFlag}
                onCheckedChange={setReplicarGlobalFlag}
              />
            </div>
          )}

          {jaGlobal && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              <Globe className="h-4 w-4" />
              Este material já está disponível para todas as empresas.
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || uploading}>
              {isSaving ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
