import { ChevronDown, ChevronUp, Plus, Trash2, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CAMPOS_FIXOS,
  TIPOS_CAMPO,
  novoBloco,
  novoCampo,
  type DBloco,
  type DCampo,
  type DCampoFixo,
  type DCampoTipo,
} from '@/lib/descricaoModelo';

interface Props {
  blocos: DBloco[];
  onChange: (blocos: DBloco[]) => void;
  readOnly?: boolean;
}

export function DescricaoModeloEditor({ blocos, onChange, readOnly }: Props) {
  const setBloco = (i: number, patch: Partial<DBloco>) =>
    onChange(blocos.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  const moverBloco = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocos.length) return;
    const arr = [...blocos];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  const setCampo = (bi: number, ci: number, patch: Partial<DCampo>) =>
    setBloco(bi, {
      campos: blocos[bi].campos.map((c, idx) => (idx === ci ? { ...c, ...patch } : c)),
    });

  const moverCampo = (bi: number, ci: number, dir: -1 | 1) => {
    const arr = [...blocos[bi].campos];
    const j = ci + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[ci], arr[j]] = [arr[j], arr[ci]];
    setBloco(bi, { campos: arr });
  };

  return (
    <div className="space-y-4">
      {blocos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum bloco no modelo. Adicione o primeiro bloco abaixo.
        </p>
      )}

      {blocos.map((b, bi) => (
        <Card key={b.id} className="rounded-xl">
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-[200px] flex-1">
                <Label>Título do bloco</Label>
                <Input
                  disabled={readOnly}
                  value={b.titulo}
                  onChange={(e) => setBloco(bi, { titulo: e.target.value })}
                />
              </div>
              {!readOnly && (
                <div className="flex items-end gap-1 pt-6">
                  <Button variant="ghost" size="icon" onClick={() => moverBloco(bi, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moverBloco(bi, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange(blocos.filter((_, idx) => idx !== bi))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label>Orientação do bloco (opcional)</Label>
              <Textarea
                rows={2}
                disabled={readOnly}
                value={b.descricao ?? ''}
                onChange={(e) => setBloco(bi, { descricao: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Switch
                disabled={readOnly}
                checked={!!b.oculto_colaborador}
                onCheckedChange={(v) => setBloco(bi, { oculto_colaborador: v })}
              />
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              Não perguntar ao colaborador (uso interno do RH)
            </label>

            <div className="space-y-3">
              {b.campos.map((c, ci) => (
                <div key={c.id} className="space-y-3 rounded-lg border p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-[200px] flex-1">
                      <Label>Campo</Label>
                      <Input
                        disabled={readOnly}
                        value={c.label}
                        onChange={(e) => setCampo(bi, ci, { label: e.target.value })}
                      />
                    </div>
                    <div className="w-48">
                      <Label>Tipo</Label>
                      <Select
                        disabled={readOnly}
                        value={c.tipo}
                        onValueChange={(v) => setCampo(bi, ci, { tipo: v as DCampoTipo })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {TIPOS_CAMPO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!readOnly && (
                      <div className="flex items-end gap-1 pt-6">
                        <Button variant="ghost" size="icon" onClick={() => moverCampo(bi, ci, -1)}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => moverCampo(bi, ci, 1)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setBloco(bi, { campos: b.campos.filter((_, idx) => idx !== ci) })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Texto de ajuda</Label>
                      <Input
                        disabled={readOnly}
                        value={c.ajuda ?? ''}
                        onChange={(e) => setCampo(bi, ci, { ajuda: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Vincular a campo do sistema</Label>
                      <Select
                        disabled={readOnly}
                        value={c.campo_fixo ?? 'nenhum'}
                        onValueChange={(v) =>
                          setCampo(bi, ci, {
                            campo_fixo: v === 'nenhum' ? null : (v as DCampoFixo),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {CAMPOS_FIXOS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {c.tipo === 'selecao' && (
                    <div>
                      <Label>Opções (uma por linha)</Label>
                      <Textarea
                        rows={3}
                        disabled={readOnly}
                        value={(c.opcoes ?? []).join('\n')}
                        onChange={(e) =>
                          setCampo(bi, ci, {
                            opcoes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        disabled={readOnly}
                        checked={c.obrigatorio}
                        onCheckedChange={(v) => setCampo(bi, ci, { obrigatorio: v })}
                      />
                      Obrigatório
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        disabled={readOnly}
                        checked={!!c.oculto_colaborador}
                        onCheckedChange={(v) => setCampo(bi, ci, { oculto_colaborador: v })}
                      />
                      Não perguntar ao colaborador
                    </label>
                  </div>
                </div>
              ))}

              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBloco(bi, { campos: [...b.campos, novoCampo()] })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar campo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <Button variant="outline" onClick={() => onChange([...blocos, novoBloco()])}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar bloco
        </Button>
      )}
    </div>
  );
}
