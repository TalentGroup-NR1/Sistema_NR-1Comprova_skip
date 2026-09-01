import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, UserCheck, TrendingUp, Target } from "lucide-react";
import { MediasAvaliacao } from "@/hooks/useAvaliacaoResultados";

interface AvaliacaoKPICardsProps {
  medias: MediasAvaliacao;
}

function formatNumber(val: number | null, decimals = 2): string {
  if (val === null) return "—";
  return val.toFixed(decimals);
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-600 dark:text-green-400";
  if (score >= 3) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getProgressColor(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 4) return "bg-green-500";
  if (score >= 3) return "bg-yellow-500";
  return "bg-red-500";
}

function getAlignmentLabel(discrepancy: number | null): { label: string; color: string } {
  if (discrepancy === null) return { label: "—", color: "text-muted-foreground" };
  const abs = Math.abs(discrepancy);
  if (abs <= 0.5) return { label: "Alto", color: "text-green-600 dark:text-green-400" };
  if (abs <= 1) return { label: "Médio", color: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Baixo", color: "text-red-600 dark:text-red-400" };
}

function getAlignmentScore(discrepancy: number | null, maxScale: number = 5): number {
  if (discrepancy === null) return 0;
  const abs = Math.abs(discrepancy);
  // Convert discrepancy to a 0-100 alignment score
  const alignmentPercent = Math.max(0, 100 - (abs / maxScale) * 100);
  return alignmentPercent;
}

export function AvaliacaoKPICards({ medias }: AvaliacaoKPICardsProps) {
  const alignmentInfo = getAlignmentLabel(medias.discrepanciaGeral);
  const alignmentScore = getAlignmentScore(medias.discrepanciaGeral);

  // Calculate overall score (average of both evaluations)
  const overallScore = medias.mediaGeralColaborador !== null && medias.mediaGeralGestor !== null
    ? (medias.mediaGeralColaborador + medias.mediaGeralGestor) / 2
    : medias.mediaGeralColaborador ?? medias.mediaGeralGestor;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-3">
      {/* Média Autoavaliação */}
      <Card className="border-border print:border-gray-300">
        <CardContent className="p-4 print:p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 print:bg-blue-50">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400 print:text-blue-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Autoavaliação
            </span>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(medias.mediaGeralColaborador)} print:text-2xl`}>
            {formatNumber(medias.mediaGeralColaborador)}
          </p>
          <div className="mt-2">
            <Progress 
              value={(medias.mediaGeralColaborador ?? 0) * 20} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Média Gestor */}
      <Card className="border-border print:border-gray-300">
        <CardContent className="p-4 print:p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 print:bg-green-50">
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400 print:text-green-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Gestor
            </span>
          </div>
          <p className={`text-3xl font-bold ${getScoreColor(medias.mediaGeralGestor)} print:text-2xl`}>
            {formatNumber(medias.mediaGeralGestor)}
          </p>
          <div className="mt-2">
            <Progress 
              value={(medias.mediaGeralGestor ?? 0) * 20} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Índice de Alinhamento */}
      <Card className="border-border print:border-gray-300">
        <CardContent className="p-4 print:p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 print:bg-purple-50">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400 print:text-purple-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Alinhamento
            </span>
          </div>
          <p className={`text-3xl font-bold ${alignmentInfo.color} print:text-2xl`}>
            {alignmentInfo.label}
          </p>
          <div className="mt-2">
            <Progress 
              value={alignmentScore} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Score Geral */}
      <Card className="border-border bg-primary/5 print:border-gray-300 print:bg-blue-50">
        <CardContent className="p-4 print:p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/20 print:bg-blue-100">
              <Target className="h-4 w-4 text-primary print:text-blue-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Score Geral
            </span>
          </div>
          <p className={`text-3xl font-bold text-primary print:text-2xl print:text-blue-600`}>
            {formatNumber(overallScore)}
          </p>
          <div className="mt-2">
            <Progress 
              value={(overallScore ?? 0) * 20} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
