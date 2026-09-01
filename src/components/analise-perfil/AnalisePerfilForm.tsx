import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, X, Loader2, Keyboard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAnalise } from "@/hooks/useAnalisesPerfil";
import { useColaboradores } from "@/hooks/useColaboradores";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  { key: "alinhamento", label: "Alinhamento com Cliente", desc: "Requisitos e expectativas do cliente", placeholder: "Cole aqui o texto com os requisitos e expectativas do cliente..." },
  { key: "anuncio", label: "Anúncio da Vaga", desc: "Descrição oficial da vaga", placeholder: "Cole aqui a descrição oficial da vaga..." },
  { key: "entrevista", label: "Entrevista", desc: "Anotações ou transcrição da entrevista", placeholder: "Cole aqui as anotações ou transcrição da entrevista..." },
  { key: "curriculo", label: "Currículo", desc: "Currículo do candidato", placeholder: "Cole aqui o conteúdo do currículo do candidato..." },
] as const;

type DocKey = (typeof DOC_TYPES)[number]["key"];

const ACCEPTED = ".pdf,.txt,.docx";

const JOB_LEVEL_LABELS: Record<string, string> = {
  junior_i: "Júnior I", junior_ii: "Júnior II", junior_iii: "Júnior III",
  pleno_i: "Pleno I", pleno_ii: "Pleno II", pleno_iii: "Pleno III",
  senior_i: "Sênior I", senior_ii: "Sênior II", senior_iii: "Sênior III",
  especialista_i: "Especialista I", especialista_ii: "Especialista II", especialista_iii: "Especialista III",
};

type InputMode = "text" | "file";

