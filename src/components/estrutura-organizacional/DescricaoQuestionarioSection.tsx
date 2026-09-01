import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Users,
  Eye,
  RotateCcw,
  Trash2,
  Search,
  Download,
  RefreshCw,
  Columns3,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useQuestionarioModelos, useModeloEstrutura } from '@/hooks/useQuestionarioModelos';
import {
  useDescricaoQuestionario,
  useDescricaoQuestionarioMutations,
} from '@/hooks/useDescricaoQuestionario';
import {
  useQuestionarioAtribuicoes,
  useAtribuicaoMutations,
  useRespostasAtribuicao,
  type Atribuicao,
} from '@/hooks/useQuestionarioAtribuicoes';
import { QuestionarioEditor } from './QuestionarioEditor';
import { QuestionarioRunner } from './QuestionarioRunner';
import {
  respostaToTexto,
  INSTRUCOES_PADRAO,
  type QSecao,
} from '@/lib/questionarioCargo';
import { construirPatch, type ImportPatch } from '@/lib/questionarioConsolidacao';
import { ComparativoRespostasSheet } from './ComparativoRespostasSheet';
import {
  indexarCampos,
  modeloParaSecoes,
  type DBloco,
  type DCampo,
} from '@/lib/descricaoModelo';

export type { ImportPatch };


interface Props {
  companyId: string | null;
  descricaoCargoId: string | null;
  podeEditar: boolean;
  onImport: (patch: ImportPatch) => void;
  /** Blocos do modelo da descrição, espelhados no questionário do colaborador. */
  blocosModelo?: DBloco[];
}


const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  em_andamento: { label: 'Em andamento', className: 'bg-amber-100 text-amber-800' },
  preenchido: { label: 'Preenchido', className: 'bg-emerald-100 text-emerald-800' },
};

