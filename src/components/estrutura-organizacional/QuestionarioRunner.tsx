import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  atividadeVazia,
  COMPLEXIDADES_Q,
  FREQUENCIAS_Q,
  type QAtividade,
  type QPergunta,
  type QSecao,
} from '@/lib/questionarioCargo';

interface Props {
  secoes: QSecao[];
  respostas: Record<string, unknown>;
  onChange: (respostas: Record<string, unknown>) => void;
  readOnly?: boolean;
}

function Atividades({
  valor,
  onChange,
  readOnly,
}: {
  valor: QAtividade[];
  onChange: (v: QAtividade[]) => void;
  readOnly?: boolean;
}) {
  const set = (i: number, patch: Partial<QAtividade>) =>
    onChange(valor.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  return (
    <div className="space-y-3">
      {valor.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma atividade informada.</p>
      )}
      {valor.map((a, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Atividade {i + 1}</span>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onChange(valor.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <div>
            <Label className="text-xs">O que faz?</Label>
            <Textarea
              rows={2}
              disabled={readOnly}
              value={a.o_que_faz}
              onChange={(e) => set(i, { o_que_faz: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Como faz?</Label>
            <Textarea
              rows={2}
              disabled={readOnly}
              value={a.como_faz}
              onChange={(e) => set(i, { como_faz: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Para que é feito?</Label>
            <Textarea
              rows={2}
              disabled={readOnly}
              value={a.para_que}
              onChange={(e) => set(i, { para_que: e.target.value })}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Complexidade</Label>
              <Select
                disabled={readOnly}
                value={a.complexidade}
                onValueChange={(v) => set(i, { complexidade: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {COMPLEXIDADES_Q.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Frequência</Label>
              <Select
                disabled={readOnly}
                value={a.frequencia}
                onValueChange={(v) => set(i, { frequencia: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {FREQUENCIAS_Q.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={() => onChange([...valor, atividadeVazia()])}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar atividade
        </Button>
      )}
    </div>
  );
}

function Campo({
  pergunta,
  valor,
  onChange,
  readOnly,
}: {
  pergunta: QPergunta;
  valor: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
}) {
  switch (pergunta.tipo) {
    case 'texto_curto':
      return (
        <Input
          disabled={readOnly}
          value={(valor as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'sim_nao':
      return (
        <Select
          disabled={readOnly}
          value={(valor as string) ?? ''}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-background">
            <SelectItem value="Sim">Sim</SelectItem>
            <SelectItem value="Não">Não</SelectItem>
          </SelectContent>
        </Select>
      );
    case 'escolha_unica':
      return (
        <Select
          disabled={readOnly}
          value={(valor as string) ?? ''}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-background">
            {pergunta.opcoes.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'multipla_escolha': {
      const arr = Array.isArray(valor) ? (valor as string[]) : [];
      return (
        <div className="space-y-2">
          {pergunta.opcoes.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox
                disabled={readOnly}
                checked={arr.includes(o)}
                onCheckedChange={(c) =>
                  onChange(c ? [...arr, o] : arr.filter((x) => x !== o))
                }
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case 'atividades':
      return (
        <Atividades
          readOnly={readOnly}
          valor={Array.isArray(valor) ? (valor as QAtividade[]) : []}
          onChange={onChange}
        />
      );
    default:
      return (
        <Textarea
          rows={4}
          disabled={readOnly}
          value={(valor as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function QuestionarioRunner({ secoes, respostas, onChange, readOnly }: Props) {
  const set = (id: string, v: unknown) => onChange({ ...respostas, [id]: v });

  return (
    <div className="space-y-4">
      {secoes.map((s, i) => (
        <Card key={s.id} className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {i + 1} · {s.titulo}
            </CardTitle>
            {s.descricao && <p className="text-sm text-muted-foreground">{s.descricao}</p>}
          </CardHeader>
          <CardContent className="space-y-5">
            {s.perguntas.map((p) => (
              <div key={p.id} className="space-y-2">
                <Label>
                  {p.titulo}
                  {p.obrigatorio && <span className="ml-1 text-destructive">*</span>}
                </Label>
                {p.texto_ajuda && (
                  <p className="text-xs text-muted-foreground">{p.texto_ajuda}</p>
                )}
                <Campo
                  pergunta={p}
                  valor={respostas[p.id]}
                  readOnly={readOnly}
                  onChange={(v) => set(p.id, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
