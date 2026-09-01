import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  novoId,
  TIPOS_PERGUNTA,
  MAPEAMENTOS,
  type QSecao,
  type QPergunta,
  type QPerguntaTipo,
  type QMapeamento,
} from '@/lib/questionarioCargo';

interface Props {
  secoes: QSecao[];
  onChange: (secoes: QSecao[]) => void;
  readOnly?: boolean;
}

export function QuestionarioEditor({ secoes, onChange, readOnly }: Props) {
  const setSecao = (idx: number, patch: Partial<QSecao>) =>
    onChange(secoes.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const moverSecao = (idx: number, dir: -1 | 1) => {
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= secoes.length) return;
    const arr = [...secoes];
    [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]];
    onChange(arr);
  };

  const setPergunta = (si: number, pi: number, patch: Partial<QPergunta>) =>
    setSecao(si, {
      perguntas: secoes[si].perguntas.map((p, i) => (i === pi ? { ...p, ...patch } : p)),
    });

  const moverPergunta = (si: number, pi: number, dir: -1 | 1) => {
    const arr = [...secoes[si].perguntas];
    const alvo = pi + dir;
    if (alvo < 0 || alvo >= arr.length) return;
    [arr[pi], arr[alvo]] = [arr[alvo], arr[pi]];
    setSecao(si, { perguntas: arr });
  };

  return (
    <div className="space-y-4">
      {secoes.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma seção. Adicione a primeira seção do questionário.
        </p>
      )}

      {secoes.map((s, si) => (
        <Card key={s.id} className="rounded-xl">
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-start gap-2">
              <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-2">
                <Input
                  disabled={readOnly}
                  value={s.titulo}
                  placeholder="Título da seção"
                  className="font-medium"
                  onChange={(e) => setSecao(si, { titulo: e.target.value })}
                />
                <Textarea
                  rows={2}
                  disabled={readOnly}
                  value={s.descricao ?? ''}
                  placeholder="Orientações da seção (opcional)"
                  onChange={(e) => setSecao(si, { descricao: e.target.value })}
                />
              </div>
              {!readOnly && (
                <div className="flex flex-col">
                  <Button variant="ghost" size="icon" onClick={() => moverSecao(si, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moverSecao(si, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange(secoes.filter((_, i) => i !== si))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3 border-l-2 border-muted pl-4">
              {s.perguntas.map((p, pi) => (
                <div key={p.id} className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <Input
                      disabled={readOnly}
                      value={p.titulo}
                      placeholder="Enunciado da pergunta"
                      onChange={(e) => setPergunta(si, pi, { titulo: e.target.value })}
                    />
                    {!readOnly && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => moverPergunta(si, pi, -1)}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => moverPergunta(si, pi, 1)}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSecao(si, {
                              perguntas: s.perguntas.filter((_, i) => i !== pi),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>

                  <Textarea
                    rows={2}
                    disabled={readOnly}
                    value={p.texto_ajuda ?? ''}
                    placeholder="Texto de ajuda / exemplo (opcional)"
                    onChange={(e) => setPergunta(si, pi, { texto_ajuda: e.target.value })}
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        disabled={readOnly}
                        value={p.tipo}
                        onValueChange={(v) => setPergunta(si, pi, { tipo: v as QPerguntaTipo })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {TIPOS_PERGUNTA.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Alimenta o campo</Label>
                      <Select
                        disabled={readOnly}
                        value={p.mapeamento ?? 'nenhum'}
                        onValueChange={(v) =>
                          setPergunta(si, pi, {
                            mapeamento: v === 'nenhum' ? null : (v as QMapeamento),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {MAPEAMENTOS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-2">
                      <Switch
                        disabled={readOnly}
                        checked={p.obrigatorio}
                        onCheckedChange={(v) => setPergunta(si, pi, { obrigatorio: v })}
                      />
                      <span className="text-sm">Obrigatória</span>
                    </div>
                  </div>

                  {(p.tipo === 'escolha_unica' || p.tipo === 'multipla_escolha') && (
                    <div className="space-y-2">
                      <Label className="text-xs">Opções</Label>
                      {p.opcoes.map((o, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input
                            disabled={readOnly}
                            value={o}
                            onChange={(e) => {
                              const arr = [...p.opcoes];
                              arr[oi] = e.target.value;
                              setPergunta(si, pi, { opcoes: arr });
                            }}
                          />
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setPergunta(si, pi, {
                                  opcoes: p.opcoes.filter((_, i) => i !== oi),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!readOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPergunta(si, pi, { opcoes: [...p.opcoes, ''] })}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Opção
                        </Button>
                      )}
                    </div>
                  )}

                  {p.tipo === 'atividades' && (
                    <Badge variant="secondary">
                      O colaborador poderá adicionar várias atividades (o que faz, como faz, para
                      que, complexidade e frequência)
                    </Badge>
                  )}
                </div>
              ))}

              {!readOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSecao(si, {
                      perguntas: [
                        ...s.perguntas,
                        {
                          id: novoId(),
                          tipo: 'texto_longo',
                          titulo: '',
                          texto_ajuda: null,
                          obrigatorio: false,
                          opcoes: [],
                          mapeamento: null,
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar pergunta
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <Button
          variant="outline"
          onClick={() =>
            onChange([
              ...secoes,
              { id: novoId(), titulo: '', descricao: '', tipo: 'padrao', perguntas: [] },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar seção
        </Button>
      )}
    </div>
  );
}
