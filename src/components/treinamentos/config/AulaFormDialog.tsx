import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AulaTipo, AulaTreinamento, useUpsertAula } from "@/hooks/useTreinamentoCurriculo";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, ExternalLink, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AulaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinamentoId: string;
  moduloId: string;
  aulaToEdit?: AulaTreinamento | null;
  proximaOrdem: number;
}

const TIPOS_AULA: { value: AulaTipo; label: string; icon: string }[] = [
  { value: "pdf", label: "Documento PDF", icon: "📄" },
  { value: "video", label: "Vídeo (YouTube/Vimeo/URL)", icon: "🎥" },
  { value: "ppt", label: "Apresentação (PPT/PPTX)", icon: "📊" },
  { value: "arquivo", label: "Arquivo Geral (DOCX/outros)", icon: "📁" },
  { value: "link", label: "Link Externo", icon: "🔗" },
  { value: "texto", label: "Texto / Leitura", icon: "📝" },
];

const EXTENSOES_PERMITIDAS = [".pdf", ".ppt", ".pptx", ".doc", ".docx", ".mp4", ".webm"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function AulaFormDialog({
  open,
  onOpenChange,
  treinamentoId,
  moduloId,
  aulaToEdit,
  proximaOrdem,
}: AulaFormDialogProps) {
  const upsertAula = useUpsertAula();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<AulaTipo>("pdf");
  const [urlConteudo, setUrlConteudo] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState<string>("");
  const [obrigatoria, setObrigatoria] = useState(true);
  const [tempoMinimoSegundos, setTempoMinimoSegundos] = useState<string>("0");

  const [modoEntradaArquivo, setModoEntradaArquivo] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [arquivoSelecionadoNome, setArquivoSelecionadoNome] = useState<string | null>(null);

  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTitulo(aulaToEdit?.titulo || "");
      setDescricao(aulaToEdit?.descricao || "");
      setTipo(aulaToEdit?.tipo || "pdf");
      setUrlConteudo(aulaToEdit?.url_conteudo || "");
      setDuracaoMinutos(
        aulaToEdit?.duracao_minutos !== null && aulaToEdit?.duracao_minutos !== undefined
          ? String(aulaToEdit.duracao_minutos)
          : ""
      );
      setObrigatoria(aulaToEdit?.obrigatoria ?? true);
      setTempoMinimoSegundos(String(aulaToEdit?.tempo_minimo_segundos ?? 0));
      setModoEntradaArquivo("upload");
      setArquivoSelecionadoNome(null);
      setErros({});
    }
  }, [open, aulaToEdit]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar extensão
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!EXTENSOES_PERMITIDAS.includes(ext)) {
      toast.error(`Extensão não permitida. Permitidas: ${EXTENSOES_PERMITIDAS.join(", ")}`);
      return;
    }

    // Validar tamanho (<= 50MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("O arquivo excede o limite máximo permitido de 50 MB.");
      return;
    }

    setUploading(true);
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${treinamentoId}/${moduloId}/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from("treinamentos")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      setUrlConteudo(data.path);
      setArquivoSelecionadoNome(file.name);
      toast.success("Arquivo enviado com sucesso!");
    } catch (err: any) {
      console.error("Erro no upload:", err);
      toast.error(`Falha no envio do arquivo: ${err.message || "Erro desconhecido"}`);
    } finally {
      setUploading(false);
    }
  };

  const validarURL = (url: string): boolean => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
    // Se não iniciar com http(s), deve ser um path de storage relativo válido (ex: pasta/arquivo.pdf)
    return !url.includes(" ") && url.includes("/") && !url.includes("://");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    const trimmedTitulo = titulo.trim();
    if (trimmedTitulo.length < 3 || trimmedTitulo.length > 120) {
      novosErros.titulo = "O título deve ter entre 3 e 120 caracteres.";
    }

    if (descricao && descricao.length > 5000) {
      novosErros.descricao = "A descrição não pode exceder 5000 caracteres.";
    }

    if (tipo !== "texto") {
      const trimmedUrl = urlConteudo.trim();
      if (!trimmedUrl) {
        novosErros.urlConteudo = "A URL ou arquivo de conteúdo é obrigatório.";
      } else if (!validarURL(trimmedUrl)) {
        novosErros.urlConteudo = "Informe uma URL válida (ex: https://...).";
      }
    }

    if (duracaoMinutos && (isNaN(Number(duracaoMinutos)) || Number(duracaoMinutos) < 0)) {
      novosErros.duracao = "A duração deve ser um número inteiro maior ou igual a zero.";
    }

    if (tipo === "texto" && tempoMinimoSegundos && (isNaN(Number(tempoMinimoSegundos)) || Number(tempoMinimoSegundos) < 0)) {
      novosErros.tempoMinimo = "O tempo mínimo deve ser um valor em segundos válido.";
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    await upsertAula.mutateAsync({
      id: aulaToEdit?.id,
      modulo_id: moduloId,
      treinamento_id: treinamentoId,
      titulo: trimmedTitulo,
      descricao: descricao.trim() || null,
      tipo,
      url_conteudo: tipo === "texto" ? null : urlConteudo.trim(),
      duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos, 10) : null,
      obrigatoria,
      tempo_minimo_segundos: tipo === "texto" ? parseInt(tempoMinimoSegundos || "0", 10) : 0,
      ordem: aulaToEdit?.ordem ?? proximaOrdem,
    });

    onOpenChange(false);
  };

  const isArquivoType = tipo === "pdf" || tipo === "ppt" || tipo === "arquivo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{aulaToEdit ? "Editar Aula" : "Nova Aula"}</DialogTitle>
            <DialogDescription>
              {aulaToEdit
                ? "Atualize as informações, conteúdo e parâmetros da aula."
                : "Adicione uma nova aula a este módulo."}
            </DialogDescription>
          </DialogHeader>

          {/* Título */}
          <div className="space-y-1.5">
            <Label htmlFor="aula-titulo">
              Título da Aula <span className="text-destructive">*</span>
            </Label>
            <Input
              id="aula-titulo"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                if (erros.titulo) setErros((prev) => ({ ...prev, titulo: "" }));
              }}
              placeholder="Ex.: Aula 1 — Conceitos Básicos"
              maxLength={120}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {erros.titulo ? (
                <span className="text-destructive font-medium">{erros.titulo}</span>
              ) : (
                <span>3 a 120 caracteres</span>
              )}
              <span>{titulo.length}/120</span>
            </div>
          </div>

          {/* Tipo e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Conteúdo</Label>
              <Select
                value={tipo}
                onValueChange={(val) => {
                  setTipo(val as AulaTipo);
                  setErros({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_AULA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="mr-2">{t.icon}</span> {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duracao-minutos">Duração Estimada (minutos)</Label>
              <Input
                id="duracao-minutos"
                type="number"
                min="0"
                value={duracaoMinutos}
                onChange={(e) => {
                  setDuracaoMinutos(e.target.value);
                  if (erros.duracao) setErros((prev) => ({ ...prev, duracao: "" }));
                }}
                placeholder="Ex.: 15"
              />
              {erros.duracao && <p className="text-xs text-destructive">{erros.duracao}</p>}
            </div>
          </div>

          {/* Alerta de Link Externo (Etapa 8.7) */}
          {tipo === "link" && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                Treinamentos e aulas de link externo não emitem certificado da plataforma.
              </AlertDescription>
            </Alert>
          )}

          {/* Campo de Conteúdo por Tipo */}
          {tipo === "texto" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="aula-texto-conteudo">
                  Conteúdo do Texto <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="aula-texto-conteudo"
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value);
                    if (erros.descricao) setErros((prev) => ({ ...prev, descricao: "" }));
                  }}
                  placeholder="Escreva ou cole o material didático da aula aqui..."
                  rows={8}
                  maxLength={5000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {erros.descricao && (
                    <span className="text-destructive font-medium">{erros.descricao}</span>
                  )}
                  <span>{descricao.length}/5000</span>
                </div>
              </div>

              {/* Tempo mínimo em segundos (apenas para tipo texto) */}
              <div className="space-y-1.5">
                <Label htmlFor="tempo-minimo-segundos">
                  Tempo mínimo de leitura (segundos)
                </Label>
                <Input
                  id="tempo-minimo-segundos"
                  type="number"
                  min="0"
                  value={tempoMinimoSegundos}
                  onChange={(e) => setTempoMinimoSegundos(e.target.value)}
                  placeholder="0 = sem tempo mínimo"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo que o colaborador deve permanecer na tela para poder marcar como lida.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Opções de Upload ou URL para tipos de arquivo */}
              {isArquivoType && (
                <div className="flex items-center justify-between text-xs border-b pb-2">
                  <span className="font-medium text-muted-foreground">Origem do Arquivo:</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={modoEntradaArquivo === "upload" ? "secondary" : "ghost"}
                      onClick={() => setModoEntradaArquivo("upload")}
                      className="h-7 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-1" /> Fazer Upload
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={modoEntradaArquivo === "url" ? "secondary" : "ghost"}
                      onClick={() => setModoEntradaArquivo("url")}
                      className="h-7 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Usar URL Direta
                    </Button>
                  </div>
                </div>
              )}

              {isArquivoType && modoEntradaArquivo === "upload" ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={EXTENSOES_PERMITIDAS.join(",")}
                    onChange={handleFileUpload}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition-colors"
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">Enviando para o storage...</p>
                      </div>
                    ) : urlConteudo ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        <p className="text-sm font-medium text-foreground">
                          {arquivoSelecionadoNome || "Arquivo enviado com sucesso"}
                        </p>
                        <p className="text-xs text-muted-foreground">Clique para substituir o arquivo</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Clique para selecionar um arquivo (máx. 50 MB)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Formatos aceitos: PDF, PPT, PPTX, DOC, DOCX, MP4, WEBM
                        </p>
                      </div>
                    )}
                  </div>
                  {erros.urlConteudo && (
                    <p className="text-xs text-destructive">{erros.urlConteudo}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="url-conteudo">
                    {tipo === "video"
                      ? "URL do Vídeo (YouTube, Vimeo ou link direto)"
                      : tipo === "link"
                      ? "URL Externa do Treinamento"
                      : "URL Direta do Arquivo"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="url-conteudo"
                    value={urlConteudo}
                    onChange={(e) => {
                      setUrlConteudo(e.target.value);
                      if (erros.urlConteudo) setErros((prev) => ({ ...prev, urlConteudo: "" }));
                    }}
                    placeholder={
                      tipo === "video"
                        ? "https://www.youtube.com/watch?v=..."
                        : "https://exemplo.com/material.pdf"
                    }
                  />
                  {erros.urlConteudo && (
                    <p className="text-xs text-destructive">{erros.urlConteudo}</p>
                  )}
                </div>
              )}

              {/* Descrição / Instruções adicionais para tipos não-texto */}
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="aula-descricao">Descrição / Instruções (opcional)</Label>
                <Textarea
                  id="aula-descricao"
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value);
                    if (erros.descricao) setErros((prev) => ({ ...prev, descricao: "" }));
                  }}
                  placeholder="Orientações aos colaboradores sobre esta aula..."
                  rows={3}
                  maxLength={5000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {erros.descricao && (
                    <span className="text-destructive font-medium">{erros.descricao}</span>
                  )}
                  <span>{descricao.length}/5000</span>
                </div>
              </div>
            </div>
          )}

          {/* Switch Obrigatória */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Aula Obrigatória</Label>
              <p className="text-xs text-muted-foreground">
                Exigida para o cálculo de 100% de progresso e emissão de certificado.
              </p>
            </div>
            <Switch checked={obrigatoria} onCheckedChange={setObrigatoria} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={upsertAula.isPending || uploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={upsertAula.isPending || uploading}>
              {upsertAula.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {aulaToEdit ? "Salvar alterações" : "Adicionar aula"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
