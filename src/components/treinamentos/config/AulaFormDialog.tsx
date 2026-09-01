import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AulaTipo, TreinamentoAula, useUpsertAula } from "@/hooks/useTreinamentoCurriculo";
import { useUploadTreinamentoFile, FILE_TYPE_CONFIG, UploadableFileType } from "@/hooks/useTreinamentoStorage";
import { Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  treinamentoId: string;
  companyId: string;
  moduloId: string;
  proximaOrdem: number;
  aula?: TreinamentoAula | null;
}

const TIPOS: { value: AulaTipo; label: string }[] = [
  { value: "video", label: "Vídeo" },
  { value: "pdf", label: "PDF" },
  { value: "ppt", label: "Apresentação" },
  { value: "link", label: "Link externo" },
  { value: "texto", label: "Texto" },
];

export function AulaFormDialog({ open, onOpenChange, treinamentoId, companyId, moduloId, proximaOrdem, aula }: Props) {
  const upsert = useUpsertAula();
  const upload = useUploadTreinamentoFile();

  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [tipo, setTipo] = useState<AulaTipo>("video");
  const [url, setUrl] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [duracao, setDuracao] = useState("");
  const [tempoMinimo, setTempoMinimo] = useState("0");

  useEffect(() => {
    if (!open) return;
    setTitulo(aula?.titulo ?? "");
    setResumo(aula?.resumo ?? "");
    setTipo((aula?.tipo as AulaTipo) ?? "video");
    setUrl(aula?.url_conteudo ?? "");
    setNomeArquivo(aula?.nome_arquivo ?? null);
    setDuracao(aula?.duracao_estimada_minutos ? String(aula.duracao_estimada_minutos) : "");
    setTempoMinimo(String(aula?.tempo_minimo_minutos ?? 0));
  }, [open, aula]);

  const isUploadType = tipo === "video" || tipo === "pdf" || tipo === "ppt";

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await upload.mutateAsync({
      treinamentoId,
      file,
      fileType: tipo as UploadableFileType,
    });
    setUrl(result.filePath);
    setNomeArquivo(result.fileName);
  };

  const handleSave = async () => {
    await upsert.mutateAsync({
      id: aula?.id,
      treinamento_id: treinamentoId,
      company_id: companyId,
      modulo_id: moduloId,
      titulo,
      resumo: resumo || null,
      tipo,
      url_conteudo: url || null,
      nome_arquivo: nomeArquivo,
      duracao_estimada_minutos: duracao ? parseInt(duracao) : null,
      tempo_minimo_minutos: parseInt(tempoMinimo) || 0,
      ordem: aula?.ordem ?? proximaOrdem,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{aula ? "Editar aula" : "Nova aula"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Introdução ao tema" />
          </div>

          <div className="space-y-2">
            <Label>Resumo (opcional)</Label>
            <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v as AulaTipo); setUrl(""); setNomeArquivo(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min="0" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
            </div>
          </div>

          {isUploadType && (
            <div className="space-y-2">
              <Label>Arquivo ({FILE_TYPE_CONFIG[tipo as UploadableFileType].label})</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept={FILE_TYPE_CONFIG[tipo as UploadableFileType].accept}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {upload.isPending && <Upload className="h-4 w-4 animate-pulse" />}
              </div>
              {nomeArquivo && <p className="text-xs text-muted-foreground">Arquivo atual: {nomeArquivo}</p>}
              <p className="text-xs text-muted-foreground">
                Ou informe uma URL externa (ex.: YouTube) no campo abaixo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{tipo === "texto" ? "Conteúdo em texto" : "URL / caminho"}</Label>
            {tipo === "texto" ? (
              <Textarea value={url} onChange={(e) => setUrl(e.target.value)} rows={6} />
            ) : (
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            )}
          </div>

          <div className="space-y-2">
            <Label>Tempo mínimo na aula (min)</Label>
            <Input type="number" min="0" value={tempoMinimo} onChange={(e) => setTempoMinimo(e.target.value)} className="w-28" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!titulo || upsert.isPending || upload.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
