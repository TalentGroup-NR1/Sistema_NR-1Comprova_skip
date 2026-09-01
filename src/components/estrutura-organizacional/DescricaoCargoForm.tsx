import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCargos, useDepartamentos, useGhes, useNiveisMaturidade } from '@/hooks/useEstruturaConfig';
import {
  useDescricaoCargoMutations,
  type DescricaoCargo,
} from '@/hooks/useDescricoesCargo';
import { useDescricaoCargoPdf } from '@/hooks/useDescricaoCargoPdf';
import { useDescricaoModelos } from '@/hooks/useDescricaoModelos';
import { ALOCACOES, type DCampo } from '@/lib/descricaoModelo';
import {
  DescricaoBlocosDinamicos,
  type ValorCampo,
} from './DescricaoBlocosDinamicos';
import {
  DescricaoQuestionarioSection,
  type ImportPatch,
} from './DescricaoQuestionarioSection';


type Form = Omit<DescricaoCargo, 'id' | 'company_id'>;

const emptyForm: Form = {
  titulo: '',
  cargo_id: null,
  departamento_id: null,
  ghe_id: null,
  cbo_codigo: null,
  cbo_descricao: null,
  maturidade: null,
  reporte: '',
  alocacao: null,
  descricao_sumaria: '',
  grupo_organizacional: '',
  nivel_maturidade: '',
  responsabilidades: [],
  formacao_academica: null,
  cursos_necessarios: '',
  cursos_desejaveis: '',
  habilidades_comportamentais: '',
  fator_experiencia: '',
  fator_complexidade: '',
  fator_responsabilidade_erros: '',
  fator_responsabilidade_sigilo: '',
  modelo_id: null,
  valores: {},
  ativo: true,
};


