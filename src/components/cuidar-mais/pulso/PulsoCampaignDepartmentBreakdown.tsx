import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Building2 } from "lucide-react";

interface PulsoCampaignDepartmentBreakdownProps {
  distribution: Record<string, number> | null;
}

export function PulsoCampaignDepartmentBreakdown({ distribution }: PulsoCampaignDepartmentBreakdownProps) {
  if (distribution === null) {
    return (
      <Card className="bg-slate-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Respostas por Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-center px-4">
            <div className="bg-slate-200/50 p-4 rounded-full mb-4">
              <Lock className="h-8 w-8 text-slate-500" />
            </div>
            <h4 className="font-medium text-slate-700 mb-2">Dados Protegidos pelo Anonimato</h4>
            <p className="text-sm text-slate-500 max-w-md">
              Menos de 5 respostas coletadas. Para proteger o anonimato dos colaboradores, 
              os dados segmentados serão exibidos apenas quando houver 5 ou mais respondentes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return null; // ou estado vazio
  }

  const maxVal = Math.max(...entries.map((e) => e[1]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Respostas por Departamento
        </CardTitle>
        <CardDescription>
          Volume de respostas distribuídas por setor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map(([dept, count]) => {
            const percent = maxVal > 0 ? (count / maxVal) * 100 : 0;
            return (
              <div key={dept}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{dept}</span>
                  <span className="text-muted-foreground">{count} resposta{count !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
