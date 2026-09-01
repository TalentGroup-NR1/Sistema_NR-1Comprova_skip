import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import type { Database } from "@/integrations/supabase/types";

type Comunicado = Database['public']['Tables']['comunicados']['Row'];
type ComunicadoInsert = Database['public']['Tables']['comunicados']['Insert'];
type ComunicadoUpdate = Database['public']['Tables']['comunicados']['Update'];
type ComunicadoAnexo = Database['public']['Tables']['comunicados_anexos']['Row'];

export interface ComunicadoWithAnexos extends Comunicado {
  comunicados_anexos?: ComunicadoAnexo[];
}

export function useComunicados() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['comunicados', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          *,
          comunicados_anexos (*)
        `)
        .eq('company_id', effectiveCompanyId)
        .order('data_publicacao', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as ComunicadoWithAnexos[];
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useComunicado(id: string | null) {
  return useQuery({
    queryKey: ['comunicado', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          *,
          comunicados_anexos (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ComunicadoWithAnexos;
    },
    enabled: !!id,
  });
}

export function usePublishedComunicados(colaboradorDepartment?: string, colaboradorJobTitle?: string) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['comunicados-published', effectiveCompanyId, colaboradorDepartment, colaboradorJobTitle],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      
      let query = supabase
        .from('comunicados')
        .select(`
          *,
          comunicados_anexos (*)
        `)
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'publicado')
        .lte('data_publicacao', new Date().toISOString())
        .order('data_publicacao', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by target audience on client side
      const filtered = (data as ComunicadoWithAnexos[]).filter(c => {
        if (c.publico_alvo_tipo === 'todos') return true;
        if (c.publico_alvo_tipo === 'departamento' && c.publico_alvo_valor === colaboradorDepartment) return true;
        if (c.publico_alvo_tipo === 'cargo' && c.publico_alvo_valor === colaboradorJobTitle) return true;
        return false;
      });
      
      return filtered;
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useCreateComunicado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<ComunicadoInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('comunicados')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados'] });
      toast({ title: "Comunicado criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar comunicado", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateComunicado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & ComunicadoUpdate) => {
      const { data: result, error } = await supabase
        .from('comunicados')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados'] });
      toast({ title: "Comunicado atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar comunicado", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteComunicado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comunicados')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados'] });
      toast({ title: "Comunicado excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir comunicado", description: error.message, variant: "destructive" });
    },
  });
}

// Anexos
export function useUploadAnexo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ comunicadoId, file }: { comunicadoId: string; file: File }) => {
      const fileName = `${comunicadoId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('comunicados-anexos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the file path instead of public URL (bucket is now private)
      const { data, error } = await supabase
        .from('comunicados_anexos')
        .insert({
          comunicado_id: comunicadoId,
          nome_arquivo: file.name,
          url_arquivo: fileName, // Store file path, not public URL
          tipo_arquivo: file.type,
          tamanho_bytes: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados'] });
      toast({ title: "Anexo enviado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar anexo", description: error.message, variant: "destructive" });
    },
  });
}

// Helper function to get signed URL for attachment
export async function getSignedUrl(filePath: string): Promise<string | null> {
  // Handle legacy public URLs - extract file path
  let path = filePath;
  if (filePath.includes('/comunicados-anexos/')) {
    const pathParts = filePath.split('/comunicados-anexos/');
    if (pathParts[1]) {
      path = decodeURIComponent(pathParts[1]);
    }
  }
  
  const { data, error } = await supabase.storage
    .from('comunicados-anexos')
    .createSignedUrl(path, 30 * 60); // 30 minutes expiration
  
  if (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
  
  return data.signedUrl;
}

export function useDeleteAnexo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, urlArquivo }: { id: string; urlArquivo: string }) => {
      // Extract file path - handle both legacy URLs and new file paths
      let filePath = urlArquivo;
      if (urlArquivo.includes('/comunicados-anexos/')) {
        const pathParts = urlArquivo.split('/comunicados-anexos/');
        if (pathParts[1]) {
          filePath = decodeURIComponent(pathParts[1]);
        }
      }
      
      await supabase.storage
        .from('comunicados-anexos')
        .remove([filePath]);

      const { error } = await supabase
        .from('comunicados_anexos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicados'] });
      toast({ title: "Anexo removido com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover anexo", description: error.message, variant: "destructive" });
    },
  });
}

// Statistics
export function useComunicadosStats() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['comunicados-stats', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return { total: 0, urgentes: 0, fixados: 0, visualizacoes: 0 };
      
      const { data, error } = await supabase
        .from('comunicados')
        .select('id, status, is_pinned, views_count')
        .eq('company_id', effectiveCompanyId);

      if (error) throw error;
      
      const publicados = data?.filter(c => c.status === 'publicado') || [];
      
      return {
        total: data?.length || 0,
        urgentes: 0, // This would require a category field
        fixados: data?.filter(c => c.is_pinned).length || 0,
        visualizacoes: data?.reduce((acc, c) => acc + (c.views_count || 0), 0) || 0,
      };
    },
    enabled: !!effectiveCompanyId,
  });
}
