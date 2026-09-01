import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ClipboardList, FileText, ListChecks, ArrowRight } from "lucide-react";
import { useMyPendingAvaliacoes } from "@/hooks/useMyPendingAvaliacoes";
import { useMyPendingDiarios } from "@/hooks/useMyPendingDiarios";
import { useTarefas } from "@/hooks/useTarefas";

/**
 * Card visual de pendências do colaborador.
 * Apenas leitura — agrega contagens dos hooks existentes, sem mutação.
 */
export function MinhasPendenciasCard() {
  const { data: avaliacoes = [], isLoading: loadingAv } = useMyPendingAvaliacoes();
  const { data: diarios = [], isLoading: loadingDia } = useMyPendingDiarios();
  const { data: tarefas = [], isLoading: loadingTar } = useTarefas();

  const loading = loadingAv || loadingDia || loadingTar;

  const tarefasPendentes = tarefas.filter((t) => t.status === "pendente").length;
  const total = avaliacoes.length + diarios.length + tarefasPendentes;

  return (
    <Card className="h-full border-border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-6 h-full flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-foreground leading-tight">
                {loading
                  ? "Verificando suas pendências…"
                  : total === 0
                  ? "Tudo em dia por aqui!"
                  : total === 1
                  ? "Você tem 1 coisinha para resolver"
                  : `Você tem ${total} coisinhas para resolver`}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total === 0
                  ? "Nada por aqui agora. Quando surgir algo, avisamos!"
                  : "Dê uma olhada quando puder."}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-5 space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : total === 0 ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Nenhuma pendência no momento 🎉
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {avaliacoes.length > 0 && (
              <li>
                <Link
                  to="/avaliacoes"
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background-alt/40 px-4 py-3 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    {avaliacoes.length === 1
                      ? "1 avaliação esperando você"
                      : `${avaliacoes.length} avaliações esperando você`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            )}
            {diarios.length > 0 && (
              <li>
                <Link
                  to="/diario-bordo"
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background-alt/40 px-4 py-3 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    {diarios.length === 1
                      ? "1 diário de bordo a preencher"
                      : `${diarios.length} diários de bordo a preencher`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            )}
            {tarefasPendentes > 0 && (
              <li>
                <Link
                  to="/minhas-tarefas"
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background-alt/40 px-4 py-3 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <ListChecks className="h-4 w-4 text-primary" />
                    {tarefasPendentes === 1
                      ? "1 tarefa pessoal pendente"
                      : `${tarefasPendentes} tarefas pessoais pendentes`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