function useColaboradoresDaEmpresa(companyId: string | null) {
  return useQuery({
    queryKey: ['colaboradores-questionario', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id,full_name,job_title,department,empresa_cliente,cargo_id,status')
        .eq('company_id', companyId as string)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function DescricaoQuestionarioSection({
  companyId,
  descricaoCargoId,
  podeEditar,
  onImport,
  blocosModelo,
}: Props) {

  const { data: modelos = [] } = useQuestionarioModelos(companyId);
  const { data: vinculo } = useDescricaoQuestionario(descricaoCargoId);
  const { salvar } = useDescricaoQuestionarioMutations(descricaoCargoId);

  const [modeloId, setModeloId] = useState<string | null>(null);
  const [instrucoes, setInstrucoes] = useState('');
  const [secoes, setSecoes] = useState<QSecao[]>([]);
  const { data: estruturaModelo } = useModeloEstrutura(
    !vinculo && modeloId ? modeloId : null,
  );

  const [abrirAtribuir, setAbrirAtribuir] = useState(false);
  const [abrirComparativo, setAbrirComparativo] = useState(false);
  const [verRespostasDe, setVerRespostasDe] = useState<Atribuicao | null>(null);


  useEffect(() => {
    if (vinculo) {
      setModeloId(vinculo.modelo_base_id);
      setInstrucoes(vinculo.instrucoes ?? '');
      setSecoes(vinculo.secoes);
    }
  }, [vinculo]);

  useEffect(() => {
    if (!vinculo && estruturaModelo) {
      setSecoes(estruturaModelo);
      const m = modelos.find((x) => x.id === modeloId);
      setInstrucoes(m?.instrucoes ?? INSTRUCOES_PADRAO);
    }
  }, [estruturaModelo, vinculo, modeloId, modelos]);

  // Sem vínculo e sem modelo base: espelha automaticamente os blocos da descrição.
  useEffect(() => {
    if (vinculo || modeloId || !blocosModelo?.length) return;
    setSecoes(modeloParaSecoes(blocosModelo));
    setInstrucoes((i) => i || INSTRUCOES_PADRAO);
  }, [vinculo, modeloId, blocosModelo]);


  const { data: atribuicoes = [] } = useQuestionarioAtribuicoes(vinculo?.id ?? null);
  const { atribuir, remover, reabrir } = useAtribuicaoMutations();
  const preenchidas = useMemo(
    () => atribuicoes.filter((a) => a.status === 'preenchido'),
    [atribuicoes],
  );


  if (!descricaoCargoId) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" /> Questionário do colaborador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Salve a descrição de cargo para habilitar o questionário aos colaboradores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-primary" /> Questionário do colaborador
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          {podeEditar && (blocosModelo?.length ?? 0) > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSecoes(modeloParaSecoes(blocosModelo ?? []))}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Espelhar blocos da descrição
            </Button>
          )}
          {podeEditar && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                salvar.mutate({ modelo_base_id: modeloId, instrucoes, secoes, ativo: true })
              }
              disabled={salvar.isPending || secoes.length === 0}
            >
              Salvar questionário
            </Button>
          )}
          {preenchidas.length >= 2 && (
            <Button size="sm" variant="outline" onClick={() => setAbrirComparativo(true)}>
              <Columns3 className="mr-2 h-4 w-4" /> Comparar respostas ({preenchidas.length})
            </Button>
          )}
          {podeEditar && (
            <Button size="sm" onClick={() => setAbrirAtribuir(true)} disabled={!vinculo}>
              <Users className="mr-2 h-4 w-4" /> Habilitar colaboradores
            </Button>
          )}
        </div>


      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Modelo base</Label>
            <Select
              value={modeloId ?? ''}
              disabled={!podeEditar}
              onValueChange={(v) => setModeloId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo criado na aba Questionários" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {modelos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-muted-foreground">
              {secoes.length} seção(ões) ·{' '}
              {secoes.reduce((n, s) => n + s.perguntas.length, 0)} pergunta(s)
            </p>
          </div>
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="instrucoes">
            <AccordionTrigger className="text-sm">Instruções para o colaborador</AccordionTrigger>
            <AccordionContent>
              <Textarea
                rows={8}
                disabled={!podeEditar}
                value={instrucoes}
                onChange={(e) => setInstrucoes(e.target.value)}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="perguntas">
            <AccordionTrigger className="text-sm">
              Ajustar perguntas para este cargo
            </AccordionTrigger>
            <AccordionContent>
              <QuestionarioEditor secoes={secoes} onChange={setSecoes} readOnly={!podeEditar} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {vinculo && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Colaboradores habilitados</p>
              {atribuicoes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum colaborador habilitado ainda.
                </p>
              )}
              {atribuicoes.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{a.colaborador_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[a.colaborador_cargo, a.colaborador_empresa_cliente]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_BADGE[a.status]?.className}>
                      {STATUS_BADGE[a.status]?.label}
                    </Badge>
                    {a.status === 'preenchido' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setVerRespostasDe(a)}>
                          <Eye className="mr-2 h-4 w-4" /> Ver respostas
                        </Button>
                        {podeEditar && (
                          <Button variant="ghost" size="icon" onClick={() => reabrir.mutate(a.id)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                    {podeEditar && (
                      <Button variant="ghost" size="icon" onClick={() => remover.mutate(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {vinculo && (
        <AtribuirDialog
          open={abrirAtribuir}
          onOpenChange={setAbrirAtribuir}
          companyId={companyId}
          jaAtribuidos={atribuicoes.map((a) => a.colaborador_id)}
          onConfirm={(ids) =>
            atribuir.mutate({ descricaoQuestionarioId: vinculo.id, colaboradorIds: ids })
          }
        />
      )}

      <ComparativoRespostasSheet
        open={abrirComparativo}
        onOpenChange={setAbrirComparativo}
        atribuicoes={preenchidas}
        secoes={secoes}
        campos={indexarCampos(blocosModelo ?? [])}
        onImport={onImport}
      />

      <RespostasSheet
        atribuicao={verRespostasDe}
        secoes={secoes}
        campos={indexarCampos(blocosModelo ?? [])}
        onClose={() => setVerRespostasDe(null)}

        onImport={onImport}
      />

    </Card>
  );
}

function AtribuirDialog({
  open,
  onOpenChange,
  companyId,
  jaAtribuidos,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string | null;
  jaAtribuidos: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { data: colaboradores = [] } = useColaboradoresDaEmpresa(companyId);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<string[]>([]);

  const lista = useMemo(
    () =>
      colaboradores.filter(
        (c) =>
          c.status !== 'DESLIGADO' &&
          `${c.full_name} ${c.job_title ?? ''} ${c.department ?? ''} ${c.empresa_cliente ?? ''}`
            .toLowerCase()
            .includes(busca.toLowerCase()),
      ),
    [colaboradores, busca],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Habilitar questionário</DialogTitle>
          <DialogDescription>
            Selecione os colaboradores que devem preencher este questionário. Eles serão
            notificados e verão o formulário em "Minhas Atividades".
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, cargo, departamento ou empresa cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {lista.map((c) => {
            const ja = jaAtribuidos.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-3 rounded-lg border p-2 text-sm ${
                  ja ? 'opacity-50' : 'cursor-pointer hover:bg-muted'
                }`}
              >
                <Checkbox
                  disabled={ja}
                  checked={ja || sel.includes(c.id)}
                  onCheckedChange={(v) =>
                    setSel((s) => (v ? [...s, c.id] : s.filter((x) => x !== c.id)))
                  }
                />
                <div>
                  <p className="font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.job_title, c.department, c.empresa_cliente].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {ja && <Badge variant="secondary" className="ml-auto">Já habilitado</Badge>}
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={sel.length === 0}
            onClick={() => {
              onConfirm(sel);
              setSel([]);
              onOpenChange(false);
            }}
          >
            Habilitar {sel.length > 0 ? `(${sel.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RespostasSheet({
  atribuicao,
  secoes,
  campos,
  onClose,
  onImport,
}: {
  atribuicao: Atribuicao | null;
  secoes: QSecao[];
  campos: Record<string, DCampo>;
  onClose: () => void;
  onImport: (patch: ImportPatch) => void;
}) {
  const { data: respostas = {} } = useRespostasAtribuicao(atribuicao?.id ?? null);

  const importar = () => {
    onImport(construirPatch(secoes, campos, respostas));
    onClose();
  };



  return (
    <Sheet open={!!atribuicao} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Respostas de {atribuicao?.colaborador_nome}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <Button onClick={importar} className="w-full">
            <Download className="mr-2 h-4 w-4" /> Usar como base na descrição
          </Button>
          <QuestionarioRunner
            secoes={secoes}
            respostas={respostas}
            onChange={() => undefined}
            readOnly
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
