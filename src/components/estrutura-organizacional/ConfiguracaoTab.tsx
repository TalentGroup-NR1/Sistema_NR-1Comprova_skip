import { useEffect, useState } from 'react';
import { Building2, Briefcase, Users, TrendingUp, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCargos,
  useDepartamentos,
  useEntidadeMutations,
  useGhes,
  useNiveisMaturidade,
  type Cargo,
  type Departamento,
  type EntidadeTabela as Tabela,
  type Ghe,
  type NivelMaturidade,
  type TipoExposicao,
} from '@/hooks/useEstruturaConfig';
import { EntidadeTabela } from './EntidadeTabela';
import { CboAutocomplete } from './CboAutocomplete';

type Row = Record<string, unknown> & { id: string; ativo: boolean };

interface FormState {
  nome: string;
  codigo: string;
  descricao: string;
  cbo_codigo: string;
  cbo_descricao: string;
  tipo_exposicao: TipoExposicao;
  ordem: string;
  ativo: boolean;
}

const emptyForm: FormState = {
  nome: '',
  codigo: '',
  descricao: '',
  cbo_codigo: '',
  cbo_descricao: '',
  tipo_exposicao: 'continua',
  ordem: '0',
  ativo: true,
};

interface Props {
  companyId: string | null;
  podeEditar: boolean;
  podeExcluir: boolean;
}

