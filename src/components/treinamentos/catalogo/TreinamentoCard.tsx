import { useNavigate } from "react-router-dom";
import { Play, Clock, Award, CheckCircle2, Lock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Treinamento } from "@/hooks/useTreinamentos";
import { TreinamentoProgresso } from "@/hooks/useTreinamentoProgresso";
import { useCapaTreinamento, getFallbackGradient } from "./capaUtils";

interface TreinamentoCardProps {
  treinamento: Treinamento;
  progresso?: TreinamentoProgresso | null;
  className?: string;
}

function calcPercentual(t: Treinamento, p?: TreinamentoProgresso | null): number {
  if (!p) return 0;
  if (p.status === "concluido") return 100;
  if (p.status === "apto_concluir") return 90;
  if (t.tempo_minimo_minutos > 0) {
    return Math.min(85, Math.round((p.tempo_total_minutos / t.tempo_minimo_minutos) * 85));
  }
  return p.status === "em_andamento" ? 40 : 0;
}

export function TreinamentoCard({ treinamento, progresso, className }: TreinamentoCardProps) {
  const navigate = useNavigate();
  const capaUrl = useCapaTreinamento(treinamento);
  const percentual = calcPercentual(treinamento, progresso);
  const concluido = progresso?.status === "concluido";
  const iniciado = !!progresso && progresso.status !== "nao_iniciado";

  return (
    <button
      type="button"
      onClick={() => navigate(`/treinamento/${treinamento.id}`)}
      className={cn(
        "group relative w-full text-left rounded-xl overflow-hidden bg-card border border-border",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {/* Capa 16:9 */}
      <div
        className="relative aspect-video w-full overflow-hidden bg-muted"
        style={!capaUrl ? { backgroundImage: getFallbackGradient(treinamento.id) } : undefined}
      >
        {capaUrl ? (
          <img
            src={capaUrl}
            alt={`Capa do treinamento ${treinamento.titulo}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4">
            <span className="line-clamp-3 text-center text-sm font-semibold text-primary-foreground/90">
              {treinamento.titulo}
            </span>
          </div>
        )}

        {/* Overlay hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg">
            <Play className="h-3.5 w-3.5" />
            {concluido ? "Revisar" : iniciado ? "Continuar" : "Iniciar"}
          </span>
        </div>

        {/* Badges topo */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {treinamento.origem === "plataforma" && (
            <Badge variant="outline" className="bg-background/90 backdrop-blur text-[10px] uppercase tracking-wide gap-1 border-primary/40 text-primary">
              <Globe className="h-3 w-3" />
              Catálogo da Plataforma
            </Badge>
          )}
          {treinamento.obrigatorio && (
            <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
              <Lock className="mr-1 h-3 w-3" />
              Obrigatório
            </Badge>
          )}
          {treinamento.tipo === "link" ? (
            concluido ? (
              <Badge className="bg-sky-700 text-[10px] uppercase tracking-wide text-white hover:bg-sky-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Estudado (autodeclarado)
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                Link externo
              </Badge>
            )
          ) : (
            concluido && (
              <Badge className="bg-green-600 text-[10px] uppercase tracking-wide text-white hover:bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Concluído
              </Badge>
            )
          )}
        </div>

        {treinamento.duracao_estimada_minutos ? (
          <Badge
            variant="secondary"
            className="absolute bottom-2 right-2 gap-1 text-[10px] backdrop-blur"
          >
            <Clock className="h-3 w-3" />
            {treinamento.duracao_estimada_minutos} min
          </Badge>
        ) : null}

        {/* Barra de progresso */}
        {percentual > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={percentual} className="h-1 rounded-none" />
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="space-y-1.5 p-3">
        {treinamento.categoria && (
          <span
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: treinamento.categoria.cor || undefined }}
          >
            {treinamento.categoria.nome}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{treinamento.titulo}</h3>
        {treinamento.descricao && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{treinamento.descricao}</p>
        )}
        <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
          {treinamento.nivel && (
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3" />
              {treinamento.nivel}
            </span>
          )}
          {treinamento.quiz_obrigatorio && <span>Quiz</span>}
          {percentual > 0 && !concluido && <span className="ml-auto font-medium">{percentual}%</span>}
        </div>
      </div>
    </button>
  );
}
