import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PgrPlanoAcao, useUpdateAcao, useUploadEvidenciaAcao } from "@/hooks/usePgrAcoes";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { formatHistoricDate, normalizeDateToISO, cleanHistoricMessageText } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useResponsaveisRH } from "@/hooks/useResponsaveisRH";
import { ExecucoesTab } from "./ExecucoesTab";

interface AcaoDialogProps {
  acao: PgrPlanoAcao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AcaoDialog({ acao, open, onOpenChange }: AcaoDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const updateMutation = useUpdateAcao();
  const uploadMutation = useUploadEvidenciaAcao();
  const { user } = useAuth();
  const { data: responsaveis = [], isLoading: loadingResponsaveis } = useResponsaveisRH();

  if (!acao) return null;

  const handleUpdate = async (field: keyof PgrPlanoAcao, value: any, logMsg: string) => {
    try {
      await updateMutation.mutateAsync({
        id: acao.id,
        pgrImportacaoId: acao.pgr_importacao_id,
        updates: { [field]: value },
        mensagemLog: logMsg
      });
      toast.success("Ação atualizada");
    } catch (err: any) {
      toast.error(err.message);
    }
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
    if (!acao.evidencia_url) return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ação do PGR</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header Resumo da Ação */}
          <div className="space-y-2">
            <Label>Descrição da Ação (O que?)</Label>
            <div className="p-3 bg-muted rounded-md text-sm">{acao.acao}</div>
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
                    onValueChange={(val) => handleUpdate("status", val, `Status alterado de ${acao.status} para ${val}`)}
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
                <Label>Por que? (Motivador)</Label>
                <Textarea 
                  defaultValue={acao.por_que || ""} 
                  onBlur={(e) => {
                    if (e.target.value !== (acao.por_que || "")) {
                      handleUpdate("por_que", e.target.value, `Atualizou "Por que"`);
                    }
                  }}
                  maxLength={500}
                  placeholder="Justificativa para a ação..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Onde? (Local)</Label>
                  <Input 
                    defaultValue={acao.onde || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (acao.onde || "")) {
                        handleUpdate("onde", e.target.value, `Atualizou "Onde"`);
                      }
                    }}
                    maxLength={255}
                    placeholder="Ex: Setor de pintura"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Como? (Método)</Label>
                  <Input 
                    defaultValue={acao.como || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (acao.como || "")) {
                        handleUpdate("como", e.target.value, `Atualizou "Como"`);
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
      </DialogContent>
    </Dialog>
  );
}