export function ConfiguracaoTab({ companyId, podeEditar, podeExcluir }: Props) {
  const departamentos = useDepartamentos(companyId);
  const cargos = useCargos(companyId);
  const ghes = useGhes(companyId);
  const niveis = useNiveisMaturidade(companyId);
  const mutNivel = useEntidadeMutations('niveis_maturidade', companyId);

  const [dialog, setDialog] = useState<{ tabela: Tabela; row: Row | null } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!dialog) return;
    const r = dialog.row;
    setForm({
      ...emptyForm,
      nome: (r?.nome as string) ?? '',
      codigo: (r?.codigo as string) ?? '',
      descricao: (r?.descricao as string) ?? '',
      cbo_codigo: (r?.cbo_codigo as string) ?? '',
      cbo_descricao: (r?.cbo_descricao as string) ?? '',
      tipo_exposicao: (r?.tipo_exposicao as TipoExposicao) ?? 'continua',
      ordem: r?.ordem != null ? String(r.ordem) : '0',
      ativo: r ? (r.ativo as boolean) : true,
    });
  }, [dialog]);

  const mutFor = (t: Tabela) =>
    t === 'departamentos'
      ? mutDep
      : t === 'cargos'
        ? mutCargo
        : t === 'ghes'
          ? mutGhe
          : mutNivel;

  const salvar = async () => {
    if (!dialog || !form.nome.trim()) return;
    const t = dialog.tabela;
    const values: Record<string, unknown> =
      t === 'departamentos'
        ? { nome: form.nome.trim(), codigo: form.codigo.trim() || null, ativo: form.ativo }
        : t === 'cargos'
          ? {
              nome: form.nome.trim(),
              cbo_codigo: form.cbo_codigo.trim() || null,
              cbo_descricao: form.cbo_descricao.trim() || null,
              ativo: form.ativo,
            }
          : t === 'niveis_maturidade'
          ? {
              nome: form.nome.trim(),
              descricao: form.descricao.trim() || null,
              ordem: Number(form.ordem) || 0,
              ativo: form.ativo,
            }
          : {
              codigo: form.codigo.trim() || null,
              nome: form.nome.trim(),
              descricao: form.descricao.trim() || null,
              tipo_exposicao: form.tipo_exposicao,
              ativo: form.ativo,
            };
    await mutFor(t).salvar.mutateAsync({ id: dialog.row?.id, values });
    setDialog(null);
  };

  const titulos: Record<Tabela, string> = {
    departamentos: 'Departamento',
    cargos: 'Cargo',
    ghes: 'Grupo (GHE)',
    niveis_maturidade: 'Nível / Maturidade',
  };


  return (
    <div className="space-y-6">
      <EntidadeTabela<Departamento>
        titulo="Departamentos"
        descricao="Áreas da empresa utilizadas nas descrições de cargo e no cadastro de colaboradores."
        icone={<Building2 className="h-5 w-5 text-primary" />}
        itens={departamentos.data ?? []}
        isLoading={departamentos.isLoading}
        colunas={[
          { header: 'Nome do Departamento', render: (r) => <span className="font-medium">{r.nome}</span> },
          { header: 'Código', render: (r) => r.codigo ?? '—' },
        ]}
        buscaEm={(r) => `${r.nome} ${r.codigo ?? ''}`}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onNovo={() => setDialog({ tabela: 'departamentos', row: null })}
        onEditar={(r) => setDialog({ tabela: 'departamentos', row: r as unknown as Row })}
        onExcluir={(r) => mutDep.excluir.mutate(r.id)}
        labelNovo="Novo Departamento"
        emptyText="Nenhum departamento cadastrado ainda."
      />

      <EntidadeTabela<Cargo>
        titulo="Cargos"
        descricao="Cargos da empresa com a respectiva ocupação CBO."
        icone={<Briefcase className="h-5 w-5 text-primary" />}
        itens={cargos.data ?? []}
        isLoading={cargos.isLoading}
        colunas={[
          { header: 'Nome do Cargo', render: (r) => <span className="font-medium">{r.nome}</span> },
          {
            header: 'CBO',
            render: (r) =>
              r.cbo_codigo ? (
                <span className="font-mono text-xs">
                  {r.cbo_codigo}
                  {r.cbo_descricao ? ` · ${r.cbo_descricao}` : ''}
                </span>
              ) : (
                '—'
              ),
          },
        ]}
        buscaEm={(r) => `${r.nome} ${r.cbo_codigo ?? ''} ${r.cbo_descricao ?? ''}`}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onNovo={() => setDialog({ tabela: 'cargos', row: null })}
        onEditar={(r) => setDialog({ tabela: 'cargos', row: r as unknown as Row })}
        onExcluir={(r) => mutCargo.excluir.mutate(r.id)}
        labelNovo="Novo Cargo"
        emptyText="Nenhum cargo cadastrado ainda."
      />

      <EntidadeTabela<Ghe>
        titulo="Grupos (GHE)"
        descricao="Grupos Homogêneos de Exposição, base para o Mapa de Riscos NR-1."
        icone={<Users className="h-5 w-5 text-primary" />}
        itens={ghes.data ?? []}
        isLoading={ghes.isLoading}
        colunas={[
          { header: 'Código', render: (r) => r.codigo ?? '—' },
          { header: 'Nome do Grupo', render: (r) => <span className="font-medium">{r.nome}</span> },
          {
            header: 'Descrição',
            render: (r) => (
              <span className="line-clamp-1 text-muted-foreground">{r.descricao ?? '—'}</span>
            ),
          },
        ]}
        buscaEm={(r) => `${r.codigo ?? ''} ${r.nome} ${r.descricao ?? ''}`}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onNovo={() => setDialog({ tabela: 'ghes', row: null })}
        onEditar={(r) => setDialog({ tabela: 'ghes', row: r as unknown as Row })}
        onExcluir={(r) => mutGhe.excluir.mutate(r.id)}
        labelNovo="Novo Grupo"
        emptyText="Nenhum grupo cadastrado ainda."
      />

      <EntidadeTabela<NivelMaturidade>
        titulo="Níveis / Maturidade"
        descricao="Níveis de carreira usados no cadastro de colaboradores e nas descrições de cargo."
        icone={<TrendingUp className="h-5 w-5 text-primary" />}
        itens={niveis.data ?? []}
        isLoading={niveis.isLoading}
        colunas={[
          { header: 'Ordem', render: (r) => r.ordem },
          { header: 'Nível', render: (r) => <span className="font-medium">{r.nome}</span> },
          {
            header: 'Descrição',
            render: (r) => (
              <span className="line-clamp-1 text-muted-foreground">{r.descricao ?? '—'}</span>
            ),
          },
        ]}
        buscaEm={(r) => `${r.nome} ${r.descricao ?? ''}`}
        podeEditar={podeEditar}
        podeExcluir={podeExcluir}
        onNovo={() => setDialog({ tabela: 'niveis_maturidade', row: null })}
        onEditar={(r) => setDialog({ tabela: 'niveis_maturidade', row: r as unknown as Row })}
        onExcluir={(r) => mutNivel.excluir.mutate(r.id)}
        labelNovo="Novo Nível"
        emptyText="Nenhum nível cadastrado ainda."
      />





      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog?.row ? 'Editar' : 'Novo'} {dialog ? titulos[dialog.tabela] : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {dialog?.tabela === 'ghes' && (
              <div>
                <Label>Código</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="GHE 01"
                />
              </div>
            )}

            <div>
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder={dialog?.tabela === 'cargos' ? 'Analista de RH' : 'Nome'}
              />
            </div>

            {dialog?.tabela === 'departamentos' && (
              <div>
                <Label>Código</Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            )}

            {dialog?.tabela === 'niveis_maturidade' && (
              <>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    rows={2}
                    placeholder="Ex.: atua sob orientação em atividades de baixa complexidade."
                  />
                </div>
                <div>
                  <Label>Ordem de exibição</Label>
                  <Input
                    type="number"
                    value={form.ordem}
                    onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                  />
                </div>
              </>
            )}

            {dialog?.tabela === 'cargos' && (
              <CboAutocomplete
                codigo={form.cbo_codigo}
                descricao={form.cbo_descricao}
                onChange={(codigo, descricao) =>
                  setForm({ ...form, cbo_codigo: codigo, cbo_descricao: descricao })
                }
              />
            )}

            {dialog?.tabela === 'ghes' && (
              <>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Tipo de exposição</Label>
                  <Select
                    value={form.tipo_exposicao}
                    onValueChange={(v) => setForm({ ...form, tipo_exposicao: v as TipoExposicao })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="continua">Contínua</SelectItem>
                      <SelectItem value="intermitente">Intermitente</SelectItem>
                      <SelectItem value="eventual">Eventual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                id="ativo"
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={!form.nome.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
