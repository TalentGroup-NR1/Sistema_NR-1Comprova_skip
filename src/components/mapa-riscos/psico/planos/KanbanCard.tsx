import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, AlertTriangle } from "lucide-react";
import { CORES_RISCO_SUAVE } from "@/lib/psicoRiscos";
import type { PlanoAcao } from "@/hooks/usePlanosAcao";
import type { ResponsavelRH } from "@/hooks/useResponsaveisRH";

interface Props {
  plano: PlanoAcao;
  onClick: () => void;
  responsaveis: ResponsavelRH[];
}

function fmtBR(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function KanbanCard({ plano, onClick, responsaveis }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: plano.id,
    data: { status: plano.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const nivelColor = CORES_RISCO_SUAVE[plano.nivel_risco] ?? CORES_RISCO_SUAVE.Laranja;
  const grupo = plano.grupo_nome ?? plano.departamento ?? "—";
  const dimensao = plano.dimensao_nome ?? (plano.escala ? `Escala ${plano.escala}` : null);

  const responsavel = responsaveis.find((r) => r.user_id === plano.responsavel_id);
  const atrasadoVisual =
    plano.prazo &&
    plano.status !== "concluido" &&
    plano.status !== "atrasado" &&
    plano.prazo < new Date().toISOString().slice(0, 10);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <Badge variant="outline" className={nivelColor}>
            {plano.nivel_risco}
          </Badge>
          {dimensao && (
            <Badge variant="outline" className="bg-slate-50">
              {dimensao}
            </Badge>
          )}
          {plano.origem === "manual" && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Manual
            </Badge>
          )}
        </div>

        <div className="text-sm font-medium leading-snug line-clamp-2">
          {plano.titulo || `${grupo} · ${dimensao ?? "Risco"}`}
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{grupo}</span>
          {plano.indice != null && <> · índice {Number(plano.indice).toFixed(1)}</>}
          {plano.indice == null && plano.media != null && <> · média {Number(plano.media).toFixed(2)}</>}
        </div>

        {(plano.prazo || responsavel) && (
          <div className="pt-1 border-t space-y-1 text-xs">
            {plano.prazo && (
              <div className={`flex items-center gap-1 ${atrasadoVisual ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                <CalendarDays className="h-3 w-3" />
                {fmtBR(plano.prazo)}
                {atrasadoVisual && <AlertTriangle className="h-3 w-3" />}
              </div>
            )}
            {responsavel && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                {responsavel.full_name}
              </div>
            )}
          </div>
        )}

        {plano.status === "concluido" && plano.concluido_em && (
          <div className="text-xs text-green-700 pt-1 border-t">
            ✓ Concluído em {fmtBR(plano.concluido_em.slice(0, 10))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
