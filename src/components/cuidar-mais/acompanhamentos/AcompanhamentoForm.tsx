import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { toast } from "sonner";
import { Plus, Trash2, Calendar as CalendarIcon, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AcompanhamentoStatus = 'novo' | 'em_andamento' | 'aguardando_retorno' | 'concluido' | 'arquivado';

interface AcompanhamentoFormProps {
  colaboradorId?: string;
  respostaId?: string;
  initialData?: any; // Data from existing record for edit
  contextoPulso?: { emoji: string; nome: string }; // Read-only context
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AcompanhamentoForm({ colaboradorId, respostaId, initialData, contextoPulso, onSuccess, onCancel }: AcompanhamentoFormProps) {
  const companyId = useEffectiveCompanyId();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form State
  const [status, setStatus] = useState<AcompanhamentoStatus>(initialData?.status || 'novo');
  const [objetivo, setObjetivo] = useState(initialData?.objetivo || "");
  const [acoes, setAcoes] = useState<string[]>(initialData?.acoes || []);
  const [novaAcao, setNovaAcao] = useState("");
  const [anotacoes, setAnotacoes] = useState(initialData?.anotacoes || "");
  const [proximoContato, setProximoContato] = useState<Date | undefined>(
    initialData?.proximo_contato_em ? new Date(initialData.proximo_contato_em + 'T12:00:00') : undefined
  );
  const [resultado, setResultado] = useState(initialData?.resultado || "");

  // Colaboradores list (for the dropdown if starting from scratch)
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>(colaboradorId || initialData?.colaborador_id || "");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    
    if (!colaboradorId && !initialData?.colaborador_id && companyId) {
      supabase.from("colaboradores")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("status", "ATIVO")
        .order("full_name")
        .then(({ data }) => setColaboradores(data || []));
    }
  }, [companyId, colaboradorId, initialData]);

  const handleAddAcao = () => {
    if (novaAcao.trim()) {
      setAcoes([...acoes, novaAcao.trim()]);
      setNovaAcao("");
    }
  };

  const handleRemoveAcao = (index: number) => {
    setAcoes(acoes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !companyId) return;

    if (!selectedColaboradorId) {
      toast.error("Selecione um colaborador.");
      return;
    }

    if (status === 'concluido' && !resultado.trim()) {
      toast.error("O campo 'Resultado' é obrigatório ao concluir um acompanhamento.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        company_id: companyId,
        colaborador_id: selectedColaboradorId,
        resposta_id: respostaId || initialData?.resposta_id || null,
        responsavel_id: initialData?.responsavel_id || userId,
        status,
        objetivo,
        acoes,
        anotacoes,
        proximo_contato_em: proximoContato ? format(proximoContato, "yyyy-MM-dd") : null,
        concluido_em: status === 'concluido' && initialData?.status !== 'concluido' ? new Date().toISOString() : initialData?.concluido_em || null,
        resultado: status === 'concluido' ? resultado : initialData?.resultado || null,
        updated_by: userId
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("pulse_acompanhamentos")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        toast.success("Acompanhamento atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("pulse_acompanhamentos")
          .insert([payload]);
        if (error) throw error;
        toast.success("Acompanhamento criado com sucesso!");
      }
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro no Supabase ao salvar acompanhamento:", err.message || err.code || err);
      let errorMsg = "Erro ao salvar o acompanhamento.";
      
      if (err.code === '42501') {
        errorMsg = "Erro de permissão — contate o administrador.";
      } else if (err.code === '23503') {
        errorMsg = "Referência inválida (ex.: resposta_id ou colaborador_id não existem).";
      } else if (err.code === '22P02') {
        errorMsg = "Dados inválidos enviados ao banco.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {contextoPulso && (
        <div className="bg-muted p-4 rounded-md flex items-center gap-3">
          <div className="text-3xl">{contextoPulso.emoji}</div>
          <div>
            <p className="font-medium text-sm">Contexto do Pulso</p>
            <p className="text-sm text-muted-foreground">Colaborador: {contextoPulso.nome}</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Colaborador Foco *</Label>
          {colaboradorId || initialData?.colaborador_id ? (
            <Input disabled value={contextoPulso?.nome || initialData?.colaboradores?.full_name || "Vinculado"} />
          ) : (
            <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Status *</Label>
          <Select value={status} onValueChange={(v: AcompanhamentoStatus) => setStatus(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="aguardando_retorno">Aguardando Retorno</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Objetivo Principal</Label>
        <Input 
          placeholder="O que buscamos resolver ou acompanhar?" 
          value={objetivo} 
          onChange={e => setObjetivo(e.target.value)} 
        />
      </div>

      <div className="space-y-3">
        <Label>Ações Planejadas</Label>
        <div className="flex gap-2">
          <Input 
            placeholder="Nova ação..." 
            value={novaAcao} 
            onChange={e => setNovaAcao(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAcao(); } }}
          />
          <Button type="button" onClick={handleAddAcao} variant="secondary">Adicionar</Button>
        </div>
        {acoes.length > 0 && (
          <ul className="bg-slate-50 border rounded-md p-3 space-y-2">
            {acoes.map((acao, i) => (
              <li key={i} className="flex justify-between items-center text-sm p-2 bg-white border rounded">
                <span>{acao}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleRemoveAcao(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Próximo Contato</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !proximoContato && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {proximoContato ? format(proximoContato, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={proximoContato} onSelect={setProximoContato} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Anotações e Histórico</Label>
        <Textarea 
          placeholder="Registre quem, quando e o que foi feito..." 
          className="min-h-[120px]"
          value={anotacoes} 
          onChange={e => setAnotacoes(e.target.value)}
        />
      </div>

      {status === 'concluido' && (
        <div className="space-y-2 bg-green-50/50 p-4 rounded-md border border-green-100">
          <Label className="text-green-800">Resultado do Acompanhamento *</Label>
          <Textarea 
            placeholder="Qual foi o desfecho deste caso?" 
            value={resultado} 
            onChange={e => setResultado(e.target.value)}
            className="border-green-200"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Acompanhamento"}
        </Button>
      </div>
    </form>
  );
}
