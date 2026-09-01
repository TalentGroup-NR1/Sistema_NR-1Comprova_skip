import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MatrixData {
  category: string;
  value30: number | null;
  value80: number | null;
  value120: number | null;
  delta: number | null;
}

interface EvolutionMatrixProps {
  data: MatrixData[];
}

function DeltaDisplay({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  const isPositive = delta > 0;
  const isNeutral = delta === 0;

  if (isNeutral) {
    return (
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-1 font-semibold ${
      isPositive ? 'delta-positive' : 'delta-negative'
    }`}>
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>{isPositive ? '+' : ''}{delta.toFixed(0)}%</span>
    </div>
  );
}

function ValueDisplay({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  const colorClass = value >= 8 
    ? 'text-executive-success' 
    : value >= 6 
      ? 'text-executive-warning' 
      : 'text-executive-danger';

  return <span className={`font-medium ${colorClass}`}>{value.toFixed(1)}</span>;
}

export function EvolutionMatrix({ data }: EvolutionMatrixProps) {
  if (data.length === 0) {
    return (
      <Card className="shadow-executive">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-navy-900">
            <BarChart3 className="h-4 w-4" />
            Matriz Comparativa de Evolução
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          Dados insuficientes para gerar a matriz comparativa
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-executive">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-navy-900">
          <BarChart3 className="h-4 w-4" />
          Matriz Comparativa de Evolução
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-navy-900 hover:bg-navy-900">
              <TableHead className="text-white font-semibold">Competência</TableHead>
              <TableHead className="text-white font-semibold text-center">30 Dias</TableHead>
              <TableHead className="text-white font-semibold text-center">80 Dias</TableHead>
              <TableHead className="text-white font-semibold text-center">120 Dias</TableHead>
              <TableHead className="text-white font-semibold text-center">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-muted/30">
                <TableCell className="font-medium text-graphite-800">
                  {row.category}
                </TableCell>
                <TableCell className="text-center">
                  <ValueDisplay value={row.value30} />
                </TableCell>
                <TableCell className="text-center">
                  <ValueDisplay value={row.value80} />
                </TableCell>
                <TableCell className="text-center">
                  <ValueDisplay value={row.value120} />
                </TableCell>
                <TableCell className="text-center">
                  <DeltaDisplay delta={row.delta} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
