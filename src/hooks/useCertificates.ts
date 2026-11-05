import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export interface Certificate {
  id: string;
  company_id: string;
  colaborador_id: string;
  treinamento_id: string;
  progresso_id: string;
  certificate_code: string;
  colaborador_nome: string;
  treinamento_titulo: string;
  carga_horaria: number;
  data_conclusao: string;
  issue_date: string;
  issued_by: string | null;
  issued_by_type: 'colaborador' | 'admin';
  file_path: string | null;
  status: 'ativo' | 'revogado';
  revogado_em: string | null;
  revogado_por: string | null;
  revogado_motivo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateWithRelations extends Certificate {
  colaborador?: {
    id: string;
    full_name: string;
    department: string;
  };
  treinamento?: {
    id: string;
    titulo: string;
    carga_horaria?: number;
  };
}

export interface CertificateAuditLog {
  id: string;
  certificate_id: string;
  action: string;
  performed_by: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Gera código único para o certificado
function generateCertificateCode(): string {
  const year = new Date().getFullYear();
  const uuid = crypto.randomUUID().split('-')[0].toUpperCase();
  return `CERT-${year}-${uuid}`;
}

// Hook para buscar certificados (Admin/RH)
export function useCertificates(filters?: {
  treinamentoId?: string;
  colaboradorId?: string;
  status?: 'ativo' | 'revogado';
}) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["certificates", effectiveCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from("certificates")
        .select(`
          *,
          colaborador:colaboradores(id, full_name, department),
          treinamento:treinamentos(id, titulo)
        `)
        .order("issue_date", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      if (filters?.treinamentoId) {
        query = query.eq("treinamento_id", filters.treinamentoId);
      }

      if (filters?.colaboradorId) {
        query = query.eq("colaborador_id", filters.colaboradorId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CertificateWithRelations[];
    },
    enabled: !!effectiveCompanyId,
  });
}

// Hook para buscar certificado específico de um colaborador/treinamento
export function useMyCertificate(treinamentoId: string | undefined, colaboradorId: string | undefined) {
  return useQuery({
    queryKey: ["my-certificate", treinamentoId, colaboradorId],
    queryFn: async () => {
      if (!treinamentoId || !colaboradorId) return null;

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("colaborador_id", colaboradorId)
        .eq("status", "ativo")
        .maybeSingle();

      if (error) throw error;
      return data as Certificate | null;
    },
    enabled: !!treinamentoId && !!colaboradorId,
  });
}

// Hook para emitir certificado
export function useEmitCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      treinamentoId: string;
      companyId?: string;
      colaboradorId?: string;
      progressoId?: string;
      colaboradorNome?: string;
      treinamentoTitulo?: string;
      cargaHoraria?: number;
      dataConclusao?: string;
      issuedByType?: 'colaborador' | 'admin';
    }) => {
      // Blindagem defensiva (Etapa 8.7): checagem rápida se tipo='link' ou gera_certificado=false
      if (typeof supabase.from === 'function') {
        try {
          const { data: curso } = await supabase
            .from("treinamentos")
            .select("id, tipo, gera_certificado")
            .eq("id", data.treinamentoId)
            .single();

          if (curso && (curso.tipo === "link" || curso.gera_certificado === false)) {
            throw new Error("Este treinamento não emite certificado da plataforma.");
          }
        } catch (err: any) {
          if (err?.message === "Este treinamento não emite certificado da plataforma.") {
            throw err;
          }
        }
      }

      // ETAPA 9.5: Emissão segura via RPC SECURITY DEFINER com validação fail-closed
      const { data: res, error } = await (supabase as any).rpc("emitir_certificado_seguro", {
        _treinamento_id: data.treinamentoId,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!res || (Array.isArray(res) && res.length === 0)) {
        throw new Error("Não foi possível emitir o certificado.");
      }

      const row = Array.isArray(res) ? res[0] : res;
      return {
        id: row.certificate_id,
        certificate_code: row.certificate_code,
        ja_existia: row.ja_existia,
        issue_date: new Date().toISOString(),
      } as unknown as Certificate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["my-certificate", variables.treinamentoId] });
      toast({ title: "Certificado emitido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao emitir certificado", description: error.message, variant: "destructive" });
    },
  });
}

// Hook para salvar o PDF no storage
export function useSaveCertificatePDF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificateId, pdfBlob }: { certificateId: string; pdfBlob: Blob }) => {
      if (pdfBlob.size > 5 * 1024 * 1024) {
        throw new Error("Arquivo deve ter no máximo 5MB.");
      }

      const fileName = `${certificateId}.pdf`;
      const filePath = `certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(filePath, pdfBlob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Atualizar o certificado com o file_path
      const { error: updateError } = await supabase
        .from("certificates")
        .update({ file_path: filePath })
        .eq("id", certificateId);

      if (updateError) throw updateError;

      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
    onError: (error: Error) => {
      console.error("Erro ao salvar PDF:", error);
    },
  });
}

// Hook para revogar certificado
export function useRevokeCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificateId, motivo }: { certificateId: string; motivo: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("certificates")
        .update({
          status: "revogado",
          revogado_em: new Date().toISOString(),
          revogado_por: user?.id,
          revogado_motivo: motivo,
        })
        .eq("id", certificateId);

      if (error) throw error;

      // Registrar log de auditoria
      await supabase.from("certificates_audit_logs").insert({
        certificate_id: certificateId,
        action: "revogado",
        details: { motivo },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast({ title: "Certificado revogado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao revogar certificado", description: error.message, variant: "destructive" });
    },
  });
}

// Hook para validar certificado (público)
export function useValidateCertificate(code: string | undefined) {
  return useQuery({
    queryKey: ["validate-certificate", code],
    queryFn: async () => {
      if (!code) return null;

      const { data, error } = await supabase.rpc("validate_certificate", { p_code: code });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!code,
  });
}

// Hook para obter URL assinada do certificado
export async function getCertificateSignedUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from("certificates")
    .createSignedUrl(filePath, 60 * 60); // 1 hora

  if (error) {
    console.error("Erro ao gerar URL assinada:", error);
    return null;
  }

  return data.signedUrl;
}

// Hook para buscar logs de auditoria
export function useCertificateAuditLogs(certificateId: string | undefined) {
  return useQuery({
    queryKey: ["certificate-audit-logs", certificateId],
    queryFn: async () => {
      if (!certificateId) return [];

      const { data, error } = await supabase
        .from("certificates_audit_logs")
        .select("*")
        .eq("certificate_id", certificateId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CertificateAuditLog[];
    },
    enabled: !!certificateId,
  });
}
