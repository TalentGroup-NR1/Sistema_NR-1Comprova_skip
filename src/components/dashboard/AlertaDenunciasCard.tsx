import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Inbox, ArrowRight, ShieldAlert } from "lucide-react";
import {
  useContarDenunciasNaoAssumidas,
  useListarDenunciasParaAlerta,
  useIsResponsavelDenuncia,
} from "@/hooks/useDenuncias";

export function AlertaDenunciasCard() {
  const navigate = useNavigate();
  const { data: isResponsavel, isLoading: loadingResponsavel } = useIsResponsavelDenuncia();
  const { data: contadores, isLoading: loadingContagem } = useContarDenunciasNaoAssumidas();
  const { data: denunciasAlerta } = useListarDenunciasParaAlerta();

  // Se não for designado ou estiver carregando, não renderiza nada
  if (loadingResponsavel || !isResponsavel || loadingContagem || !contadores) {
    return null;
  }

  const { total_vencidas, total_nao_assumidas } = contadores;

  // Estado Verde / Informativo: nenhuma denúncia pendente ou vencida
  if (total_vencidas === 0 && total_nao_assumidas === 0) {
    return null;
  }

  // 1. ESTADO CRÍTICO (Prioridade máxima: denúncia com prazo vencido)
  if (total_vencidas > 0) {
    return (
      <Alert
        variant="destructive"
        className="relative overflow-hidden border-2 border-destructive/50 bg-destructive/10 text-destructive shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-destructive/20 text-destructive shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <AlertTitle className="text-sm font-bold tracking-tight text-destructive flex items-center gap-2">
                <span>
                  {total_vencidas} {total_vencidas === 1 ? "denúncia com prazo VENCIDO" : "denúncias com prazo VENCIDO"}
                </span>
              </AlertTitle>
              <AlertDescription className="text-xs text-destructive/90 leading-relaxed max-w-2xl">
                Aguardando responsável. O prazo legal da Lei nº 14.457/2022 expirou — acesse o comitê e assuma a apuração imediatamente para evitar sanções e irregularidades.
              </AlertDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => navigate("/comportamentos-ofensivos")}
            className="shrink-0 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <ShieldAlert className="h-4 w-4" />
            Tratar denúncias
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Alert>
    );
  }

  // 2. ESTADO URGENTE (Denúncias no pool aguardando responsável, dentro do prazo)
  const primeiraDenuncia = denunciasAlerta?.[0];
  const diasRestantes = primeiraDenuncia?.dias_para_vencer ?? 30;

  return (
    <Alert className="relative overflow-hidden border-2 border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <AlertTitle className="text-sm font-bold tracking-tight text-amber-900 dark:text-amber-300">
              {total_nao_assumidas} {total_nao_assumidas === 1 ? "denúncia aguardando responsável" : "denúncias aguardando responsável"}
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed max-w-2xl">
              Há relato no pool compartilhado da empresa sem titular atribuído. Prazo legal restante para 1ª resposta:{" "}
              <strong>{diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}</strong>.
            </AlertDescription>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/comportamentos-ofensivos")}
          className="shrink-0 gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
        >
          <Inbox className="h-4 w-4" />
          Assumir apuração
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Alert>
  );
}

