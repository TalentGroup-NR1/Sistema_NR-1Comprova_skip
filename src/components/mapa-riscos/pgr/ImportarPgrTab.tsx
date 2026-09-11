import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Shield, Clock, User, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useIniciarImportacaoPgr,
  useConfirmarImportacaoPgr,
  usePgrImportacoes,
  useExcluirImportacaoPgr,
  type PgrImportacao,
  type RiscoExtraido,
  type AcaoExtraida,
  type DadosEmpresaPgr,
  type ExtracaoRaw,
} from "@/hooks/usePgrImportacao";
import { classificacaoClasse } from "@/components/mapa-riscos/pgr/pgrRiscoUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const STATUS_CONFIG = {
  processando: { label: "Processando", icon: Loader2, spin: true, color: "bg-blue-100 text-blue-800" },
  aguardando_revisao: { label: "Aguardando revisão", icon: Clock, spin: false, color: "bg-amber-100 text-amber-800" },
  confirmado: { label: "Confirmado", icon: CheckCircle, spin: false, color: "bg-emerald-100 text-emerald-800" },
  erro: { label: "Erro", icon: AlertCircle, spin: false, color: "bg-red-100 text-red-800" },
};

const FASES_EM_MS = { ENVIANDO: 3000, LENDO: 8000, EXTRAINDO: 40000 };
const FASES_PROGRESSO = [
  { id: 0, label: "Enviando documento", duration: FASES_EM_MS.ENVIANDO },
  { id: 1, label: "Lendo PDF", duration: FASES_EM_MS.LENDO },
  { id: 2, label: "Extraindo riscos com IA", duration: FASES_EM_MS.EXTRAINDO },
  { id: 3, label: "Preparando revisão", duration: 0 },
];

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "fisico", label: "Físico" },
  { value: "quimico", label: "Químico" },
  { value: "biologico", label: "Biológico" },
  { value: "ergonomico", label: "Ergonômico" },
  { value: "acidente", label: "Acidente" },
  { value: "psicossocial", label: "Psicossocial" },
];

