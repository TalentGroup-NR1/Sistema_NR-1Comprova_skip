import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PgrPlanoAcao, 
  useCreateAcao, 
  useUpdateAcao, 
  useUploadEvidenciaAcao, 
  validarMudancaStatus 
} from "@/hooks/usePgrAcoes";
import { usePgrRiscos } from "@/hooks/usePgrRiscos";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { formatHistoricDate, normalizeDateToISO, cleanHistoricMessageText } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useResponsaveisRH } from "@/hooks/useResponsaveisRH";
import { ExecucoesTab } from "./ExecucoesTab";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function useSaveIndicator() {
  const [saveStatus, setSaveStatus] = useState<Record<string, "saving" | "success" | "error" | undefined>>({});
  const [saveError, setSaveError] = useState<Record<string, string>>({});

  const trackSave = async (field: string, promise: Promise<any>) => {
    setSaveStatus(prev => ({ ...prev, [field]: "saving" }));
    try {
      await promise;
      setSaveStatus(prev => ({ ...prev, [field]: "success" }));
      setSaveError(prev => ({ ...prev, [field]: "" }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [field]: undefined })), 3000);
    } catch (err: any) {
      setSaveStatus(prev => ({ ...prev, [field]: "error" }));
      setSaveError(prev => ({ ...prev, [field]: err.message }));
      throw err;
    }
  };

  const SaveIndicator = ({ field }: { field: string }) => {
    if (saveStatus[field] === "saving") return <Loader2 data-testid="save-spinner" className="w-4 h-4 animate-spin text-muted-foreground ml-2 inline" />;
    if (saveStatus[field] === "success") return <CheckCircle2 data-testid="save-success" className="w-4 h-4 text-emerald-500 ml-2 inline" />;
    if (saveStatus[field] === "error") return (
      <span data-testid="save-error" className="inline-flex items-center ml-2 text-destructive text-xs gap-1">
        <AlertCircle className="w-4 h-4 inline" /> {saveError[field]}
      </span>
    );
    return null;
  };

  return { trackSave, SaveIndicator };
}

