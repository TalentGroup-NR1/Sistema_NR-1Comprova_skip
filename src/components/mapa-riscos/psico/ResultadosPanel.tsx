import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { AlertTriangle, EyeOff, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useResultadosPsico, type PsicoResultadoDimensao } from '@/hooks/usePsicoAvaliacoes';

function corRisco(indice: number) {
  if (indice >= 70) return 'hsl(var(--destructive))';
  if (indice >= 40) return 'hsl(38 92% 50%)';
  return 'hsl(142 71% 45%)';
}

function nivelRisco(indice: number) {
  if (indice >= 70) return 'Risco alto';
  if (indice >= 40) return 'Risco moderado';
  return 'Risco baixo';
}

export function ResultadosPanel({ avaliacaoId }: { avaliacaoId: string | null }) {
  const { data, isLoading } = useResultadosPsico(avaliacaoId);
  const [gheSelecionado, setGheSelecionado] = useState<string>('geral');

  const dimensoes: PsicoResultadoDimensao[] = useMemo(() => {
    if (!data) return [];
    if (gheSelecionado === 'geral') return data.dimensoes ?? [];
    return data.por_ghe?.find((g) => g.ghe_id === gheSelecionado)?.dimensoes ?? [];
  }, [data, gheSelecionado]);

  const criticas = useMemo(
    () => [...dimensoes].sort((a, b) => b.indice - a.indice).slice(0, 3),
    [dimensoes]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const taxa =
    data.total_atribuidos > 0
      ? Math.round((data.total_respondidos / data.total_atribuidos) * 100)
      : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 pt-5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {data.total_respondidos}/{data.total_atribuidos}
              </p>
              <p className="text-xs text-muted-foreground">Respostas ({taxa}%)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 pt-5">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{dimensoes.length}</p>
              <p className="text-xs text-muted-foreground">Dimensões avaliadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 pt-5">
            <EyeOff className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{data.ghes_omitidos}</p>
              <p className="text-xs text-muted-foreground">GHEs ocultos (anonimato)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Visualizar:</span>
        <Select value={gheSelecionado} onValueChange={setGheSelecionado}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geral">Resultado geral</SelectItem>
            {(data.por_ghe ?? []).map((g) => (
              <SelectItem key={g.ghe_id} value={g.ghe_id}>
                {g.ghe_nome} ({g.respondentes} respondentes)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dimensoes.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <EyeOff className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sem resultados disponíveis</p>
            <p className="text-sm text-muted-foreground">
              É necessário no mínimo 3 respondentes por grupo para preservar o anonimato.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Índice de risco por dimensão</CardTitle>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dimensoes}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="dimensao"
                    width={170}
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} pts`, 'Índice de risco']}
                    contentStyle={{ borderRadius: 12 }}
                  />
                  <Bar dataKey="indice" radius={[0, 6, 6, 0]}>
                    {dimensoes.map((d) => (
                      <Cell key={d.dimensao} fill={corRisco(d.indice)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Perfil psicossocial</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={dimensoes} outerRadius="72%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimensao" fontSize={10} />
                    <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                    <Radar
                      name="Índice"
                      dataKey="indice"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.35}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Dimensões mais críticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticas.map((d) => (
                  <div
                    key={d.dimensao}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.dimensao}</p>
                      <p className="text-xs text-muted-foreground">
                        Média {d.media.toFixed(2)} · {nivelRisco(d.indice)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      style={{ color: corRisco(d.indice) }}
                      className="shrink-0"
                    >
                      {d.indice} pts
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
