import React, { useState } from "react";
import { useExecucoesAcao, useCreateExecucao, useUpdateAcao, PgrPlanoAcao, useUploadEvidenciaAcao } from "@/hooks/usePgrAcoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useResponsaveisRH } from "@/hooks/useResponsaveisRH";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatHistoricDate, normalizeDateToISO } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";

interface ExecucoesTabProps {
  acao: PgrPlanoAcao;
}

export function ExecucoesTab({ acao }: ExecucoesTabProps) {
  const { data: execucoes, isLoading } = useExecucoesAcao(acao.id);
  const { data: responsaveis = [] } = useResponsaveisRH();
  
  const createMutation = useCreateExecucao();
  const updateAcao = useUpdateAcao();
  const uploadEvidencia = useUploadEvidenciaAcao();

  const [form, setForm] = useState({
    data: new Date().toISOString().split("T")[0],
    o_que_foi_feito: "",
    como: "",
    onde: "",
    quem_executou: "",
    custo: 0,
    mudar_status: false,
    novo_status: acao.status
  });

  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.o_que_foi_feito.trim()) {
      toast.error("Preencha o que foi feito");
      return;
    }
    if (form.custo < 0) {
      toast.error("O custo não pode ser negativo");
      return;
    }

    setIsSubmitting(true);
    try {
      let evidencia_url = null;
      if (file) {
        evidencia_url = await uploadEvidencia.mutateAsync({ file });
      }

      await createMutation.mutateAsync({
        acao_id: acao.id,
        data: normalizeDateToISO(form.data) || new Date().toISOString(),
        o_que_foi_feito: form.o_que_foi_feito,
        como: form.como || null,
        onde: form.onde || null,
        quem_executou: form.quem_executou || null,
        custo: Number(form.custo),
        evidencia_url
      });

      if (form.mudar_status && form.novo_status !== acao.status) {
        await updateAcao.mutateAsync({
          id: acao.id,
          pgrImportacaoId: acao.pgr_importacao_id,
          updates: { status: form.novo_status as any },
          mensagemLog: `Status alterado via registro de execução de ${acao.status} para ${form.novo_status}`
        });
      }

      toast.success("Execução registrada com sucesso!");
      setForm({
        data: new Date().toISOString().split("T")[0],
        o_que_foi_feito: "",
        como: "",
        onde: "",
        quem_executou: "",
        custo: 0,
        mudar_status: false,
        novo_status: acao.status
      });
      setFile(null);
    } catch (err: any) {
      // Error handled in mutations
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEvidencia = async (url: string | null) => {
    if (!url) return;
    const { data, error } = await supabase.storage.from("documentos_analise").createSignedUrl(url, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="p-4 border rounded-md bg-muted/30 space-y-4">
        <h3 className="font-semibold text-sm">Registrar Nova Execução</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data da Execução *</Label>
            <Input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label>Quem Executou</Label>
            <Select value={form.quem_executou} onValueChange={v => setForm({...form, quem_executou: v === "none" ? "" : v})}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum/Outro</SelectItem>
                {responsaveis.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>O que foi feito? *</Label>
          <Textarea 
            value={form.o_que_foi_feito} 
            onChange={e => setForm({...form, o_que_foi_feito: e.target.value})} 
            maxLength={1000} 
            required 
            placeholder="Descreva a atividade realizada..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Como (Método/Ferramentas)</Label>
            <Input value={form.como} onChange={e => setForm({...form, como: e.target.value})} maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label>Onde (Local específico)</Label>
            <Input value={form.onde} onChange={e => setForm({...form, onde: e.target.value})} maxLength={255} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Custo da Etapa (R$)</Label>
            <Input type="number" min="0" step="0.01" value={form.custo} onChange={e => setForm({...form, custo: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="space-y-2">
            <Label>Evidência / Recibo</Label>
            <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.mudar_status} onChange={e => setForm({...form, mudar_status: e.target.checked})} className="rounded border-gray-300" />
            Atualizar status da ação
          </label>
          
          {form.mudar_status && (
            <Select value={form.novo_status} onValueChange={v => setForm({...form, novo_status: v as any})}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="validada">Eficácia verificada</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Salvando..." : "Salvar Registro"}
        </Button>
      </form>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Timeline de Execução</h3>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : execucoes?.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma execução registrada.</p>
        ) : (
          <div className="space-y-3 pl-2 border-l-2 border-primary/20">
            {execucoes?.map(ex => (
              <div key={ex.id} className="relative pl-4">
                <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-1.5" />
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-primary">{formatHistoricDate(ex.data)}</span>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                      R$ {Number(ex.custo).toFixed(2)}
                    </span>
                  </div>
                  <p className="font-medium">{ex.o_que_foi_feito}</p>
                  
                  {(ex.como || ex.onde || ex.colaboradores?.full_name) && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                      {ex.colaboradores?.full_name && <p><strong>Quem:</strong> {ex.colaboradores.full_name}</p>}
                      {ex.como && <p><strong>Como:</strong> {ex.como}</p>}
                      {ex.onde && <p><strong>Onde:</strong> {ex.onde}</p>}
                    </div>
                  )}
                  
                  {ex.evidencia_url && (
                    <Button variant="link" className="h-auto p-0 text-xs mt-2" onClick={() => handleOpenEvidencia(ex.evidencia_url)}>
                      Ver Evidência
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
