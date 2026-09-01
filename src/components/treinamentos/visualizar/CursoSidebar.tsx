import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TreinamentoModulo } from "@/hooks/useTreinamentoCurriculo";
import { CheckCircle2, Circle, PlayCircle, FileText, Link2, FileType2, Video } from "lucide-react";

const tipoIcon: Record<string, any> = {
  video: Video,
  pdf: FileText,
  ppt: FileType2,
  link: Link2,
  texto: FileText,
};

interface Props {
  modulos: TreinamentoModulo[];
  aulaAtualId: string | null;
  concluidas: Set<string>;
  onSelecionar: (aulaId: string) => void;
  percentual: number;
  totalAulas: number;
}

export function CursoSidebar({ modulos, aulaAtualId, concluidas, onSelecionar, percentual, totalAulas }: Props) {
  return (
    <aside className="rounded-2xl border bg-card">
      <div className="border-b p-4 space-y-2">
        <p className="text-sm font-semibold">Conteúdo do curso</p>
        <Progress value={percentual} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {concluidas.size} de {totalAulas} aulas concluídas ({percentual}%)
        </p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-2">
        {modulos.map((modulo, mIdx) => (
          <div key={modulo.id} className="mb-3">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {mIdx + 1}. {modulo.titulo}
            </p>
            <div className="space-y-1">
              {modulo.aulas.map((aula) => {
                const Icon = tipoIcon[aula.tipo] || FileText;
                const ativo = aula.id === aulaAtualId;
                const feita = concluidas.has(aula.id);
                return (
                  <button
                    key={aula.id}
                    onClick={() => onSelecionar(aula.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                      ativo ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    {feita ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : ativo ? (
                      <PlayCircle className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 truncate">{aula.titulo}</span>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {aula.duracao_estimada_minutos ? (
                      <span className="text-xs text-muted-foreground">{aula.duracao_estimada_minutos}m</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
