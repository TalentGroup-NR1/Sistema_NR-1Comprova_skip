import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export interface EspelhoMensal {
  id: string;
  company_id: string;
  colaborador_id: string;
  ano: number;
  mes: number;
  periodo_inicio: string;
  periodo_fim: string;
  status: "fechado" | "reaberto" | "assinado";
  horas_trabalhadas_minutos: number;
  horas_extras_minutos: number;
  horas_noturnas_minutos: number;
  horas_abonadas_minutos: number;
  saldo_minutos: number;
  dias_falta: number;
  dias_abonados: number;
  versao: number;
  fechado_por: string | null;
  fechado_em: string | null;
  reaberto_por: string | null;
  reaberto_em: string | null;
  motivo_reabertura: string | null;
  assinatura_hash: string | null;
  assinatura_por: string | null;
  assinatura_em: string | null;
  pdf_url: string | null;
  colaboradores?: { full_name: string; matricula: string | null; department: string | null } | null;
}

/** Admin: lista espelhos do mês informado para a empresa. */
export function useEspelhosMensaisAdmin(ano: number, mes: number) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["espelhos-mensais-admin", companyId, ano, mes],
    queryFn: async (): Promise<EspelhoMensal[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("espelhos_ponto_mensais")
        .select("*, colaboradores!inner(full_name, matricula, department)")
        .eq("company_id", companyId)
        .eq("ano", ano)
        .eq("mes", mes)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EspelhoMensal[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}

/** Colaborador: lista os próprios meses. */
export function useMeusEspelhosMensais() {
  return useQuery({
    queryKey: ["meus-espelhos-mensais"],
    queryFn: async (): Promise<EspelhoMensal[]> => {
      const { data, error } = await supabase.rpc("get_meus_espelhos_mensais");
      if (error) throw error;
      return (data || []) as unknown as EspelhoMensal[];
    },
    staleTime: 30_000,
  });
}

export function useFecharEspelhoMensal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { company_id: string; ano: number; mes: number; colaboradores_ids?: string[] | null }) => {
      const { data, error } = await supabase.rpc("fechar_espelho_mensal", {
        p_company_id: params.company_id,
        p_ano: params.ano,
        p_mes: params.mes,
        p_colaboradores_ids: params.colaboradores_ids ?? null,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      const sucesso = data?.sucesso ?? 0;
      const total = data?.total ?? 0;
      const erros = Array.isArray(data?.erros) ? data.erros : [];
      if (sucesso === 0 && total > 0) {
        const first = erros[0]?.erro ?? "verifique os dados do mês";
        toast.error(`Falha ao fechar (${sucesso}/${total}): ${first}`);
      } else if (erros.length > 0) {
        toast.warning(`Fechado parcialmente: ${sucesso}/${total}. Erro: ${erros[0]?.erro}`);
      } else {
        toast.success(`Mês fechado: ${sucesso}/${total} colaboradores`);
      }
      qc.invalidateQueries({ queryKey: ["espelhos-mensais-admin"] });
      qc.invalidateQueries({ queryKey: ["meus-espelhos-mensais"] });
    },
    onError: (e: any) => toast.error("Erro ao fechar mês: " + e.message),
  });
}

export function useReabrirEspelhoMensal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { espelho_id: string; motivo: string }) => {
      const { data, error } = await supabase.rpc("reabrir_espelho_mensal", {
        p_espelho_id: params.espelho_id,
        p_motivo: params.motivo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Mês reaberto");
      qc.invalidateQueries({ queryKey: ["espelhos-mensais-admin"] });
      qc.invalidateQueries({ queryKey: ["meus-espelhos-mensais"] });
    },
    onError: (e: any) => toast.error("Erro ao reabrir: " + e.message),
  });
}

export function useAssinarEspelhoMensal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { espelho_id: string }) => {
      const { data, error } = await supabase.rpc("assinar_espelho_mensal", {
        p_espelho_id: params.espelho_id,
      });
      if (error) throw error;

      // Regera o PDF Folha de Ponto com o bloco de assinatura digital e sobe
      // sobrescrevendo o pdf_url atual do espelho. Falhas aqui não bloqueiam
      // a assinatura (o hash oficial já ficou gravado no banco).
      let pdf_url: string | null = null;
      try {
        const { data: row, error: e1 } = await supabase
          .from("espelhos_ponto_mensais")
          .select("company_id, colaborador_id, ano, mes, assinatura_em, assinatura_hash, colaboradores!inner(full_name)")
          .eq("id", params.espelho_id)
          .maybeSingle();
        if (e1) throw e1;
        if (row && (row as any).assinatura_hash && (row as any).assinatura_em) {
          const { gerarFolhaMensalParaColaborador, buildAssinaturaEmpresa } = await import("@/lib/folhaMensalGen");
          const assinaturaEmpresa = await buildAssinaturaEmpresa(params.espelho_id);
          const blob = (await gerarFolhaMensalParaColaborador({
            companyId: (row as any).company_id,
            colaboradorId: (row as any).colaborador_id,
            ano: (row as any).ano,
            mes: (row as any).mes,
            output: "blob",
            assinatura: {
              nome: (row as any).colaboradores?.full_name ?? "Colaborador",
              assinado_em: (row as any).assinatura_em,
              hash: (row as any).assinatura_hash,
            },
            assinaturaEmpresa,
          })) as Blob;
          pdf_url = await uploadEspelhoMensalPdf(params.espelho_id, blob);
        }
      } catch (e: any) {
        toast.warning("Assinatura registrada, mas o PDF assinado não foi atualizado: " + (e?.message ?? e));
      }
      return { ...(data as any), pdf_url };
    },
    onSuccess: () => {
      toast.success("Mês assinado com sucesso");
      qc.invalidateQueries({ queryKey: ["meus-espelhos-mensais"] });
      qc.invalidateQueries({ queryKey: ["espelhos-mensais-admin"] });
    },
    onError: (e: any) => toast.error("Erro ao assinar: " + e.message),
  });
}

export async function getEspelhoMensalPdfUrl(espelho_id: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("espelho-mensal-pdf", {
    body: { espelho_id },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).url as string;
}

/** Faz upload do PDF (gerado no client) para o storage como PDF oficial do espelho. */
export async function uploadEspelhoMensalPdf(espelho_id: string, pdfBlob: Blob): Promise<string> {
  const buf = await pdfBlob.arrayBuffer();
  // base64 encode
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  const pdf_base64 = btoa(binary);
  const { data, error } = await supabase.functions.invoke("espelho-mensal-pdf", {
    body: { espelho_id, pdf_base64 },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).url as string;
}