interface AcaoDialogProps {
  acao?: PgrPlanoAcao | null;
  pgrImportacaoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AcaoDialog({ acao, pgrImportacaoId, open, onOpenChange }: AcaoDialogProps) {
  const isCriacao = !acao;
  const companyId = useEffectiveCompanyId();
  const [isUploading, setIsUploading] = useState(false);
  const { trackSave, SaveIndicator } = useSaveIndicator();
  const updateMutation = useUpdateAcao();
  const createMutation = useCreateAcao();
  const uploadMutation = useUploadEvidenciaAcao();
  const { user } = useAuth();
  const { data: responsaveis = [], isLoading: loadingResponsaveis } = useResponsaveisRH();
  const { data: riscos = [] } = usePgrRiscos(pgrImportacaoId);

  // Estados locais para modo criação
  const [novoAcaoTexto, setNovoAcaoTexto] = useState("");
  const [novoPrioridade, setNovoPrioridade] = useState<"alta" | "media" | "baixa">("media");
  const [novoPrazo, setNovoPrazo] = useState("");
  const [novoResponsavelId, setNovoResponsavelId] = useState<string>("none");
  const [novoRiscoId, setNovoRiscoId] = useState<string>("none");
  const [novoPorQue, setNovoPorQue] = useState("");
  const [novoOnde, setNovoOnde] = useState("");
  const [novoComo, setNovoComo] = useState("");
  const [novoCustoEstimado, setNovoCustoEstimado] = useState<number>(0);

  // Estados locais para modo edição (AJUSTE 4: manter isolado de novoAcaoTexto)
  const [acaoTextoEdit, setAcaoTextoEdit] = useState(acao?.acao || "");
  const [acaoErro, setAcaoErro] = useState("");

  // Sincroniza estado de edição quando a ação muda
  useEffect(() => {
    if (acao) {
      setAcaoTextoEdit(acao.acao || "");
      setAcaoErro("");
    }
  }, [acao?.id, acao?.acao]);

  // Limpa estados ao fechar
  useEffect(() => {
    if (!open) {
      setNovoAcaoTexto("");
      setNovoPrioridade("media");
      setNovoPrazo("");
      setNovoResponsavelId("none");
      setNovoRiscoId("none");
      setNovoPorQue("");
      setNovoOnde("");
      setNovoComo("");
      setNovoCustoEstimado(0);
      setAcaoErro("");
    }
  }, [open]);

  if (!open) return null;
  if (!isCriacao && !acao) return null;

  // ────────────────────────────────────────────────────────────
  // Handlers do MODO CRIAÇÃO
  // ────────────────────────────────────────────────────────────
  const handleCreateAcao = async (e: React.FormEvent) => {
    e.preventDefault();
    const textoLimpo = novoAcaoTexto.trim();
    if (!textoLimpo) {
      toast.error("O campo 'O que?' (descrição da ação) é obrigatório");
      return;
    }
    if (textoLimpo.length < 3) {
      toast.error("A descrição da ação deve ter pelo menos 3 caracteres");
      return;
    }

    try {
      await createMutation.mutateAsync({
        pgr_importacao_id: pgrImportacaoId,
        company_id: companyId,
        acao: textoLimpo,
        prioridade: novoPrioridade,
        prazo: novoPrazo ? normalizeDateToISO(novoPrazo) : null,
        responsavel_id: novoResponsavelId === "none" ? null : novoResponsavelId,
        risco_id: novoRiscoId === "none" ? null : novoRiscoId,
        por_que: novoPorQue.trim() || null,
        onde: novoOnde.trim() || null,
        como: novoComo.trim() || null,
        custo_estimado: Number(novoCustoEstimado) || 0,
      });
      toast.success("Ação criada com sucesso");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar ação");
    }
  };

  // ────────────────────────────────────────────────────────────
  // Handlers do MODO EDIÇÃO
  // ────────────────────────────────────────────────────────────
  const handleUpdate = async (
    field: keyof PgrPlanoAcao,
    value: any,
    logMsg: string,
    silentToast = false,
    detalhesLog?: { campo?: string; de?: any; para?: any }
  ) => {
    if (!acao) return;
    try {
      await trackSave(field, updateMutation.mutateAsync({
        id: acao.id,
        pgrImportacaoId: acao.pgr_importacao_id,
        updates: { [field]: value },
        mensagemLog: logMsg,
        detalhesLog
      }));
      if (!silentToast) toast.success("Ação atualizada");
    } catch (err: any) {
      if (!silentToast) toast.error(err.message);
    }
  };

  const handleRiscoChange = (val: string) => {
    const selectedRiscoId = val === "none" ? null : val;
    const riscoNome = riscos.find(r => r.id === selectedRiscoId)?.nome;
    const msg = selectedRiscoId 
      ? `Vinculou ao risco "${riscoNome || selectedRiscoId}"`
      : "Desvinculou risco da ação";
    handleUpdate("risco_id", selectedRiscoId, msg);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await uploadMutation.mutateAsync({ file });
      await handleUpdate("evidencia_url", url, "Adicionou anexo de evidência");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenEvidencia = async () => {
    if (!acao?.evidencia_url) return;
    const { data, error } = await supabase.storage
      .from('documentos_analise')
      .createSignedUrl(acao.evidencia_url, 3600);
      
    if (error || !data?.signedUrl) {
      console.error("[handleOpenEvidencia] Error generating signed url:", error);
      toast.error("Falha ao gerar link da evidência");
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  // Helper de formatação de label de risco
  const formatRiscoLabel = (categoria: string, nome: string) => {
    const full = `${categoria} — ${nome}`;
    return full.length > 60 ? full.slice(0, 57) + "..." : full;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCriacao ? "Nova ação" : "Editar ação"}</DialogTitle>
        </DialogHeader>

        {isCriacao ? (
          /* ======================================================== */
          /* FORMULÁRIO DE CRIAÇÃO                                    */
          /* ======================================================== */
          <form onSubmit={handleCreateAcao} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="nova-acao-texto">
                Descrição da Ação (O que?) <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="nova-acao-texto"
                value={novoAcaoTexto}
                onChange={(e) => setNovoAcaoTexto(e.target.value)}
                placeholder="Ex: Instalação de linha de vida e treinamento para trabalho em altura..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-acao-risco">Risco relacionado</Label>
              <Select value={novoRiscoId} onValueChange={setNovoRiscoId}>
                <SelectTrigger id="nova-acao-risco">
                  <SelectValue placeholder="Selecione um risco (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo com risco</SelectItem>
                  {riscos.map(r => (
                    <SelectItem key={r.id} value={r.id} title={`${r.categoria} — ${r.nome}`}>
                      {formatRiscoLabel(r.categoria, r.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nova-acao-prioridade">Prioridade</Label>
                <Select value={novoPrioridade} onValueChange={(val: "alta" | "media" | "baixa") => setNovoPrioridade(val)}>
                  <SelectTrigger id="nova-acao-prioridade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nova-acao-prazo">Prazo (Quando?)</Label>
                <Input
                  id="nova-acao-prazo"
                  type="date"
                  value={novoPrazo}
                  onChange={(e) => setNovoPrazo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-acao-responsavel">Responsável (Quem?)</Label>
              {loadingResponsaveis ? (
                <p className="text-xs text-muted-foreground">Carregando responsáveis...</p>
              ) : responsaveis.length === 0 ? (
                <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                  Nenhum usuário ativo cadastrado nesta empresa.
                </p>
              ) : (
                <Select value={novoResponsavelId} onValueChange={setNovoResponsavelId}>
                  <SelectTrigger id="nova-acao-responsavel">
                    <SelectValue placeholder="Selecionar responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {responsaveis.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-acao-porque">Por que? (Motivador)</Label>
              <Textarea
                id="nova-acao-porque"
                value={novoPorQue}
                onChange={(e) => setNovoPorQue(e.target.value)}
                maxLength={500}
                placeholder="Justificativa para a ação..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nova-acao-onde">Onde? (Local)</Label>
                <Input
                  id="nova-acao-onde"
                  value={novoOnde}
                  onChange={(e) => setNovoOnde(e.target.value)}
                  maxLength={255}
                  placeholder="Ex: Setor de pintura"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nova-acao-como">Como? (Método)</Label>
                <Input
                  id="nova-acao-como"
                  value={novoComo}
                  onChange={(e) => setNovoComo(e.target.value)}
                  maxLength={255}
                  placeholder="Ex: Instalação de exaustor"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-acao-custo">Custo Estimado (R$)</Label>
              <Input
                id="nova-acao-custo"
                type="number"
                min="0"
                step="0.01"
                value={novoCustoEstimado}
                onChange={(e) => setNovoCustoEstimado(parseFloat(e.target.value) || 0)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Ação
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* ======================================================== */
          /* FORMULÁRIO DE EDIÇÃO (COM ABAS)                          */
          /* ======================================================== */
          <div className="space-y-4 py-2">
            {/* Header Resumo da Ação (Editável) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-acao-texto" className="flex items-center font-medium">
                  Descrição da Ação (O que?) <SaveIndicator field="acao" />
                </Label>
                <span className="text-xs text-muted-foreground" data-testid="edit-acao-char-count">
                  {acaoTextoEdit.length}/2000 caracteres
                </span>
              </div>
              <Textarea
                id="edit-acao-texto"
                value={acaoTextoEdit}
                onChange={(e) => {
                  setAcaoTextoEdit(e.target.value);
                  if (e.target.value.trim().length >= 1) {
                    setAcaoErro("");
                  }
                }}
                onBlur={() => {
                  const textoLimpo = acaoTextoEdit.trim();
                  if (!textoLimpo) {
                    setAcaoErro("A descrição da ação não pode ficar vazia.");
                    toast.error("A descrição da ação não pode ficar vazia.");
                    return;
                  }
                  if (textoLimpo === acao.acao) {
                    return;
                  }
                  setAcaoErro("");
                  handleUpdate(
                    "acao",
                    textoLimpo,
                    `Alterou descrição da ação de "${acao.acao}" para "${textoLimpo}"`,
                    false,
                    { campo: "acao", de: acao.acao, para: textoLimpo }
                  );
                }}
                maxLength={2000}
                rows={3}
                placeholder="Descreva a ação a ser executada..."
                className={acaoErro ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {acaoErro && (
                <p className="text-xs text-destructive flex items-center gap-1" data-testid="edit-acao-error">
                  <AlertCircle className="w-3.5 h-3.5 inline" /> {acaoErro}
                </p>
              )}
            </div>

            {/* Seletor de Risco Relacionado */}
            <div className="space-y-2">
              <Label className="flex items-center">
                Risco relacionado <SaveIndicator field="risco_id" />
              </Label>
              <Select
                value={acao.risco_id ?? "none"}
                onValueChange={handleRiscoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um risco (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo com risco</SelectItem>
                  {/* Se o risco já vinculado não estiver ativo na lista */}
                  {acao.risco_id && !riscos.find(r => r.id === acao.risco_id) && (
                    <SelectItem value={acao.risco_id} disabled>
                      {acao.pgr_riscos?.nome ?? "Risco vinculado anteriormente"}
                    </SelectItem>
                  )}
                  {riscos.map(r => (
                    <SelectItem key={r.id} value={r.id} title={`${r.categoria} — ${r.nome}`}>
                      {formatRiscoLabel(r.categoria, r.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="detalhes" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="detalhes">Detalhes (5W2H)</TabsTrigger>
                <TabsTrigger value="execucao">Log de Execução</TabsTrigger>
                <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
              </TabsList>

              <TabsContent value="detalhes" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select 
                      value={acao.prioridade} 
                      onValueChange={(val) => handleUpdate("prioridade", val, `Prioridade alterada para ${val}`)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={acao.status} 
                      onValueChange={(val) => {
                        const { permitido, mostrarAviso } = validarMudancaStatus(acao, val);
                        
                        if (!permitido) {
                          toast.error("Preencha o 5W2H antes de concluir a ação");
                          return;
                        }
                        
                        if (mostrarAviso) {
                          toast.warning("Ação concluída, mas o 5W2H está incompleto. Considere preenchê-lo para melhor gestão.");
                        }
                        
                        handleUpdate("status", val, `Status alterado de ${acao.status} para ${val}`);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="validada">Eficácia verificada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prazo (Quando?)</Label>
                    <Input 
                      type="date" 
                      value={acao.prazo || ""} 
                      onChange={(e) => {
                        const normalized = normalizeDateToISO(e.target.value);
                        handleUpdate("prazo", normalized, `Prazo alterado para ${normalized || 'vazio'}`);
                      }}
                    />
                  </div>
                </div>

                {/* Responsável (Quem?) */}
                <div className="space-y-2">
                  <Label>Responsável (Quem?)</Label>
                  {loadingResponsaveis ? (
                    <p className="text-xs text-muted-foreground">Carregando responsáveis...</p>
                  ) : responsaveis.length === 0 ? (
                    <p className="text-xs text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                      Nenhum usuário ativo cadastrado nesta empresa.
                    </p>
                  ) : (
                    <Select
                      value={acao.responsavel_id ?? "none"}
                      onValueChange={(val) => {
                        const nome = responsaveis.find(r => r.id === val)?.full_name ?? "desconhecido";
                        handleUpdate(
                          "responsavel_id",
                          val === "none" ? null : val,
                          val === "none" ? "Removeu responsável" : `Atribuiu responsável para ${nome}`
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar responsável..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {/* Fallback */}
                        {acao.responsavel_id && !responsaveis.find(r => r.id === acao.responsavel_id) && (
                          <SelectItem value={acao.responsavel_id} disabled>
                            {acao.colaboradores?.full_name ?? "Responsável inativo"}
                          </SelectItem>
                        )}
                        {responsaveis.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Novos Campos 5W2H */}
                <div className="space-y-2">
                  <Label className="flex items-center">Por que? (Motivador) <SaveIndicator field="por_que" /></Label>
                  <Textarea 
                    defaultValue={acao.por_que || ""} 
                    onBlur={(e) => {
                      if (e.target.value !== (acao.por_que || "")) {
                        handleUpdate("por_que", e.target.value, `Atualizou "Por que"`, true);
                      }
                    }}
                    maxLength={500}
                    placeholder="Justificativa para a ação..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">Onde? (Local) <SaveIndicator field="onde" /></Label>
                    <Input 
                      defaultValue={acao.onde || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (acao.onde || "")) {
                          handleUpdate("onde", e.target.value, `Atualizou "Onde"`, true);
                        }
                      }}
                      maxLength={255}
                      placeholder="Ex: Setor de pintura"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center">Como? (Método) <SaveIndicator field="como" /></Label>
                    <Input 
                      defaultValue={acao.como || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (acao.como || "")) {
                          handleUpdate("como", e.target.value, `Atualizou "Como"`, true);
                        }
                      }}
                      maxLength={255}
                      placeholder="Ex: Instalação de exaustor"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Custo Estimado (R$)</Label>
                    <Input 
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={acao.custo_estimado || 0}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (val >= 0 && val !== (acao.custo_estimado || 0)) {
                          handleUpdate("custo_estimado", val, `Atualizou Custo Estimado para R$ ${val}`);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo Real Consolidado (R$)</Label>
                    <Input 
                      type="number"
                      value={acao.custo_real || 0}
                      disabled
                      className="bg-muted font-semibold text-emerald-700"
                      title="Derivado da soma dos custos no Log de Execução"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evidência Consolidada (Upload)</Label>
                  <div className="flex gap-2">
                    <Input type="file" onChange={handleFileUpload} disabled={isUploading} className="flex-1" />
                    {acao.evidencia_url && (
                      <Button variant="outline" type="button" onClick={handleOpenEvidencia}>
                        Ver Evidência
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="execucao" className="mt-4">
                <ExecucoesTab acao={acao} />
              </TabsContent>

              <TabsContent value="auditoria" className="mt-4">
                <div className="bg-muted p-4 rounded-md space-y-2 max-h-[60vh] overflow-y-auto">
                  {acao.historico?.length === 0 && <p className="text-xs text-muted-foreground">Sem histórico.</p>}
                  {acao.historico?.map((h, i) => {
                    if (h.mudanca) {
                      return (
                        <div key={i} className="text-xs border-b border-border pb-1 mb-1">
                          <span className="font-semibold">{formatHistoricDate(h.data)}</span>: {cleanHistoricMessageText(h.mudanca)}
                        </div>
                      );
                    } else if (h.campo) {
                      const nomeAutor = h.autor?.nome || "Usuário";
                      return (
                        <div key={i} className="text-xs border-b border-border pb-1 mb-1">
                          <span className="font-semibold">{formatHistoricDate(h.data)}</span> — 
                          <span className="font-medium text-muted-foreground ml-1">{nomeAutor}</span> alterou <strong>{h.campo}</strong> de <em>{cleanHistoricMessageText(h.de) || "vazio"}</em> para <em>{cleanHistoricMessageText(h.para) || "vazio"}</em>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