export function AnalisePerfilForm({ onCreated }: { onCreated?: () => void }) {
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>("");
  const [vaga, setVaga] = useState("");
  const [candidatoNome, setCandidatoNome] = useState("");
  const [files, setFiles] = useState<Record<DocKey, File | null>>({
    alinhamento: null, anuncio: null, entrevista: null, curriculo: null,
  });
  const [texts, setTexts] = useState<Record<DocKey, string>>({
    alinhamento: "", anuncio: "", entrevista: "", curriculo: "",
  });
  const [perfilHG, setPerfilHG] = useState("");
  const [inputModes, setInputModes] = useState<Record<DocKey, InputMode>>({
    alinhamento: "text", anuncio: "text", entrevista: "text", curriculo: "text",
  });
  const inputRefs = useRef<Record<DocKey, HTMLInputElement | null>>({
    alinhamento: null, anuncio: null, entrevista: null, curriculo: null,
  });

  const createAnalise = useCreateAnalise();
  const { data: colaboradores } = useColaboradores();

  const colaboradoresAtivos = useMemo(
    () => (colaboradores || []).filter((c) => c.status === "ATIVO"),
    [colaboradores]
  );

  const handleColaboradorChange = (colabId: string) => {
    setSelectedColaboradorId(colabId);
    const colab = colaboradoresAtivos.find((c) => c.id === colabId);
    if (colab) {
      setCandidatoNome(colab.full_name);
      const nivel = colab.job_level ? JOB_LEVEL_LABELS[colab.job_level] || colab.job_level : "";
      setVaga(nivel ? `${colab.job_title} - ${nivel}` : colab.job_title);
    }
  };

  const docHasContent = (key: DocKey) => {
    if (inputModes[key] === "text") return texts[key].trim().length > 0;
    return files[key] !== null;
  };

  const allDocsReady = DOC_TYPES.every((d) => docHasContent(d.key));
  const canSubmit = candidatoNome.trim() && vaga.trim() && allDocsReady && !createAnalise.isPending;

  const handleFileChange = (key: DocKey, fileList: FileList | null) => {
    if (fileList && fileList[0]) {
      setFiles((prev) => ({ ...prev, [key]: fileList[0] }));
    }
  };

  const handleRemoveFile = (key: DocKey) => {
    setFiles((prev) => ({ ...prev, [key]: null }));
    if (inputRefs.current[key]) inputRefs.current[key]!.value = "";
  };

  const textToFile = (text: string, docKey: string): File => {
    const blob = new Blob([text], { type: "text/plain" });
    return new File([blob], `${docKey}_texto.txt`, { type: "text/plain" });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const finalFiles: Record<DocKey, File> = {} as any;
    for (const doc of DOC_TYPES) {
      if (inputModes[doc.key] === "text") {
        finalFiles[doc.key] = textToFile(texts[doc.key], doc.key);
      } else {
        finalFiles[doc.key] = files[doc.key]!;
      }
    }

    const colab = selectedColaboradorId ? colaboradoresAtivos.find((c) => c.id === selectedColaboradorId) : null;
    await createAnalise.mutateAsync({
      candidato_nome: candidatoNome,
      vaga,
      colaborador_id: selectedColaboradorId || null,
      colaborador_admission_date: colab?.admission_date || null,
      files: finalFiles,
      perfil_hg: perfilHG,
    });
    setSelectedColaboradorId("");
    setCandidatoNome("");
    setVaga("");
    setFiles({ alinhamento: null, anuncio: null, entrevista: null, curriculo: null });
    setTexts({ alinhamento: "", anuncio: "", entrevista: "", curriculo: "" });
    setPerfilHG("");
    onCreated?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nova Análise de Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Candidato</Label>
            <Select value={selectedColaboradorId} onValueChange={handleColaboradorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradoresAtivos.map((colab) => (
                  <SelectItem key={colab.id} value={colab.id}>
                    {colab.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vaga">Vaga</Label>
            <Input id="vaga" placeholder="Cargo e nível do colaborador" value={vaga} readOnly className="bg-muted/50" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOC_TYPES.map((doc) => (
            <div key={doc.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{doc.label}</Label>
                <div className="flex rounded-md border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setInputModes((prev) => ({ ...prev, [doc.key]: "text" }))}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 transition-colors",
                      inputModes[doc.key] === "text"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Keyboard className="h-3 w-3" />
                    Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputModes((prev) => ({ ...prev, [doc.key]: "file" }))}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 transition-colors",
                      inputModes[doc.key] === "file"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Upload className="h-3 w-3" />
                    Arquivo
                  </button>
                </div>
              </div>

              {inputModes[doc.key] === "text" ? (
                <Textarea
                  placeholder={doc.placeholder}
                  value={texts[doc.key]}
                  onChange={(e) => setTexts((prev) => ({ ...prev, [doc.key]: e.target.value }))}
                  className="min-h-[120px] text-sm"
                />
              ) : files[doc.key] ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{files[doc.key]!.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveFile(doc.key)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRefs.current[doc.key]?.click()}
                  className="w-full flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{doc.desc}</span>
                  <span className="text-[10px] text-muted-foreground/70">PDF, TXT ou DOCX</span>
                </button>
              )}
              <input
                type="file"
                accept={ACCEPTED}
                className="hidden"
                ref={(el) => { inputRefs.current[doc.key] = el; }}
                onChange={(e) => handleFileChange(doc.key, e.target.files)}
              />
            </div>
          ))}
        </div>

        {/* Perfil HG (opcional) */}
        <div className="space-y-2">
          <Label>Perfil HG (opcional)</Label>
          <p className="text-xs text-muted-foreground">Cole o resultado do teste psicológico. Este texto não passa pela análise da IA e será exibido como está no relatório.</p>
          <Textarea
            placeholder="Cole aqui o relatório descritivo do Perfil HG..."
            value={perfilHG}
            onChange={(e) => setPerfilHG(e.target.value)}
            className="min-h-[160px] text-sm"
          />
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          {createAnalise.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando documentos...
            </>
          ) : (
            "Gerar Análise de Aderência"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
