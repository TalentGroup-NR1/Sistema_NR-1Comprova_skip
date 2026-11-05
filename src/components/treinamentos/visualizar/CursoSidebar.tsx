import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModuloTreinamento } from "@/hooks/useProgressoAula";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Link2,
  FileType2,
  Video,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";

const tipoIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  pdf: FileText,
  ppt: FileType2,
  arquivo: FileText,
  link: Link2,
  texto: FileText,
};

interface CursoSidebarProps {
  modulos: ModuloTreinamento[];
  aulaAtualId: string | null;
  concluidas: Set<string>;
  onSelecionar: (aulaId: string) => void;
  percentual: number;
  totalAulas: number;
  className?: string;
}

export function CursoSidebar({
  modulos,
  aulaAtualId,
  concluidas,
  onSelecionar,
  percentual,
  totalAulas,
  className,
}: CursoSidebarProps) {
  // Controle de expansão de cada módulo (inicia todos abertos)
  const [modulosAbertos, setModulosAbertos] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    modulos.forEach((m) => {
      map[m.id] = true;
    });
    return map;
  });

  const toggleModulo = (moduloId: string) => {
    setModulosAbertos((prev) => ({
      ...prev,
      [moduloId]: !prev[moduloId],
    }));
  };

  const totalConcluidas = concluidas.size;

  return (
    <aside className={cn("rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col", className)}>
      {/* Header do Currículo */}
      <div className="border-b p-4 space-y-2.5 bg-muted/20">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Conteúdo do curso
          </p>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {percentual}%
          </span>
        </div>
        <Progress value={percentual} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {totalConcluidas} de {totalAulas} aulas concluídas
        </p>
      </div>

      {/* Lista de Módulos e Aulas */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-280px)]">
        {modulos.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center">Nenhum módulo cadastrado.</p>
        ) : (
          modulos.map((modulo, mIdx) => {
            const isAberto = modulosAbertos[modulo.id] !== false;
            const aulasModulo = modulo.aulas || [];
            const concluidasModulo = aulasModulo.filter((a) => concluidas.has(a.id)).length;

            return (
              <div key={modulo.id} className="rounded-xl border border-border/60 bg-background/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleModulo(modulo.id)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                      Módulo {mIdx + 1}
                    </p>
                    <p className="text-xs font-medium text-foreground truncate">{modulo.titulo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {concluidasModulo}/{aulasModulo.length}
                    </span>
                    {isAberto ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isAberto && (
                  <div className="space-y-1 p-1.5 border-t border-border/40 bg-card">
                    {aulasModulo.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground px-2 py-1">Sem aulas neste módulo.</p>
                    ) : (
                      aulasModulo.map((aula, aIdx) => {
                        const Icon = tipoIcon[aula.tipo] || FileText;
                        const ativo = aula.id === aulaAtualId;
                        const feita = concluidas.has(aula.id);

                        return (
                          <button
                            key={aula.id}
                            type="button"
                            onClick={() => onSelecionar(aula.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                              ativo
                                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {feita ? (
                              <CheckCircle2
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  ativo ? "text-primary-foreground" : "text-green-600"
                                )}
                              />
                            ) : ativo ? (
                              <PlayCircle className="h-4 w-4 shrink-0 text-primary-foreground" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            )}

                            <span className="flex-1 truncate">
                              {mIdx + 1}.{aIdx + 1} {aula.titulo}
                            </span>

                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                ativo ? "text-primary-foreground/90" : "text-muted-foreground"
                              )}
                            />

                            {aula.duracao_minutos ? (
                              <span
                                className={cn(
                                  "text-[10px] shrink-0",
                                  ativo ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                {aula.duracao_minutos}m
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
