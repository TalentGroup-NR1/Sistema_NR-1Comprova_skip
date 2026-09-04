import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, ArrowLeft, Save, Plus, ArrowUp, ArrowDown, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { salvarEdicoesTemplate, getTemplateCompleto, TemplateCompleto, SecaoComPerguntas, PerguntaChecklist } from "./api";
import { useCatalogoRiscos } from "@/hooks/useRiscosGhe";
import { useAuth } from "@/hooks/useAuth";

// Tipos para estado em memória
export type EditorPergunta = PerguntaChecklist & {
  isNew?: boolean;
  isDirty?: boolean;
  isDeleted?: boolean;
};

export type EditorSecao = SecaoComPerguntas & {
  perguntas: EditorPergunta[];
  isNew?: boolean;
  isDirty?: boolean;
  isDeleted?: boolean;
};

interface ChecklistEditorProps {
  templateId: string;
  onBack: () => void;
}

export function ChecklistEditor({ templateId, onBack }: ChecklistEditorProps) {
  const { companyId } = useAuth();
  const [template, setTemplate] = useState<TemplateCompleto | null>(null);
  const [secoes, setSecoes] = useState<EditorSecao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { data: catalogo = [] } = useCatalogoRiscos();

  const carregarTemplate = async () => {
    setIsLoading(true);
    try {
      const data = await getTemplateCompleto(templateId);
      if (data) {
        setTemplate(data);
        const secoesIniciais = (data.secoes || []).map(s => ({
          ...s,
          perguntas: (s.perguntas || []).map(p => ({ ...p }))
        }));
        setSecoes(secoesIniciais);
      } else {
        toast.error("Template não encontrado.");
        onBack();
      }
    } catch (error) {
      toast.error("Erro ao carregar os dados do template.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarTemplate();
  }, [templateId, onBack]);

  const handleSalvar = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      const sucesso = await salvarEdicoesTemplate(templateId, secoes, template.secoes || [], companyId);
      if (sucesso) {
        toast.success("Alterações salvas com sucesso!");
        await carregarTemplate(); // recarrega estrutura limpa do banco
      } else {
        toast.error("Erro ao salvar. As alterações foram revertidas.");
      }
    } catch (err) {
      toast.error("Erro inesperado ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const countPendente = () => {
    let cnt = 0;
    secoes.forEach(s => {
      if (s.isNew || s.isDirty || s.isDeleted) cnt++;
      s.perguntas.forEach(p => {
        if (p.isNew || p.isDirty || p.isDeleted) cnt++;
      });
    });
    return cnt;
  };

  const recalcularOrdemArray = <T extends { ordem: number }>(arr: T[]): T[] => {
    return arr.map((item, index) => ({
      ...item,
      ordem: index + 1,
      isDirty: item.ordem !== index + 1 ? true : (item as any).isDirty
    }));
  };

  // Funções de Secão
  const addSecao = () => {
    console.log("Adicionando nova seção");
    const novaOrdem = secoes.length > 0 ? Math.max(...secoes.map(s => s.ordem)) + 1 : 1;
    const nova: EditorSecao = {
      id: crypto.randomUUID(),
      template_id: templateId,
      nome: "Nova Seção",
      ordem: novaOrdem,
      isNew: true,
      perguntas: []
    };
    setSecoes([...secoes, nova]);
  };

  const editSecao = (id: string, nome: string) => {
    console.log("Editando seção:", id, nome);
    setSecoes(secoes.map(s => s.id === id ? { ...s, nome, isDirty: !s.isNew } : s));
  };

  const moveSecao = (index: number, dir: 1 | -1) => {
    console.log("Movendo seção index:", index, "dir:", dir);
    if (index + dir < 0 || index + dir >= secoes.length) return;
    const arrayCopia = [...secoes];
    const temp = arrayCopia[index];
    arrayCopia[index] = arrayCopia[index + dir];
    arrayCopia[index + dir] = temp;
    setSecoes(recalcularOrdemArray(arrayCopia));
  };

  const toggleDeleteSecao = (index: number) => {
    const s = secoes[index];
    console.log("Toggle delete seção:", s.id);
    if (!s.isDeleted && s.perguntas.filter(p => !p.isDeleted).length > 0) {
      toast.warning("Não é possível excluir uma seção que contém perguntas.");
      return;
    }
    const arrayCopia = [...secoes];
    arrayCopia[index].isDeleted = !arrayCopia[index].isDeleted;
    arrayCopia[index].isDirty = !arrayCopia[index].isNew;
    setSecoes(arrayCopia);
  };

  // Funções de Pergunta
  const addPergunta = (secaoId: string) => {
    console.log("Adicionando nova pergunta na seção:", secaoId);
    setSecoes(secoes.map(s => {
      if (s.id !== secaoId) return s;
      const novaOrdem = s.perguntas.length > 0 ? Math.max(...s.perguntas.map(p => p.ordem)) + 1 : 1;
      const nova: EditorPergunta = {
        id: crypto.randomUUID(),
        secao_id: secaoId,
        texto: "Nova Pergunta",
        texto_pergunta: "",
        ordem: novaOrdem,
        tipo_resposta: "C_NC_NA",
        permite_foto: false,
        obrigatoria: true,
        codigo_verificacao: null,
        referencia_legal: null,
        perigo_associado_id: null,
        isNew: true
      };
      return { ...s, perguntas: [...s.perguntas, nova] };
    }));
  };

  const editPergunta = (secaoId: string, perguntaId: string, field: string, value: any) => {
    console.log("Editando pergunta:", perguntaId, field, "=", value);
    setSecoes(secoes.map(s => {
      if (s.id !== secaoId) return s;
      const novasPerg = s.perguntas.map(p => {
        if (p.id !== perguntaId) return p;
        return { ...p, [field]: value, isDirty: !p.isNew };
      });
      return { ...s, perguntas: novasPerg };
    }));
  };

  const movePergunta = (secaoId: string, index: number, dir: 1 | -1) => {
    console.log("Movendo pergunta index:", index, "dir:", dir, "na seção:", secaoId);
    setSecoes(secoes.map(s => {
      if (s.id !== secaoId) return s;
      if (index + dir < 0 || index + dir >= s.perguntas.length) return s;
      const arrayCopia = [...s.perguntas];
      const temp = arrayCopia[index];
      arrayCopia[index] = arrayCopia[index + dir];
      arrayCopia[index + dir] = temp;
      return { ...s, perguntas: recalcularOrdemArray(arrayCopia) };
    }));
  };

  const toggleDeletePergunta = (secaoId: string, index: number) => {
    console.log("Toggle delete pergunta index:", index, "na seção:", secaoId);
    setSecoes(secoes.map(s => {
      if (s.id !== secaoId) return s;
      const arrayCopia = [...s.perguntas];
      arrayCopia[index].isDeleted = !arrayCopia[index].isDeleted;
      arrayCopia[index].isDirty = !arrayCopia[index].isNew;
      return { ...s, perguntas: arrayCopia };
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Carregando estrutura do checklist...</p>
      </div>
    );
  }

  if (!template) return null;

  const alteracoes = countPendente();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Editar: {template.nome}</h2>
            {alteracoes > 0 ? (
              <p className="text-amber-500 font-medium text-sm">
                {alteracoes} {alteracoes === 1 ? 'alteração não salva' : 'alterações não salvas'}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Estrutura em sincronia.</p>
            )}
          </div>
        </div>
        <Button 
          disabled={alteracoes === 0 || isSaving} 
          onClick={handleSalvar}
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <div className="space-y-6">
        {secoes.map((secao, secIndex) => (
          <div key={secao.id} className={`border rounded-lg bg-card shadow-sm p-4 ${secao.isDeleted ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground uppercase">Nome da Seção</Label>
                <Input 
                  value={secao.nome} 
                  onChange={(e) => editSecao(secao.id, e.target.value)} 
                  className={`font-semibold text-base mt-1 ${secao.isDeleted ? 'line-through text-muted-foreground' : ''}`}
                  disabled={secao.isDeleted}
                />
              </div>
              <div className="flex items-center gap-1 mt-5">
                <Button variant="outline" size="icon" title="Mover Cima" onClick={() => moveSecao(secIndex, -1)} disabled={secIndex === 0 || secao.isDeleted}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" title="Mover Baixo" onClick={() => moveSecao(secIndex, 1)} disabled={secIndex === secoes.length - 1 || secao.isDeleted}><ArrowDown className="h-4 w-4" /></Button>
                {secao.isDeleted ? (
                  <Button variant="outline" size="icon" title="Desfazer exclusão" onClick={() => toggleDeleteSecao(secIndex)}><Undo2 className="h-4 w-4" /></Button>
                ) : (
                  <Button variant="destructive" size="icon" title="Excluir Seção" onClick={() => toggleDeleteSecao(secIndex)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </div>

            <Accordion type="multiple" className="w-full space-y-2">
              {secao.perguntas.map((pergunta, pIndex) => (
                <AccordionItem key={pergunta?.id} value={pergunta?.id || `p-${pIndex}`} className={`border rounded-md px-4 bg-muted/20 ${pergunta?.isDeleted ? 'opacity-50 grayscale border-destructive' : ''}`}>
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 text-left">
                      {pergunta?.isDeleted && <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-destructive text-destructive-foreground mr-2">Removida</span>}
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{pergunta?.codigo_verificacao || 'S/C'}</span>
                      <span className={`font-medium text-sm truncate max-w-[400px] ${pergunta?.isDeleted ? 'line-through text-muted-foreground' : ''}`}>
                        {pergunta?.texto_pergunta || pergunta?.texto}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-4">
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${pergunta.isDeleted ? 'pointer-events-none' : ''}`}>
                      <div className="space-y-2">
                        <Label>Texto da Pergunta</Label>
                        <Input value={pergunta.texto_pergunta || pergunta.texto} onChange={(e) => editPergunta(secao.id, pergunta.id, 'texto_pergunta', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Perigo Associado</Label>
                        <Select value={pergunta.perigo_associado_id || undefined} onValueChange={(v) => editPergunta(secao.id, pergunta.id, 'perigo_associado_id', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um perigo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogo.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Código de Verificação</Label>
                        <Input value={pergunta.codigo_verificacao || ''} onChange={(e) => editPergunta(secao.id, pergunta.id, 'codigo_verificacao', e.target.value)} placeholder="Ex: 1.2.3" />
                      </div>
                      <div className="space-y-2">
                        <Label>Referência Legal</Label>
                        <Input value={pergunta.referencia_legal || ''} onChange={(e) => editPergunta(secao.id, pergunta.id, 'referencia_legal', e.target.value)} placeholder="Ex: NR-17 item 17.5.3.3" />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Resposta</Label>
                        <Select value={pergunta.tipo_resposta} onValueChange={(v) => editPergunta(secao.id, pergunta.id, 'tipo_resposta', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="C_NC_NA">C / NC / NA</SelectItem>
                            <SelectItem value="SIM_NAO">Sim / Não</SelectItem>
                            <SelectItem value="TEXTO">Texto Livre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-6 pt-6">
                        <div className="flex items-center space-x-2">
                          <Switch checked={pergunta.obrigatoria} onCheckedChange={(v) => editPergunta(secao.id, pergunta.id, 'obrigatoria', v)} />
                          <Label>Obrigatória</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch checked={pergunta.permite_foto} onCheckedChange={(v) => editPergunta(secao.id, pergunta.id, 'permite_foto', v)} />
                          <Label>Permite Foto</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => movePergunta(secao.id, pIndex, -1)} disabled={pIndex === 0 || pergunta.isDeleted}><ArrowUp className="h-4 w-4 mr-2" /> Subir</Button>
                      <Button variant="outline" size="sm" onClick={() => movePergunta(secao.id, pIndex, 1)} disabled={pIndex === secao.perguntas.length - 1 || pergunta.isDeleted}><ArrowDown className="h-4 w-4 mr-2" /> Descer</Button>
                      {pergunta.isDeleted ? (
                        <Button variant="outline" size="sm" onClick={() => toggleDeletePergunta(secao.id, pIndex)}><Undo2 className="h-4 w-4 mr-2" /> Desfazer Exclusão</Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => toggleDeletePergunta(secao.id, pIndex)}><Trash2 className="h-4 w-4 mr-2" /> Excluir</Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addPergunta(secao.id)} disabled={secao.isDeleted}><Plus className="mr-2 h-4 w-4" /> Adicionar Pergunta</Button>
            </div>
          </div>
        ))}
        
        <Button variant="outline" className="w-full border-dashed py-8" onClick={addSecao}><Plus className="mr-2 h-4 w-4" /> Adicionar Nova Seção</Button>
      </div>
    </div>
  );
}
