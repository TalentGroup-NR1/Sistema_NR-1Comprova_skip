import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, PlayCircle, CheckSquare, FileText } from "lucide-react";
import { toast } from "sonner";
import { getTemplateCompleto, TemplateCompleto, finalizarAplicacao } from "./api";
import { useAuth } from "@/hooks/useAuth";
import { useGhes } from "@/hooks/useEstruturaConfig";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistExecutorProps {
  templateId: string;
  onBack: () => void;
}

export function ChecklistExecutor({ templateId, onBack }: ChecklistExecutorProps) {
  const { companyId } = useAuth();
  const [template, setTemplate] = useState<TemplateCompleto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Setup form states
  const [tipoAplicacao, setTipoAplicacao] = useState<'ghe' | 'posto'>('posto');
  const [gheId, setGheId] = useState<string>("");
  const [postoTrabalho, setPostoTrabalho] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);
  const [aplicacaoId, setAplicacaoId] = useState<string | null>(null);

  const { data: ghes = [] } = useGhes(companyId);

  // Estados da Etapa 2: Paginação e Respostas Draft
  const [currentSecaoIndex, setCurrentSecaoIndex] = useState(0);
  const [respostasDraft, setRespostasDraft] = useState<Record<string, { resposta_valor?: string, observacao_especifica?: string, foto_path?: string, foto_url?: string }>>({});
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    const carregarTemplate = async () => {
      setIsLoading(true);
      try {
        const data = await getTemplateCompleto(templateId);
        if (data) {
          console.log("[ChecklistExecutor] Template carregado:", data);
          // Ordena seções e perguntas
          data.secoes = (data.secoes || []).sort((a: any, b: any) => a.ordem - b.ordem).map((s: any) => ({
            ...s,
            perguntas: (s.perguntas || []).sort((a: any, b: any) => a.ordem - b.ordem)
          }));
          setTemplate(data);
        } else {
          toast.error("Template não encontrado.");
          onBack();
        }
      } catch (error) {
        toast.error("Erro ao carregar template.");
      } finally {
        setIsLoading(false);
      }
    };
    carregarTemplate();
  }, [templateId, onBack]);

  const handleIniciarAplicacao = async () => {
    if (tipoAplicacao === 'ghe' && !gheId) {
      toast.error("Selecione um GHE.");
      return;
    }
    if (tipoAplicacao === 'posto' && !postoTrabalho.trim()) {
      toast.error("Digite o nome do Posto de Trabalho.");
      return;
    }

    setIsStarting(true);
    try {
      const { data, error } = await supabase
        .from('checklist_aplicacoes')
        .insert({
          company_id: companyId,
          tipo_aplicacao: tipoAplicacao,
          ghe_id: tipoAplicacao === 'ghe' ? gheId : null,
          posto_trabalho: tipoAplicacao === 'posto' ? postoTrabalho : null,
          status: 'em_andamento'
        })
        .select('id')
        .single();

      if (error) throw error;
      
      setAplicacaoId(data.id);
      toast.success("Aplicação iniciada com sucesso!");
    } catch (err) {
      console.error("Erro ao iniciar aplicação:", err);
      toast.error("Falha ao criar o registro da aplicação.");
    } finally {
      setIsStarting(false);
    }
  };

  const updateResposta = (perguntaId: string, campo: 'resposta_valor' | 'observacao_especifica' | 'foto_path' | 'foto_url', valor: string | undefined) => {
    setRespostasDraft(prev => ({
      ...prev,
      [perguntaId]: {
        ...prev[perguntaId],
        [campo]: valor
      }
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, perguntaId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O limite é 5 MB.");
      return;
    }

    setUploadingPhotoId(perguntaId);
    try {
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const path = `${companyId}/${aplicacaoId}/${perguntaId}/${timestamp}_${random}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('checklist-fotos').upload(path, file);
      if (uploadError) throw uploadError;

      const { data, error: signedError } = await supabase.storage.from('checklist-fotos').createSignedUrl(path, 60 * 60);
      if (signedError) throw signedError;

      setRespostasDraft(prev => ({
        ...prev,
        [perguntaId]: {
          ...prev[perguntaId],
          foto_path: path,
          foto_url: data.signedUrl
        }
      }));
      toast.success("Foto enviada com sucesso.");
    } catch(err: any) {
      console.error("Erro upload:", err);
      toast.error("Falha ao enviar a foto.");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const handleRemovePhoto = async (perguntaId: string, path: string) => {
    if (!confirm("Deseja realmente remover a foto?")) return;
    setUploadingPhotoId(perguntaId);
    try {
      await supabase.storage.from('checklist-fotos').remove([path]);
      setRespostasDraft(prev => {
        const next = { ...prev };
        if (next[perguntaId]) {
          next[perguntaId] = { ...next[perguntaId], foto_path: undefined, foto_url: undefined };
        }
        return next;
      });
      toast.success("Foto removida.");
    } catch(e) {
      toast.error("Falha ao remover a foto.");
    } finally {
      setUploadingPhotoId(null);
    }
  };

  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFinalizar = async () => {
    if (!template) return;
    
    // Validação de obrigatórias
    const missing: string[] = [];
    for (const s of template.secoes || []) {
      for (const p of s.perguntas || []) {
        if (p.obrigatoria) {
          const draft = respostasDraft[p.id];
          if (!draft?.resposta_valor && !draft?.observacao_especifica) {
            missing.push(`- ${p.texto || p.texto_pergunta || 'Pergunta sem texto'}`);
          }
        }
      }
    }

    if (missing.length > 0) {
      toast.error(
        <div className="flex flex-col">
          <span className="font-bold mb-1">Preencha as perguntas obrigatórias:</span>
          {missing.map((m, i) => <span key={i} className="text-sm">{m}</span>)}
        </div>
      );
      return;
    }

    if (!confirm("Tem certeza? A ação não poderá ser desfeita.")) return;

    setIsSaving(true);
    try {
      await finalizarAplicacao(aplicacaoId!, companyId!, respostasDraft);
      setIsCompleted(true);
      toast.success("Checklist finalizado com sucesso!");
    } catch(e) {
      toast.error("Erro ao salvar aplicação.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Preparando ambiente de execução...</p>
      </div>
    );
  }

  if (isCompleted) {
    const totalFotos = Object.values(respostasDraft).filter(r => !!r.foto_path).length;
    const totalRespostas = Object.values(respostasDraft).filter(r => r.resposta_valor || r.observacao_especifica || r.foto_path).length;
    
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 max-w-lg mx-auto bg-card border rounded-lg mt-8 shadow-sm">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckSquare className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Checklist Concluído!</h2>
          <p className="text-muted-foreground mt-2">
            A aplicação foi finalizada e os dados foram salvos com sucesso.
          </p>
        </div>
        <div className="grid grid-cols-2 w-full gap-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800">{totalRespostas}</span>
            <span className="text-sm text-muted-foreground">Respostas salvas</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-800">{totalFotos}</span>
            <span className="text-sm text-muted-foreground">Fotos anexadas</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full mt-4">
          <Button onClick={onBack} size="lg" variant="outline" className="w-full">
            Voltar para os Templates
          </Button>
          <Button onClick={() => window.open(`/laudo/${aplicacaoId}`, '_blank')} size="lg" className="w-full bg-slate-800 hover:bg-slate-700">
            <FileText className="mr-2 h-4 w-4" />
            Ver Laudo
          </Button>
        </div>
      </div>
    );
  }

  if (!template) return null;

  // Tela de Setup inicial da aplicação
  if (!aplicacaoId) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Nova Aplicação: {template.nome}</h2>
            <p className="text-muted-foreground text-sm">Preencha os dados do local ou grupo avaliado.</p>
          </div>
        </div>

        <div className="border rounded-lg bg-card p-6 space-y-6 shadow-sm">
          <div className="space-y-3">
            <Label>Tipo de Avaliação</Label>
            <div className="flex gap-4">
              <Button 
                variant={tipoAplicacao === 'posto' ? 'default' : 'outline'} 
                onClick={() => setTipoAplicacao('posto')}
                className="flex-1"
              >
                Posto de Trabalho
              </Button>
              <Button 
                variant={tipoAplicacao === 'ghe' ? 'default' : 'outline'} 
                onClick={() => setTipoAplicacao('ghe')}
                className="flex-1"
              >
                GHE (Grupo Homogêneo)
              </Button>
            </div>
          </div>

          {tipoAplicacao === 'posto' ? (
            <div className="space-y-3">
              <Label>Nome do Posto de Trabalho</Label>
              <Input 
                value={postoTrabalho} 
                onChange={(e) => setPostoTrabalho(e.target.value)} 
                placeholder="Ex: Recepção principal, Empilhadeira 2..."
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Selecione o GHE</Label>
              <Select value={gheId} onValueChange={setGheId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um GHE da empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {ghes.map((ghe: any) => (
                    <SelectItem key={ghe.id} value={ghe.id}>{ghe.nome}</SelectItem>
                  ))}
                  {ghes.length === 0 && (
                    <SelectItem value="none" disabled>Nenhum GHE cadastrado</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleIniciarAplicacao} disabled={isStarting} size="lg">
              {isStarting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
              Iniciar Checklist
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const secoesList = template.secoes || [];
  const currentSecao = secoesList[currentSecaoIndex];
  const isLastSecao = currentSecaoIndex === secoesList.length - 1;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header Fixo */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setAplicacaoId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Execução: {template?.nome}</h2>
              <p className="text-muted-foreground text-sm">
                Alvo: {tipoAplicacao === 'posto' ? postoTrabalho : ghes?.find((g: any) => g.id === gheId)?.nome}
              </p>
            </div>
          </div>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold text-sm">
            Seção {currentSecaoIndex + 1} de {secoesList.length}
          </div>
        </div>
      </div>

      {/* Renderização da Seção */}
      {currentSecao ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="text-lg font-bold">{currentSecao.nome}</h3>
          </div>

          <div className="space-y-8">
            {(currentSecao.perguntas || []).map((pergunta: any, index: number) => {
              const draft = respostasDraft[pergunta.id] || {};
              
              return (
                <div key={pergunta.id} className="border rounded-xl p-5 shadow-sm space-y-4 bg-card">
                  <div className="flex gap-3 justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                          {pergunta.codigo_verificacao || `Q${index + 1}`}
                        </span>
                        {pergunta.obrigatoria && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                            Obrigatória
                          </span>
                        )}
                        {pergunta.permite_foto && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                            Foto Permitida
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-base text-card-foreground">
                        {pergunta.texto_pergunta || pergunta.texto}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    {/* Controles de Resposta */}
                    {pergunta.tipo_resposta === 'C_NC_NA' && (
                      <div className="flex gap-4">
                        {['C', 'NC', 'NA'].map(val => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-muted/50 transition-colors">
                            <input 
                              type="radio" 
                              name={`res-${pergunta.id}`}
                              value={val}
                              checked={draft.resposta_valor === val}
                              onChange={(e) => updateResposta(pergunta.id, 'resposta_valor', e.target.value)}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm font-medium">{val === 'C' ? 'Conforme' : val === 'NC' ? 'Não Conforme' : 'N/A'}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'SIM_NAO' && (
                      <div className="flex gap-4">
                        {['Sim', 'Não'].map(val => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-muted/50 transition-colors">
                            <input 
                              type="radio" 
                              name={`res-${pergunta.id}`}
                              value={val}
                              checked={draft.resposta_valor === val}
                              onChange={(e) => updateResposta(pergunta.id, 'resposta_valor', e.target.value)}
                              className="w-4 h-4 text-primary"
                            />
                            <span className="text-sm font-medium">{val}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {pergunta.tipo_resposta === 'TEXTO' && (
                      <div className="mt-2">
                        <textarea
                          placeholder="Digite a resposta aqui..."
                          value={draft.observacao_especifica || ''}
                          onChange={(e) => updateResposta(pergunta.id, 'observacao_especifica', e.target.value)}
                          className="w-full min-h-[80px] p-3 rounded-md border bg-transparent text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    )}

                    {/* Observação para não-texto */}
                    {pergunta.tipo_resposta !== 'TEXTO' && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground mb-1 block">Observação (Opcional)</Label>
                        <Input 
                          placeholder="Adicione notas ou justificativas..."
                          value={draft.observacao_especifica || ''}
                          onChange={(e) => updateResposta(pergunta.id, 'observacao_especifica', e.target.value)}
                          className="text-sm bg-muted/30"
                        />
                      </div>
                    )}

                    {/* Upload de Foto */}
                    {pergunta.permite_foto && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <Label className="text-xs text-muted-foreground mb-2 block">Evidência Fotográfica</Label>
                        {draft.foto_path && draft.foto_url ? (
                          <div className="flex flex-col gap-2 w-fit">
                            <div className="relative group rounded-md overflow-hidden border">
                              <img src={draft.foto_url} alt="Evidência" className="w-32 h-32 object-cover" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleRemovePhoto(pergunta.id, draft.foto_path!)}
                                  disabled={uploadingPhotoId === pergunta.id}
                                >
                                  {uploadingPhotoId === pergunta.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <Input 
                              type="file" 
                              accept="image/jpeg,image/png,image/webp" 
                              className="max-w-[250px] text-xs file:h-full file:bg-muted file:border-r file:mr-4 file:px-3 file:py-1 cursor-pointer" 
                              onChange={(e) => handlePhotoUpload(e, pergunta.id)}
                              disabled={uploadingPhotoId === pergunta.id}
                            />
                            {uploadingPhotoId === pergunta.id && (
                              <div className="flex items-center text-xs text-muted-foreground gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {(!currentSecao.perguntas || currentSecao.perguntas.length === 0) && (
              <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                Esta seção não possui perguntas.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center p-8">Seção não encontrada.</div>
      )}

      {/* Navegação Inferior */}
      <div className="flex justify-between items-center pt-8 border-t mt-8">
        <Button 
          variant="outline" 
          onClick={() => setCurrentSecaoIndex(prev => Math.max(0, prev - 1))}
          disabled={currentSecaoIndex === 0}
        >
          Seção Anterior
        </Button>

        {isLastSecao ? (
          <Button 
            size="lg" 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleFinalizar}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckSquare className="w-5 h-5 mr-2" />}
            Finalizar Checklist
          </Button>
        ) : (
          <Button 
            onClick={() => setCurrentSecaoIndex(prev => Math.min(secoesList.length - 1, prev + 1))}
          >
            Próxima Seção
          </Button>
        )}
      </div>
    </div>
  );
}
