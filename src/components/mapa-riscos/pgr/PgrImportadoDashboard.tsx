import { useState, useEffect } from "react";
import { 
  ArrowLeft, FileText, Shield, KanbanSquare, CheckCircle, Loader2, 
  Trash2, Plus, Clock, Edit2, Save, X, PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

import { usePgrImportacoes, useUpdatePgrActions, type AcaoExtraida, type RiscoExtraido } from "@/hooks/usePgrImportacao";
import { classificacaoClasse } from "@/components/mapa-riscos/pgr/pgrRiscoUtils";
import { classifyRisk } from "@/lib/riskMatrix";
import { PlanoAcaoKanban } from "./PlanoAcaoKanban";
import { PgrDashboardTab } from "./PgrDashboardTab";

const CONFIANCA_MINIMA_REVISAO = 70;

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "fisico", label: "Físico" },
  { value: "quimico", label: "Químico" },
  { value: "biologico", label: "Biológico" },
  { value: "ergonomico", label: "Ergonômico" },
  { value: "acidente", label: "Acidente" },
  { value: "psicossocial", label: "Psicossocial" },
];

export function PgrImportadoDashboard({ pgrId, onBack }: { pgrId: string; onBack: () => void }) {
  const { data: importacoes } = usePgrImportacoes();
  const updateActions = useUpdatePgrActions();

  const pgr = importacoes?.find(i => i.id === pgrId);

  const riscos: RiscoExtraido[] = Array.isArray(pgr?.riscos) ? pgr.riscos : [];
  const planoAcao: AcaoExtraida[] = Array.isArray(pgr?.plano_acao) ? pgr.plano_acao : [];

  const [editingAcaoId, setEditingAcaoId] = useState<string | null>(null);
  const [draftAcao, setDraftAcao] = useState<AcaoExtraida | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pgr?.arquivo_storage) {
      const fetchUrl = async () => {
        const { data } = await supabase.storage
          .from('documentos_analise')
          .createSignedUrl(pgr.arquivo_storage, 60 * 60);
        
        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        } else {
          const { data: pub } = supabase.storage
            .from('documentos_analise')
            .getPublicUrl(pgr.arquivo_storage);
          setPdfUrl(pub.publicUrl);
        }
      };
      fetchUrl();
    }
  }, [pgr?.arquivo_storage]);

  if (!pgr) return <div>Carregando...</div>;

  const acoesPendentes = planoAcao.filter(a => a.status !== "concluida");
  const acoesConcluidas = planoAcao.filter(a => a.status === "concluida");

  const saveAction = (action: AcaoExtraida) => {
    let newActions = [...planoAcao];
    if (action.id && planoAcao.some(a => a.id === action.id)) {
      newActions = newActions.map(a => a.id === action.id ? action : a);
    } else {
      newActions.push({ ...action, id: crypto.randomUUID() });
    }

    updateActions.mutate(
      { importacaoId: pgrId, planoAcao: newActions },
      {
        onSuccess: () => {
          toast.success("Ação salva com sucesso.");
          setEditingAcaoId(null);
        },
        onError: (err) => {
          toast.error(err.message ?? "Erro ao salvar ação.");
        }
      }
    );
  };

  const deleteAction = (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta ação?")) return;
    const newActions = planoAcao.filter(a => a.id !== id);
    updateActions.mutate(
      { importacaoId: pgrId, planoAcao: newActions },
      {
        onSuccess: () => toast.success("Ação removida."),
      }
    );
  };

  const toggleStatus = (id: string, novoStatus: "pendente" | "concluida") => {
    const action = planoAcao.find(a => a.id === id);
    if (!action) return;
    const newAction = { ...action, status: novoStatus };
    let newActions = planoAcao.map(a => a.id === id ? newAction : a);
    updateActions.mutate(
      { importacaoId: pgrId, planoAcao: newActions },
      {
        onSuccess: () => toast.success(`Ação marcada como ${novoStatus}.`),
      }
    );
  };

  const startEditing = (acao: AcaoExtraida | null) => {
    if (acao) {
      setEditingAcaoId(acao.id || null);
      setDraftAcao(acao);
    } else {
      setEditingAcaoId("new");
      setDraftAcao({
        id: crypto.randomUUID(),
        medida: "",
        prioridade: "media",
        prazo_sugerido: null,
        responsavel_sugerido: null,
        risco_referenciado: null,
        status: "pendente"
      });
    }
  };

  const renderAcaoForm = (acao: AcaoExtraida) => (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="pt-4 space-y-3">
        <div className="space-y-1">
          <Label>Medida / Ação</Label>
          <Textarea 
            value={draftAcao?.medida || ""} 
            onChange={e => setDraftAcao(d => d ? {...d, medida: e.target.value} : null)} 
            rows={2} 
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Prioridade</Label>
            <Select 
              value={draftAcao?.prioridade || "media"} 
              onValueChange={v => setDraftAcao(d => d ? {...d, prioridade: v as any} : null)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Prazo</Label>
            <Input 
              value={draftAcao?.prazo_sugerido || ""} 
              onChange={e => setDraftAcao(d => d ? {...d, prazo_sugerido: e.target.value} : null)} 
              placeholder="Ex: 30 dias"
            />
          </div>
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Input 
              value={draftAcao?.responsavel_sugerido || ""} 
              onChange={e => setDraftAcao(d => d ? {...d, responsavel_sugerido: e.target.value} : null)} 
              placeholder="Nome ou cargo"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={() => setEditingAcaoId(null)}>Cancelar</Button>
          <Button size="sm" onClick={() => draftAcao && saveAction(draftAcao)}>
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const PRIORIDADE_COR: Record<string, string> = {
    alta: "bg-red-100 text-red-800",
    media: "bg-amber-100 text-amber-800",
    baixa: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            {pgr.arquivo_nome}
          </h2>
          <p className="text-sm text-muted-foreground">
            Importado em {format(new Date(pgr.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="riscos" className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Riscos
          </TabsTrigger>
          <TabsTrigger value="plano" className="flex items-center gap-2">
            <KanbanSquare className="h-4 w-4" /> Plano de Ação
          </TabsTrigger>
          <TabsTrigger value="documento" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documento Original
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <PgrDashboardTab pgrImportacaoId={pgrId} />
        </TabsContent>

        <TabsContent value="riscos" className="space-y-4">
          {riscos.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Nenhum risco identificado.</p>
          ) : (
            <div className="grid gap-3">
              {riscos.map((r, i) => {
                const { nivel, classificacao, cor, probLabel, sevLabel, bgClasse, textClasse } = classifyRisk(r.probabilidade, r.severidade, r.escala_matriz);
                const needsReview = (r.confianca ?? 100) < CONFIANCA_MINIMA_REVISAO;
                
                return (
                  <Card key={i} className={`border-border ${needsReview ? 'border-orange-300 bg-orange-50/20' : ''}`}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge className={`${bgClasse} ${textClasse} text-xs shrink-0 hover:${bgClasse}`}>
                            {classificacao}
                          </Badge>
                          <span className="text-sm font-medium">{r.nome || "Risco sem nome"}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({CATEGORIAS.find(c => c.value === r.categoria)?.label ?? r.categoria})
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {needsReview && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-[10px] uppercase">
                              Revisar extração
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 text-sm space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md border border-border/50">
                        <div className="flex items-center gap-1.5" style={{ color: cor }}>
                          <Shield className="h-3.5 w-3.5" />
                          <span className="font-semibold text-foreground">Nível: P × S = {nivel}</span>
                        </div>
                        <span className="text-border mx-1">•</span>
                        <span>Probabilidade: <strong className="text-foreground">{probLabel}</strong> (P)</span>
                        <span className="text-border mx-1">•</span>
                        <span>Severidade: <strong className="text-foreground">{sevLabel}</strong> (S)</span>
                        {r.escala_matriz && (
                          <>
                            <span className="text-border mx-1">•</span>
                            <span className="text-muted-foreground/70">Escala: {r.escala_matriz}</span>
                          </>
                        )}
                      </div>
                      
                      {(r.descricao || r.medidas_existentes) && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-border/50">
                          {r.descricao && (
                            <div>
                              <span className="font-semibold block text-xs text-muted-foreground uppercase">Descrição</span>
                              <p className="text-foreground mt-0.5">{r.descricao}</p>
                            </div>
                          )}
                          {r.medidas_existentes && (
                            <div>
                              <span className="font-semibold block text-xs text-muted-foreground uppercase">Medidas Existentes</span>
                              <p className="text-foreground mt-0.5">{r.medidas_existentes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plano" className="space-y-4">
          <PlanoAcaoKanban pgrImportacaoId={pgrId} />
        </TabsContent>

        <TabsContent value="documento" className="h-[700px] border border-border rounded-lg overflow-hidden bg-muted">
          {pdfUrl ? (
            <iframe 
              src={`${pdfUrl}#toolbar=0`}
              className="w-full h-full border-0 bg-white" 
              title="Visualizador de PDF"
            />
          ) : (
            <div className="flex w-full h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Carregando PDF...</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
