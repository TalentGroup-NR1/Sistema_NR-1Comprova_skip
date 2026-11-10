import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ClipboardList, CheckCircle2 } from "lucide-react";
import type { PlanoAcao } from "@/hooks/usePlanosAcao";

interface Props {
  planos: PlanoAcao[];
}

export function PainelMetricas({ planos }: Props) {
  const riscosCriticos = planos.filter((p) =>
    ["pendente", "planejado", "em_andamento", "atrasado"].includes(p.status)
  ).length;
  const planosCriados = planos.filter((p) => p.status !== "pendente").length;
  const concluidos = planos.filter((p) => p.status === "concluido").length;
  const denominador = planos.filter((p) =>
    ["concluido", "em_andamento", "atrasado"].includes(p.status)
  ).length;
  const taxa = denominador === 0 ? 0 : Math.round((concluidos / denominador) * 100);

  const items = [
    {
      label: "Riscos Críticos Identificados",
      value: riscosCriticos,
      icon: ShieldAlert,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Planos de Ação Criados",
      value: planosCriados,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Taxa de Resolução",
      value: `${taxa}%`,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`rounded-lg p-3 ${it.bg}`}>
              <it.icon className={`h-6 w-6 ${it.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold">{it.value}</div>
              <div className="text-xs text-muted-foreground">{it.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
