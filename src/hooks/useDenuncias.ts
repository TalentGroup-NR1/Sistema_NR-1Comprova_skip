import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type DenunciaStatus = "novo" | "em_analise" | "concluido";
export type FaleConoscoTipo = "denuncia" | "sugestao" | "duvida";

export interface DenunciaAdmin {
  id: string;
  titulo: string;
  mensagem: string;
  status: DenunciaStatus;
  criado_em: string;
  anonimo: boolean;
  user_id: string | null;
  autor_nome: string | null;
  tipo: FaleConoscoTipo;
  categoria_comportamento: string | null;
  origem_ofensa: string | null;
}

export function useCriarDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      mensagem: string;
      anonimo: boolean;
      tipo: FaleConoscoTipo;
      categoria?: string | null;
      origem?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("criar_denuncia", {
        p_titulo: input.titulo,
        p_mensagem: input.mensagem,
        p_anonimo: input.anonimo,
        p_tipo: input.tipo,
        p_categoria: input.categoria ?? null,
        p_origem: input.origem ?? null,
      } as any);
      if (error) {
        if (error.message?.includes("rate_limit_exceeded")) {
          throw new Error("Muitos envios em pouco tempo. Tente novamente mais tarde.");
        }
        throw error;
      }
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
    },
  });
}


export function useDenunciasAdmin(enabled = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["denuncias-admin", user?.id ?? "guest"],
    enabled: enabled && !!user?.id,
    refetchInterval: enabled ? 10000 : false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_denuncias_admin");
      if (error) throw error;
      return (data ?? []) as DenunciaAdmin[];
    },
  });
}

const LS_LAST_SEEN_KEY = "denuncias:last-seen-id";

/**
 * Hook global para admins/RH: monitora novas denúncias, dispara toast e
 * retorna a contagem de denúncias com status "novo" (para badge no menu).
 */
export function useDenunciasMonitor() {
  const { role, isAuthenticated, user } = useAuth();
  const isAdminLike =
    isAuthenticated &&
    (role === "admin_master" || role === "admin_empresa" || role === "analista_rh");

  const query = useDenunciasAdmin(isAdminLike);
  const initializedRef = useRef(false);
  const storageKey = useMemo(
    () => (user?.id ? `${LS_LAST_SEEN_KEY}:${user.id}` : LS_LAST_SEEN_KEY),
    [user?.id]
  );

  useEffect(() => {
    if (!isAdminLike) {
      initializedRef.current = false;
      return;
    }

    const data = query.data;
    if (!data) {
      return;
    }

    const lastSeen = localStorage.getItem(storageKey);
    const newest = data[0];

    if (!initializedRef.current) {
      initializedRef.current = true;

      if (!newest) {
        return;
      }

      if (!lastSeen) {
        const novoCount = data.filter((d) => d.status === "novo").length;
        toast.info(
          novoCount <= 1 ? "Nova denúncia recebida" : `${novoCount} denúncias aguardando análise`,
          {
            description: data[0]?.titulo,
            duration: 8000,
          }
        );
        localStorage.setItem(storageKey, newest.id);
      }

      return;
    }

    if (!newest) {
      return;
    }

    if (!lastSeen) {
      toast.info("Nova denúncia recebida", {
        description: newest.titulo,
        duration: 8000,
      });
      localStorage.setItem(storageKey, newest.id);
      return;
    }

    if (newest.id !== lastSeen) {
      const novas = [];
      for (const d of data) {
        if (d.id === lastSeen) break;
        novas.push(d);
      }
      if (novas.length > 0) {
        toast.info(
          novas.length === 1
            ? "Nova denúncia recebida"
            : `${novas.length} novas denúncias recebidas`,
          {
            description: novas[0].titulo,
            duration: 8000,
          }
        );
      }
      localStorage.setItem(storageKey, newest.id);
    }
  }, [query.data, isAdminLike, storageKey]);

  const denunciasNovas = (query.data ?? []).filter(
    (d) => d.status === "novo" && d.tipo === "denuncia"
  ).length;
  const faleConoscoNovos = (query.data ?? []).filter(
    (d) => d.status === "novo" && d.tipo !== "denuncia"
  ).length;
  const novoCount = (query.data ?? []).filter((d) => d.status === "novo").length;

  return { novoCount, denunciasNovas, faleConoscoNovos, enabled: isAdminLike };
}

export function useAtualizarStatusDenuncia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: DenunciaStatus }) => {
      const { error } = await supabase.rpc("atualizar_status_denuncia", {
        p_id: input.id,
        p_novo_status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["denuncias-admin"] });
    },
  });
}
