import { useState, useEffect } from "react";
import { 
  ArrowLeft, FileText, Shield, KanbanSquare, Loader2, 
  Trash2, Plus, Clock, Edit2, Save, X, PieChart, Pencil
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

import { usePgrImportacoes, useUpdatePgrActions, type AcaoExtraida, type PgrImportacao } from "@/hooks/usePgrImportacao";
import {
  usePgrRiscos,
  useCreateRisco,
  useUpdateRisco,
  useDeleteRisco,
  type PgrRisco,
} from "@/hooks/usePgrRiscos";
import { RiscoDialog, CATEGORIAS } from "./RiscoDialog";
import { classifyRisk } from "@/lib/riskMatrix";
import { PlanoAcaoKanban } from "./PlanoAcaoKanban";
import { PgrDashboardTab } from "./PgrDashboardTab";

const CONFIANCA_MINIMA_REVISAO = 70;

export function PgrImportadoDashboard({
  pgrId,
  onBack,
  onRevisar,
}: {
  pgrId: string;
  onBack: () => void;
  onRevisar?: (importacao: PgrImportacao) => void;
}) {
  const queryClient = useQueryClient();
  const { data: importacoes } = usePgrImportacoes();
  const updateActions = useUpdatePgrActions();

  const pgr = importacoes?.find((i) => i.id === pgrId);

  // Riscos relacionais da tabela pgr_riscos
  const { riscos = [], isLoading: isLoadingRiscos } = usePgrRiscos(pgrId);
  const createRisco = useCreateRisco();
  const updateRisco = useUpdateRisco();
  const deleteRisco = useDeleteRisco();

  // Estados locais para UI de riscos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRisco, setEditingRisco] = useState<PgrRisco | undefined>(undefined);
  const [riscoParaExcluir, setRiscoParaExcluir] = useState<PgrRisco | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const planoAcao: AcaoExtraida[] = Array.isArray(pgr?.plano_acao) ? pgr.plano_acao : [];

  const [editingAcaoId, setEditingAcaoId] = useState<string | null>(null);
  const [draftAcao, setDraftAcao] = useState<AcaoExtraida | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pgr?.arquivo_storage) {
      const fetchUrl = async () => {
        const { data } = await supabase.storage
          .from("documentos_analise")
          .createSignedUrl(pgr.arquivo_storage, 60 * 60);

        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        } else {
          const { data: pub } = supabase.storage
            .from("documentos_analise")
            .getPublicUrl(pgr.arquivo_storage);
          setPdfUrl(pub.publicUrl);
        }
      };
      fetchUrl();
    }
  }, [pgr?.arquivo_storage]);

  if (!pgr) return <div>Carregando...</div>;

  const acoesPendentes = planoAcao.filter((a) => a.status !== "concluida");
  const acoesConcluidas = planoAcao.filter((a) => a.status === "concluida");

  const saveAction = (action: AcaoExtraida) => {
    let newActions = [...planoAcao];
    if (action.id && planoAcao.some((a) => a.id === action.id)) {
      newActions = newActions.map((a) => (a.id === action.id ? action : a));
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
        },
      }
    );
  };

  const deleteAction = (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta ação?")) return;
    const newActions = planoAcao.filter((a) => a.id !== id);
    updateActions.mutate(
      { importacaoId: pgrId, planoAcao: newActions },
      {
        onSuccess: () => toast.success("Ação removida."),
      }
    );
  };

  const toggleStatus = (id: string, novoStatus: "pendente" | "concluida") => {
    const action = planoAcao.find((a) => a.id === id);
    if (!action) return;
    const newAction = { ...action, status: novoStatus };
    let newActions = planoAcao.map((a) => (a.id === id ? newAction : a));
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
        status: "pendente",
      });
    }
  };

  // ────────── Handlers de Riscos ──────────
  const handleSalvarRisco = (dados: {
    categoria: string;
    nome: string;
    probabilidade: number;
    severidade: number;
    descricao?: string | null;
    medidas_existentes?: string | null;
    grupo_exposto?: string | null;
  }) => {
    if (editingRisco) {
      updateRisco.mutate(
        {
          id: editingRisco.id,
          pgr_importacao_id: pgrId,
          patch: dados,
        },
        {
          onSuccess: () => {
            toast.success("Risco atualizado.");
            setDialogOpen(false);
            setEditingRisco(undefined);
          },
          onError: (e) => toast.error(e.message),
        }
      );
    } else {
      createRisco.mutate(
        {
          pgr_importacao_id: pgrId,
          company_id: pgr.company_id,
          ...dados,
        },
        {
          onSuccess: () => {
            toast.success("Risco criado.");
            setDialogOpen(false);
            setEditingRisco(undefined);
          },
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  const handleExcluirRiscoConfirmado = () => {
    if (!riscoParaExcluir) return;
    deleteRisco.mutate(
      { id: riscoParaExcluir.id, pgr_importacao_id: pgrId },
      {
        onSuccess: () => {
          toast.success("Risco excluído.");
          setRiscoParaExcluir(null);
        },
        onError: (e) => {
          toast.error(e.message);
          setRiscoParaExcluir(null);
        },
      }
    );
  };

  const handleMigrar = async () => {
    if (!pgr || !Array.isArray(pgr.riscos) || pgr.riscos.length === 0) return;
    setIsMigrating(true);
    let ok = 0;
    try {
      for (let i = 0; i < pgr.riscos.length; i++) {
        const r = pgr.riscos[i];
        try {
          const { error } = await (supabase as any)
            .from("pgr_riscos")
            .insert({
              pgr_importacao_id: pgr.id,
              company_id: pgr.company_id,
              ordem: i,
              categoria: r.categoria || "fisico",
              nome: r.nome || "Risco importado",
              probabilidade: r.probabilidade ?? 1,
              severidade: r.severidade ?? 1,
              descricao: r.descricao ?? null,
              medidas_existentes: r.medidas_existentes ?? null,
              grupo_exposto: r.grupo_exposto ?? null,
              fonte_origem: "importacao",
              historico: [
                {
                  acao: "migrado",
                  por: "sistema_migracao",
                  em: new Date().toISOString(),
                },
              ],
            });
          if (!error) ok++;
        } catch {
          // Segue em frente e conta sucessos
        }
      }
      queryClient.invalidateQueries({ queryKey: ["pgr-riscos", pgrId] });
      queryClient.invalidateQueries({ queryKey: ["pgr-importacoes"] });
      toast.success(`${ok} riscos migrados.`);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao migrar riscos.");
    } finally {
      setIsMigrating(false);
    }
  };

  const precisaMigracao =
    !isLoadingRiscos &&
    riscos.length === 0 &&
    Array.isArray(pgr.riscos) &&
    pgr.riscos.length > 0;

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
          {pgr.status === "aguardando_revisao" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border-2 border-dashed rounded-xl border-orange-200 bg-orange-50/50">
              <div className="bg-orange-100 p-4 rounded-full">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-semibold text-orange-900">Este PGR ainda não foi confirmado</h3>
                <p className="text-sm text-orange-700">A IA já identificou os riscos, mas precisamos que você os revise antes de exibir o inventário definitivo.</p>
              </div>
              <Button onClick={() => onRevisar?.(pgr)} className="bg-orange-600 hover:bg-orange-700 mt-2">
                Revisar agora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alerta de migração se houver riscos no JSONB mas tabela relacional vazia */}
              {precisaMigracao && (
                <Alert className="border-orange-200 bg-orange-50 text-orange-900 flex items-center justify-between">
                  <AlertDescription className="flex items-center justify-between w-full">
                    <span>Os riscos desta importação ainda estão no formato antigo.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-300 hover:bg-orange-100 text-orange-950 ml-4 shrink-0"
                      onClick={handleMigrar}
                      disabled={isMigrating}
                    >
                      {isMigrating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Migrando...
                        </>
                      ) : (
                        "Migrar agora"
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Header da sub-aba de Riscos */}
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-base font-semibold">Riscos ({riscos.length})</h3>
                <Button
                  onClick={() => {
                    setEditingRisco(undefined);
                    setDialogOpen(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Novo Risco
                </Button>
              </div>

              {isLoadingRiscos ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Carregando riscos...</span>
                </div>
              ) : riscos.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhum risco identificado.</p>
              ) : (
                <div className="grid gap-3">
                  {riscos.map((r) => {
                    const { nivel, classificacao, cor, probLabel, sevLabel, bgClasse, textClasse } = classifyRisk(
                      r.probabilidade,
                      r.severidade,
                      "5x5"
                    );

                    const badgeOrigem =
                      r.fonte_origem === "manual" ? (
                        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200 text-[10px]">
                          Incluído manualmente
                        </Badge>
                      ) : r.fonte_origem === "importacao" ? (
                        <Badge variant="outline" className="text-muted-foreground bg-muted/60 border-border text-[10px]">
                          Migrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 text-[10px]">
                          Extraído do PGR
                        </Badge>
                      );

                    return (
                      <Card key={r.id} className="border-border">
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {badgeOrigem}
                                <Badge className={`${bgClasse} ${textClasse} text-xs shrink-0 hover:${bgClasse}`}>
                                  {classificacao}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  ({CATEGORIAS.find((c) => c.value === r.categoria)?.label ?? r.categoria})
                                </span>
                              </div>
                              <h4 className="text-sm font-medium pt-1 text-foreground">{r.nome || "Risco sem nome"}</h4>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditingRisco(r);
                                  setDialogOpen(true);
                                }}
                                title="Editar risco"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setRiscoParaExcluir(r)}
                                title="Excluir risco"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="px-4 pb-4 pt-0 text-sm space-y-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md border border-border/50 flex-wrap">
                            <div className="flex items-center gap-1.5" style={{ color: cor }}>
                              <Shield className="h-3.5 w-3.5" />
                              <span className="font-semibold text-foreground">Nível: P × S = {nivel}</span>
                            </div>
                            <span className="text-border mx-1">•</span>
                            <span>Probabilidade: <strong className="text-foreground">{probLabel}</strong> (P)</span>
                            <span className="text-border mx-1">•</span>
                            <span>Severidade: <strong className="text-foreground">{sevLabel}</strong> (S)</span>
                            {r.grupo_exposto && (
                              <>
                                <span className="text-border mx-1">•</span>
                                <span className="text-muted-foreground">Grupo: <strong className="text-foreground">{r.grupo_exposto}</strong></span>
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

      {/* Diálogo de Criação/Edição de Risco */}
      <RiscoDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRisco(undefined);
        }}
        risco={editingRisco}
        onSubmit={handleSalvarRisco}
        isPending={createRisco.isPending || updateRisco.isPending}
      />

      {/* AlertDialog de Exclusão de Risco */}
      <AlertDialog open={!!riscoParaExcluir} onOpenChange={(open) => !open && setRiscoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir risco</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRisco.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleExcluirRiscoConfirmado();
              }}
              disabled={deleteRisco.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRisco.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
