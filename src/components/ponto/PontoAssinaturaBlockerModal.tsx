import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsModuleVisible } from "@/hooks/useVisibleModules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileSignature } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const DISMISS_KEY = "ponto-assinatura-blocker-dismissed";

function fmt(iso: string) {
  try {
    return format(parseISO(iso + (iso.length === 10 ? "T12:00:00" : "")), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function PontoAssinaturaBlockerModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Guarda Comercial de Módulo (Fail-Closed)
  const pontoModuleVisible = useIsModuleVisible('/ponto-eletronico');
  const isPontoVisible = pontoModuleVisible?.isVisible ?? false;
  const isModLoading = pontoModuleVisible?.isLoading ?? false;
  const isModError = pontoModuleVisible?.isError ?? false;
  const deveExecutar = isPontoVisible && !isModLoading && !isModError;

  // Colaborador atual
  const colabQ = useQuery({
    queryKey: ["assinatura-blocker-colab", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "ATIVO")
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && deveExecutar,
    staleTime: 60_000,
  });

  const colaboradorId = colabQ.data?.id as string | undefined;

  const fechQ = useQuery({
    queryKey: ["assinatura-blocker-fechamentos", colaboradorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_meus_fechamentos_mensais", {
        p_colaborador_id: colaboradorId,
      });
      if (error) throw error;
      return (data || []) as Array<{ id: string; status: string; periodo_inicio: string; periodo_fim: string }>;
    },
    enabled: !!colaboradorId && deveExecutar,
    staleTime: 60_000,
  });

  const espQ = useQuery({
    queryKey: ["assinatura-blocker-espelhos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_meus_espelhos_mensais");
      if (error) throw error;
      return (data || []) as Array<{ id: string; status: string; ano: number; mes: number; periodo_inicio: string; periodo_fim: string }>;
    },
    enabled: !!colaboradorId && deveExecutar,
    staleTime: 60_000,
  });

  const pendentes = useMemo(() => {
    const f = (fechQ.data || []).filter((x) => x.status === "fechado");
    const e = (espQ.data || []).filter((x) => x.status === "fechado");
    return { fechamentos: f, espelhos: e, total: f.length + e.length };
  }, [fechQ.data, espQ.data]);

  useEffect(() => {
    if (!deveExecutar) return;
    if (!user?.id || pendentes.total === 0) return;
    // não abrir se já está na tela de assinatura
    if (location.pathname === "/ponto-eletronico") return;
    const dismissed = sessionStorage.getItem(DISMISS_KEY);
    if (dismissed) return;
    setOpen(true);
  }, [user?.id, pendentes.total, location.pathname, deveExecutar]);

  const handleAssinar = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
    navigate("/ponto-eletronico?tab=minha-assinatura");
  };

  const handleDepois = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  // Fail-Closed: módulo indisponível, carregando ou erro
  if (!deveExecutar) return null;
  if (!open || pendentes.total === 0) return null;

  const primeiro = pendentes.fechamentos[0] || pendentes.espelhos[0];

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Ponto fechado — assinatura pendente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                Seu ponto foi fechado pelo RH e está aguardando sua assinatura digital.
                Você tem <strong>{pendentes.total}</strong> período{pendentes.total > 1 ? "s" : ""} pendente{pendentes.total > 1 ? "s" : ""}.
              </p>
              {primeiro && (
                <p className="text-muted-foreground">
                  Ex.: período de {fmt(primeiro.periodo_inicio)} a {fmt(primeiro.periodo_fim)}.
                </p>
              )}
              <p>Clique em <strong>Assinar agora</strong> para revisar e assinar.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDepois}>Depois</AlertDialogCancel>
          <AlertDialogAction onClick={handleAssinar}>Assinar agora</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