interface Props {
  companyId: string | null;
  descricao: DescricaoCargo | null;
  podeEditar: boolean;
  onClose: () => void;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function DescricaoCargoForm({ companyId, descricao, podeEditar, onClose }: Props) {
  const { data: cargos = [] } = useCargos(companyId);
  const { data: departamentos = [] } = useDepartamentos(companyId);
  const { data: ghes = [] } = useGhes(companyId);
  const { data: niveis = [] } = useNiveisMaturidade(companyId);
  const niveisAtivos = niveis.filter((n) => n.ativo);
  const { salvar } = useDescricaoCargoMutations(companyId);
  const { gerar: gerarPdf, gerando: gerandoPdf } = useDescricaoCargoPdf(companyId);

  const { data: modelos = [] } = useDescricaoModelos(companyId);

  const [form, setForm] = useState<Form>(emptyForm);

  useEffect(() => {
    if (descricao) {
      const { id, company_id, ...rest } = descricao;
      setForm({ ...emptyForm, ...rest });
    } else {
      setForm(emptyForm);
    }
  }, [descricao]);

  // Ao criar uma nova descrição, adota o modelo padrão da empresa.
  useEffect(() => {
    if (descricao || modelos.length === 0) return;
    setForm((f) =>
      f.modelo_id ? f : { ...f, modelo_id: (modelos.find((m) => m.padrao) ?? modelos[0]).id },
    );
  }, [descricao, modelos]);

  const modelo = modelos.find((m) => m.id === form.modelo_id) ?? null;
  const blocos = modelo?.blocos ?? [];

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const getValor = (campo: DCampo): ValorCampo => {
    if (campo.campo_fixo) {
      const v = form[campo.campo_fixo as keyof Form];
      return (v as ValorCampo) ?? (campo.tipo === 'lista' ? [] : '');
    }
    const v = form.valores?.[campo.id];
    if (Array.isArray(v)) return v as string[];
    return typeof v === 'string' ? v : campo.tipo === 'lista' ? [] : '';
  };

  const setValor = (campo: DCampo, valor: ValorCampo) => {
    if (campo.campo_fixo) {
      setForm((f) => ({ ...f, [campo.campo_fixo as string]: valor }));
      return;
    }
    setForm((f) => ({ ...f, valores: { ...(f.valores ?? {}), [campo.id]: valor } }));
  };

  const aplicarCargo = (id: string) => {
    const c = cargos.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      cargo_id: id,
      cbo_codigo: c?.cbo_codigo ?? null,
      cbo_descricao: c?.cbo_descricao ?? null,
      titulo: c?.nome ? `Descrição de Função — ${c.nome}` : f.titulo,
    }));
  };

  const podeSalvar = !!form.cargo_id && !!form.titulo.trim();

  const aplicarImportacao = (patch: ImportPatch) => {
    setForm((f) => ({
      ...f,
      ...patch,
      valores: { ...(f.valores ?? {}), ...(patch.valores ?? {}) },
      responsabilidades: patch.responsabilidades
        ? [...f.responsabilidades, ...patch.responsabilidades]
        : f.responsabilidades,
    }));
  };


  const submit = async () => {
    if (!podeSalvar) return;
    await salvar.mutateAsync({ id: descricao?.id, values: form as unknown as Record<string, unknown> });
    onClose();
  };


  const ro = !podeEditar;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {descricao ? 'Editar descrição de cargo' : 'Nova descrição de cargo'}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => gerarPdf({ ...form, cargo_id: form.cargo_id })}
            disabled={!form.cargo_id || gerandoPdf}
          >
            <Download className="mr-2 h-4 w-4" /> Baixar PDF
          </Button>
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          {podeEditar && (
            <Button onClick={submit} disabled={!podeSalvar || salvar.isPending}>
              Salvar
            </Button>
          )}
        </div>
      </div>

      <Secao titulo="1 · Identificação">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Cargo *</Label>
            <Select value={form.cargo_id ?? ''} disabled={ro} onValueChange={aplicarCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo cadastrado" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {cargos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!form.cargo_id && (
              <p className="mt-1 text-xs text-muted-foreground">
                Selecione um cargo criado na aba Configuração.
              </p>
            )}
          </div>
          <div>
            <Label>Título da descrição</Label>
            <Input readOnly value={form.titulo} placeholder="Gerado pelo cargo selecionado" />
          </div>

          <div>
            <Label>CBO</Label>
            <Input
              readOnly
              value={
                form.cbo_codigo
                  ? `${form.cbo_codigo}${form.cbo_descricao ? ` — ${form.cbo_descricao}` : ''}`
                  : ''
              }
              placeholder="Preenchido pelo cargo"
            />
          </div>
          <div>
            <Label>Departamento / Área</Label>
            <Select
              value={form.departamento_id ?? ''}
              disabled={ro}
              onValueChange={(v) => set('departamento_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grupo (GHE)</Label>
            <Select value={form.ghe_id ?? ''} disabled={ro} onValueChange={(v) => set('ghe_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {ghes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.codigo ? `${g.codigo} · ${g.nome}` : g.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Maturidade</Label>
            <Select
              value={form.maturidade ?? ''}
              disabled={ro}
              onValueChange={(v) => set('maturidade', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {niveisAtivos.map((n) => (
                  <SelectItem key={n.id} value={n.nome}>
                    {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reporte</Label>
            <Input
              value={form.reporte ?? ''}
              disabled={ro}
              onChange={(e) => set('reporte', e.target.value)}
              placeholder="Gestor(a) / Diretor(a)"
            />
          </div>
          <div>
            <Label>Modelo da descrição</Label>
            <Select
              value={form.modelo_id ?? ''}
              disabled={ro}
              onValueChange={(v) => set('modelo_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo de blocos" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {modelos.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                    {m.padrao ? ' (padrão)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Define os blocos exibidos abaixo e no questionário do colaborador.
            </p>
          </div>
          <div>

            <Label>Alocação</Label>
            <Select
              value={form.alocacao ?? ''}
              disabled={ro}
              onValueChange={(v) => set('alocacao', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                {ALOCACOES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Secao>

      {blocos.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum bloco configurado. Selecione um modelo acima ou monte a estrutura na aba
            "Modelos de descrição".
          </CardContent>
        </Card>
      ) : (
        <DescricaoBlocosDinamicos
          blocos={blocos}
          getValor={getValor}
          setValor={setValor}
          readOnly={ro}
        />
      )}


      <DescricaoQuestionarioSection
        companyId={companyId}
        descricaoCargoId={descricao?.id ?? null}
        podeEditar={podeEditar}
        onImport={aplicarImportacao}
        blocosModelo={blocos}
      />




      {podeEditar && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!podeSalvar || salvar.isPending}>
            Salvar descrição
          </Button>
        </div>
      )}
    </div>
  );
}