function UploadZone({ onFile, isPending }: { onFile: (file: File) => void; isPending: boolean }) {
  const [drag, setDrag] = useState(false);
  const [faseId, setFaseId] = useState(0);

  useEffect(() => {
    if (!isPending) {
      setFaseId(0);
      return;
    }

    let timeout: NodeJS.Timeout;
    const advance = (currentFase: number) => {
      const ms = FASES_PROGRESSO[currentFase].duration;
      if (ms > 0) {
        timeout = setTimeout(() => {
          setFaseId(prev => {
            const next = prev + 1;
            if (next < FASES_PROGRESSO.length) advance(next);
            return next;
          });
        }, ms);
      }
    };
    advance(0);
    return () => clearTimeout(timeout);
  }, [isPending]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      id="pgr-upload-zone"
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12
        transition-colors cursor-pointer
        ${drag ? "border-orange-400 bg-orange-50" : "border-border hover:border-orange-300 hover:bg-muted/50"}
      `}
    >
      <input
        id="pgr-file-input"
        type="file"
        accept=".pdf"
        className="absolute inset-0 opacity-0 cursor-pointer"
        disabled={isPending}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {isPending ? (
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
      ) : (
        <Upload className="h-10 w-10 text-orange-400" />
      )}
      <div className="text-center">
        <p className="font-semibold text-foreground">
          {isPending ? "Analisando o documento com IA…" : "Arraste o PDF do PGR ou clique para selecionar"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isPending
            ? "Processando documento..."
            : "PDF de até 10MB — pode ser escaneado, a IA fará o OCR"}
        </p>
        {isPending && (
          <div className="mt-4 w-64 mx-auto space-y-2 text-left bg-background/50 p-4 rounded-xl border border-border">
            {FASES_PROGRESSO.map((fase) => {
              const isPast = faseId > fase.id;
              const isCurrent = faseId === fase.id;
              const isFuture = faseId < fase.id;
              return (
                <div key={fase.id} className={`flex items-center gap-2 text-sm ${isFuture ? "opacity-40" : ""}`}>
                  {isPast ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 text-orange-500 animate-spin shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground shrink-0" />
                  )}
                  <span className={isCurrent ? "font-medium text-orange-600" : isPast ? "text-muted-foreground" : ""}>
                    {fase.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────── Painel de Revisão de Riscos ──────────
function RiscosEditor({
  riscos,
  onChange,
}: {
  riscos: RiscoExtraido[];
  onChange: (riscos: RiscoExtraido[]) => void;
}) {
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set([0]));

  const patchRisco = (i: number, patch: Partial<RiscoExtraido>) => {
    const copia = [...riscos];
    copia[i] = { ...copia[i], ...patch };
    onChange(copia);
  };

  const removerRisco = (i: number) => onChange(riscos.filter((_, idx) => idx !== i));

  const adicionarRisco = () =>
    onChange([...riscos, { categoria: "fisico", nome: "", descricao: null, probabilidade: 3, severidade: 3, local_exposicao: null, medidas_existentes: null }]);

  return (
    <div className="space-y-3">
      {riscos.map((r, i) => {
        const nivelNum = r.probabilidade * r.severidade;
        const cls = classificacaoClasse(nivelNum <= 2 ? "Irrelevante" : nivelNum <= 4 ? "Baixo" : nivelNum <= 9 ? "Moderado" : nivelNum <= 14 ? "Alto" : "Crítico");
        const aberto = expandidos.has(i);

        return (
          <Card key={i} className="border-border">
            <CardHeader
              className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
              onClick={() => setExpandidos((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge className={`${cls} text-xs shrink-0`}>{CATEGORIAS.find((c) => c.value === r.categoria)?.label ?? r.categoria}</Badge>
                <span className="text-sm font-medium truncate">{r.nome || <span className="text-muted-foreground italic">Risco sem nome</span>}</span>
                <Badge variant="outline" className="text-xs shrink-0">P{r.probabilidade}×S{r.severidade}={nivelNum}</Badge>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Button id={`pgr-remover-risco-${i}`} variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removerRisco(i); }}
                  className="text-destructive hover:text-destructive h-7 px-2">Remover</Button>
                {aberto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>

            {aberto && (
              <CardContent className="pt-0 pb-4 px-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select value={r.categoria} onValueChange={(v) => patchRisco(i, { categoria: v })}>
                      <SelectTrigger id={`pgr-risco-cat-${i}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Nome do risco</Label>
                    <Input id={`pgr-risco-nome-${i}`} value={r.nome} onChange={(e) => patchRisco(i, { nome: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Probabilidade (1-5)</Label>
                    <Input id={`pgr-risco-prob-${i}`} type="number" min={1} max={5} value={r.probabilidade}
                      onChange={(e) => patchRisco(i, { probabilidade: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Severidade (1-5)</Label>
                    <Input id={`pgr-risco-sev-${i}`} type="number" min={1} max={5} value={r.severidade}
                      onChange={(e) => patchRisco(i, { severidade: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Descrição</Label>
                  <Textarea id={`pgr-risco-desc-${i}`} rows={2} value={r.descricao ?? ""}
                    onChange={(e) => patchRisco(i, { descricao: e.target.value || null })} />
                </div>
                <div className="space-y-1">
                  <Label>Medidas existentes</Label>
                  <Textarea id={`pgr-risco-medidas-${i}`} rows={2} value={r.medidas_existentes ?? ""}
                    onChange={(e) => patchRisco(i, { medidas_existentes: e.target.value || null })} />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button id="pgr-adicionar-risco" variant="outline" size="sm" onClick={adicionarRisco} className="w-full">
        + Adicionar risco manualmente
      </Button>
    </div>
  );
}

// ────────── Painel de Revisão do Plano de Ação ──────────
function PlanoAcaoEditor({
  acoes,
  onChange,
}: {
  acoes: AcaoExtraida[];
  onChange: (acoes: AcaoExtraida[]) => void;
}) {
  const patchAcao = (i: number, patch: Partial<AcaoExtraida>) => {
    const copia = [...acoes];
    copia[i] = { ...copia[i], ...patch };
    onChange(copia);
  };

  const remover = (i: number) => onChange(acoes.filter((_, idx) => idx !== i));
  const adicionar = () => onChange([...acoes, { id: crypto.randomUUID(), medida: "", prazo_sugerido: null, responsavel_sugerido: null, prioridade: "media", risco_referenciado: null, status: "pendente" }]);

  const PRIORIDADE_COR: Record<string, string> = {
    alta: "bg-red-100 text-red-800",
    media: "bg-amber-100 text-amber-800",
    baixa: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-3">
      {acoes.map((a, i) => (
        <Card key={i} className="border-border">
          <CardContent className="pt-4 pb-4 px-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge className={`${PRIORIDADE_COR[a.prioridade]} text-xs capitalize`}>{a.prioridade}</Badge>
              <Button variant="ghost" size="sm" onClick={() => remover(i)} className="text-destructive hover:text-destructive h-7 px-2">Remover</Button>
            </div>
            <div className="space-y-1">
              <Label>Medida / Ação</Label>
              <Textarea id={`pgr-acao-medida-${i}`} rows={2} value={a.medida}
                onChange={(e) => patchAcao(i, { medida: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={a.prioridade} onValueChange={(v) => patchAcao(i, { prioridade: v as AcaoExtraida["prioridade"] })}>
                  <SelectTrigger id={`pgr-acao-prio-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prazo sugerido</Label>
                <Input id={`pgr-acao-prazo-${i}`} value={a.prazo_sugerido ?? ""}
                  onChange={(e) => patchAcao(i, { prazo_sugerido: e.target.value || null })}
                  placeholder="ex: 30 dias" />
              </div>
              <div className="space-y-1">
                <Label>Responsável sugerido</Label>
                <Input id={`pgr-acao-resp-${i}`} value={a.responsavel_sugerido ?? ""}
                  onChange={(e) => patchAcao(i, { responsavel_sugerido: e.target.value || null })}
                  placeholder="Nome ou cargo" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button id="pgr-adicionar-acao" variant="outline" size="sm" onClick={adicionar} className="w-full">
        + Adicionar ação manualmente
      </Button>
    </div>
  );
}

// ────────── Card de Histórico ──────────
function HistoricoCard({ importacao, onOpen }: { importacao: PgrImportacao; onOpen: () => void }) {
  const cfg = STATUS_CONFIG[importacao.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.erro;
  const Icon = cfg.icon || AlertCircle;
  
  const rawRiscos = Array.isArray(importacao.riscos) ? importacao.riscos : Array.isArray(importacao.extracao_raw?.riscos) ? importacao.extracao_raw.riscos : [];
  const rawPlano = Array.isArray(importacao.plano_acao) ? importacao.plano_acao : Array.isArray(importacao.extracao_raw?.plano_acao) ? importacao.extracao_raw.plano_acao : [];
  
  const totalRiscos = rawRiscos.length;
  const totalAcoes = rawPlano.length;
  const excluir = useExcluirImportacaoPgr();

  return (
    <div 
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="bg-orange-50 p-2 rounded-lg group-hover:bg-orange-100 transition-colors">
          <FileText className="h-5 w-5 text-orange-500 shrink-0" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate group-hover:text-orange-700 transition-colors">{importacao.arquivo_nome}</div>
          <div className="text-xs text-muted-foreground">
            {importacao.created_at ? format(new Date(importacao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Data não disponível"}
            {importacao.status === "confirmado" && ` · ${totalRiscos} riscos · ${totalAcoes} ações`}
          </div>
          {importacao.status === "erro" && importacao.erro_mensagem && (
            <div className="text-xs text-red-600 mt-1 truncate max-w-sm" title={importacao.erro_mensagem}>
              {importacao.erro_mensagem}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge className={`${cfg.color} flex items-center gap-1 text-xs`}>
          <Icon className={`h-3 w-3 ${cfg.spin ? "animate-spin" : ""}`} />
          {cfg.label}
        </Badge>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 z-10 relative"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Tem certeza que deseja excluir esta importação? Esta ação não pode ser desfeita.")) {
              excluir.mutateAsync(importacao.id)
                .then(() => toast.success("Importação excluída com sucesso."))
                .catch(err => toast.error(err.message ?? "Erro ao excluir importação."));
            }
          }}
          title="Excluir importação"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ────────── Tela de Revisão Principal ──────────
function PainelRevisao({
  importacao,
  onConfirmar,
  isPending,
}: {
  importacao: PgrImportacao;
  onConfirmar: (dados: { dadosEmpresa: DadosEmpresaPgr; riscos: RiscoExtraido[]; planoAcao: AcaoExtraida[] }) => void;
  isPending: boolean;
}) {
  const raw = (importacao.extracao_raw || {}) as ExtracaoRaw;
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresaPgr>(raw?.dados_empresa ?? {
    nome: null, cnpj: null, responsavel_tecnico: null, cargo_responsavel: null, data_elaboracao: null, validade: null,
  });
  
  const initialRiscos = Array.isArray(raw?.riscos) ? raw.riscos : [];
  const initialPlano = Array.isArray(raw?.plano_acao) ? raw.plano_acao : [];
  
  const [riscos, setRiscos] = useState<RiscoExtraido[]>(initialRiscos);
  const [planoAcao, setPlanoAcao] = useState<AcaoExtraida[]>(initialPlano);
  const [secao, setSecao] = useState<"empresa" | "riscos" | "plano">("empresa");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (importacao.arquivo_storage) {
      const fetchUrl = async () => {
        const { data } = await supabase.storage
          .from('documentos_analise')
          .createSignedUrl(importacao.arquivo_storage, 60 * 60);
        
        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        } else {
          const { data: pub } = supabase.storage
            .from('documentos_analise')
            .getPublicUrl(importacao.arquivo_storage);
          setPdfUrl(pub.publicUrl);
        }
      };
      fetchUrl();
    }
  }, [importacao.arquivo_storage]);

  const totalPreenchido = riscos.filter((r) => r?.nome).length;
  const totalAcoes = planoAcao.filter((a) => a?.medida).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[700px]">
      {/* Coluna 1: Formulários de Revisão */}
      <div className="space-y-6 flex flex-col h-full overflow-y-auto pr-2">
        {raw?.aviso && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{raw.aviso}</AlertDescription>
          </Alert>
        )}

        {raw?.modo_extracao === "fallback_local" && (
          <Alert className="border-red-300 bg-red-50 text-red-900 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription>
              <span className="font-semibold block mb-1">Confiança baixa na extração inteligente</span>
              Não foi possível extrair todos os dados com IA ({(raw as any).erro?.motivo || "Erro de processamento"}). Por favor, revise manualmente ou adicione os riscos não lidos.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" /> {totalPreenchido} risco(s) identificado(s)
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> {totalAcoes} ação(ões) do plano
          </Badge>
          {raw?.modo_extracao && raw.modo_extracao !== "fallback_local" && (
            <Badge variant="secondary" className="text-xs">
              ✅ Extraído com IA
            </Badge>
          )}
        </div>

        <div className="flex gap-2 border-b border-border">
          {(["empresa", "riscos", "plano"] as const).map((s) => (
            <button key={s} id={`pgr-revisao-tab-${s}`} onClick={() => setSecao(s)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors
                ${secao === s ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {s === "empresa" ? "Dados da Empresa" : s === "riscos" ? `Riscos (${totalPreenchido})` : `Plano de Ação (${totalAcoes})`}
            </button>
          ))}
        </div>

        {secao === "empresa" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "nome", label: "Nome da empresa" },
              { key: "cnpj", label: "CNPJ" },
              { key: "responsavel_tecnico", label: "Responsável técnico" },
              { key: "cargo_responsavel", label: "Cargo do responsável" },
              { key: "data_elaboracao", label: "Data de elaboração" },
              { key: "validade", label: "Validade" },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input id={`pgr-empresa-${key}`}
                  value={(dadosEmpresa as any)[key] ?? ""}
                  onChange={(e) => setDadosEmpresa((d) => ({ ...d, [key]: e.target.value || null }))}
                />
              </div>
            ))}
          </div>
        )}

        {secao === "riscos" && <RiscosEditor riscos={riscos} onChange={setRiscos} />}
        {secao === "plano" && <PlanoAcaoEditor acoes={planoAcao} onChange={setPlanoAcao} />}

        <div className="mt-auto pt-4 pb-2">
          <Separator className="mb-4" />
          <div className="flex justify-end gap-3">
            <Button id="pgr-confirmar-importacao" onClick={() => onConfirmar({ dadosEmpresa, riscos, planoAcao })}
              disabled={isPending || totalPreenchido === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white w-full">
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirmar e Ativar Plano de Ação
            </Button>
          </div>
        </div>
      </div>

      {/* Coluna 2: Visualizador de PDF */}
      <div className="hidden lg:flex flex-col border border-border rounded-lg bg-muted overflow-hidden h-full">
        <div className="bg-muted-foreground/10 px-3 py-2 border-b border-border flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Documento Original</span>
        </div>
        {pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#toolbar=0`}
            className="w-full h-full flex-1 border-0 bg-white" 
            title="Visualizador de PDF"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Carregando PDF...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────── Componente Principal ──────────
import { PgrImportadoDashboard } from "./PgrImportadoDashboard";

export function ImportarPgrTab() {
  const { data: importacoes = [], isLoading } = usePgrImportacoes();
  const iniciar = useIniciarImportacaoPgr();
  const confirmar = useConfirmarImportacaoPgr();
  const [importacaoEmRevisao, setImportacaoEmRevisao] = useState<PgrImportacao | null>(null);
  const [selectedPgrId, setSelectedPgrId] = useState<string | null>(null);
  const revisaoRef = useRef<HTMLDivElement>(null);

  const aguardandoRevisao = importacoes.find((i) => i.status === "aguardando_revisao");

  const handleRevisarAgora = (importacao: PgrImportacao) => {
    setImportacaoEmRevisao(importacao);
    setTimeout(() => {
      revisaoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      revisaoRef.current?.focus();
    }, 100);
  };

  const handleFile = async (file: File) => {
    try {
      const resultado = await iniciar.mutateAsync(file);
      toast.success(`"${file.name}" lido. Preparando revisão...`);
      if (resultado.status === "aguardando_revisao") {
        handleRevisarAgora(resultado);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao processar o arquivo.");
    }
  };

  const handleConfirmar = async (dados: Parameters<typeof confirmar.mutateAsync>[0]) => {
    try {
      const r = await confirmar.mutateAsync(dados);
      toast.success(`PGR confirmado com ${r.totalRiscos} risco(s) e ${r.totalAcoes} ação(ões) ativada(s).`);
      setImportacaoEmRevisao(null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao confirmar.");
    }
  };

  if (selectedPgrId) {
    return (
      <PgrImportadoDashboard 
        pgrId={selectedPgrId} 
        onBack={() => setSelectedPgrId(null)} 
        onRevisar={(importacao) => {
          setSelectedPgrId(null);
          handleRevisarAgora(importacao);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-orange-500" />
            Importar PGR Existente
          </CardTitle>
          <CardDescription>
            Envie o PDF do PGR elaborado por outro profissional. A plataforma usa IA (GPT-4o) para extrair
            os riscos e o plano de ação — você revisa e confirma antes de salvar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UploadZone onFile={handleFile} isPending={iniciar.isPending} />

          {/* Aviso de revisão pendente */}
          {(aguardandoRevisao && !importacaoEmRevisao) && (
            <Alert className="border-orange-500 bg-orange-50 shadow-sm" aria-live="polite">
              <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-orange-900 font-medium">
                  A IA leu o documento e identificou os riscos. Revise e confirme para liberar o plano de ação.
                  <span className="block text-sm text-orange-800/80 font-normal mt-1">
                    Documento: {aguardandoRevisao.arquivo_nome}
                  </span>
                </span>
                <Button id="pgr-retomar-revisao" size="sm" 
                  onClick={() => handleRevisarAgora(aguardandoRevisao)}
                  className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                  Revisar agora
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Painel de revisão da extração */}
      {importacaoEmRevisao && importacaoEmRevisao.status === "aguardando_revisao" && (
        <Card className="border-orange-200 shadow-md scroll-mt-6" ref={revisaoRef} tabIndex={-1}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-orange-500" />
              Revise e confirme: <span className="font-normal text-muted-foreground">{importacaoEmRevisao.arquivo_nome}</span>
            </CardTitle>
            <CardDescription>
              Confirme ou corrija os dados extraídos antes de ativar o plano de ação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PainelRevisao
              importacao={importacaoEmRevisao}
              onConfirmar={(dados) => handleConfirmar({ importacaoId: importacaoEmRevisao.id, ...dados })}
              isPending={confirmar.isPending}
            />
          </CardContent>
        </Card>
      )}

      {/* Histórico de importações */}
      {importacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              importacoes.map((imp) => <HistoricoCard key={imp.id} importacao={imp} onOpen={() => setSelectedPgrId(imp.id)} />)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
