import { useState, useCallback } from "react";
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

const STATUS_CONFIG = {
  processando: { label: "Processando", icon: Loader2, spin: true, color: "bg-blue-100 text-blue-800" },
  aguardando_revisao: { label: "Aguardando revisão", icon: Clock, spin: false, color: "bg-amber-100 text-amber-800" },
  confirmado: { label: "Confirmado", icon: CheckCircle, spin: false, color: "bg-emerald-100 text-emerald-800" },
  erro: { label: "Erro", icon: AlertCircle, spin: false, color: "bg-red-100 text-red-800" },
};

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "fisico", label: "Físico" },
  { value: "quimico", label: "Químico" },
  { value: "biologico", label: "Biológico" },
  { value: "ergonomico", label: "Ergonômico" },
  { value: "acidente", label: "Acidente" },
  { value: "psicossocial", label: "Psicossocial" },
];

// ────────── Upload Zone ──────────
function UploadZone({ onFile, isPending }: { onFile: (file: File) => void; isPending: boolean }) {
  const [drag, setDrag] = useState(false);

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
            ? "Extraindo riscos e plano de ação — pode levar até 1 minuto"
            : "PDF de até 10MB — pode ser escaneado, a IA fará o OCR"}
        </p>
        {isPending && (
          <div className="mt-3 w-48 mx-auto space-y-1">
            <Progress value={undefined} className="h-1.5 bg-orange-100 [&>div]:bg-orange-500" />
            <p className="text-xs text-orange-500 font-medium">Aguardando processamento…</p>
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
  const adicionar = () => onChange([...acoes, { medida: "", prazo_sugerido: null, responsavel_sugerido: null, prioridade: "media", risco_referenciado: null }]);

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
function HistoricoCard({ importacao }: { importacao: PgrImportacao }) {
  const cfg = STATUS_CONFIG[importacao.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.erro;
  const Icon = cfg.icon || AlertCircle;
  
  const rawRiscos = Array.isArray(importacao.riscos) ? importacao.riscos : Array.isArray(importacao.extracao_raw?.riscos) ? importacao.extracao_raw.riscos : [];
  const rawPlano = Array.isArray(importacao.plano_acao) ? importacao.plano_acao : Array.isArray(importacao.extracao_raw?.plano_acao) ? importacao.extracao_raw.plano_acao : [];
  
  const totalRiscos = rawRiscos.length;
  const totalAcoes = rawPlano.length;
  const excluir = useExcluirImportacaoPgr();

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 text-orange-400 shrink-0" />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{importacao.arquivo_nome}</div>
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
          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={() => {
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

  const totalPreenchido = riscos.filter((r) => r?.nome).length;
  const totalAcoes = planoAcao.filter((a) => a?.medida).length;

  return (
    <div className="space-y-6">
      {raw?.aviso && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{raw.aviso}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="flex items-center gap-1">
          <Shield className="h-3 w-3" /> {totalPreenchido} risco(s) identificado(s)
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> {totalAcoes} ação(ões) do plano
        </Badge>
        {raw?.modo_extracao && (
          <Badge variant="secondary" className="text-xs">
            {raw.modo_extracao === "fallback_local" ? "⚠️ Processamento local" : "✅ IA OpenAI"}
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

      <Separator />
      <div className="flex justify-end gap-3">
        <Button id="pgr-confirmar-importacao" onClick={() => onConfirmar({ dadosEmpresa, riscos, planoAcao })}
          disabled={isPending || totalPreenchido === 0}
          className="bg-orange-600 hover:bg-orange-700 text-white">
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Confirmar e Ativar Plano de Ação
        </Button>
      </div>
    </div>
  );
}

// ────────── Componente Principal ──────────
export function ImportarPgrTab() {
  const { data: importacoes = [], isLoading } = usePgrImportacoes();
  const iniciar = useIniciarImportacaoPgr();
  const confirmar = useConfirmarImportacaoPgr();
  const [importacaoEmRevisao, setImportacaoEmRevisao] = useState<PgrImportacao | null>(null);

  const aguardandoRevisao = importacoes.find((i) => i.status === "aguardando_revisao");

  const handleFile = async (file: File) => {
    try {
      const resultado = await iniciar.mutateAsync(file);
      toast.success(`"${file.name}" enviado para análise.`);
      if (resultado.status === "aguardando_revisao") setImportacaoEmRevisao(resultado);
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
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-amber-800">
                  Há uma importação aguardando sua revisão: <strong>{aguardandoRevisao.arquivo_nome}</strong>
                </span>
                <Button id="pgr-retomar-revisao" size="sm" variant="outline"
                  onClick={() => setImportacaoEmRevisao(aguardandoRevisao)}
                  className="ml-3 border-amber-300 text-amber-700 hover:bg-amber-100">
                  Revisar agora
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Painel de revisão da extração */}
      {importacaoEmRevisao && importacaoEmRevisao.status === "aguardando_revisao" && (
        <Card className="border-orange-200">
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
              importacoes.map((imp) => <HistoricoCard key={imp.id} importacao={imp} />)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
