import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { deleteBeneficioMaterial, getMaterialType, validateMaterialFile } from './useBeneficioStorage';

export interface BeneficioMaterial {
  id: string;
  beneficio_id: string;
  tipo: 'pdf' | 'ppt' | 'video' | 'link';
  titulo: string;
  arquivo_url: string | null;
  link_externo: string | null;
  descricao: string | null;
  created_at: string;
}

export function useBeneficioMateriais(beneficioId: string | null) {
  return useQuery({
    queryKey: ['beneficio-materiais', beneficioId],
    queryFn: async () => {
      if (!beneficioId) return [];
      
      const { data, error } = await supabase
        .from('beneficios_materiais' as any)
        .select('*')
        .eq('beneficio_id', beneficioId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as BeneficioMaterial[];
    },
    enabled: !!beneficioId,
  });
}

export function useCreateBeneficioMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
      beneficioId: string; 
      file?: File; 
      linkExterno?: string;
      titulo: string; 
      descricao?: string;
    }) => {
      const { beneficioId, file, linkExterno, titulo, descricao } = params;

      // Link externo path
      if (linkExterno) {
        console.log('[Material Link] Inserting link material:', { beneficioId, titulo, linkExterno });
        const insertPayload = {
          beneficio_id: beneficioId,
          tipo: 'link',
          titulo,
          arquivo_url: null,
          link_externo: linkExterno,
          descricao: descricao || null,
        };
        console.log('[Material Link] Payload:', JSON.stringify(insertPayload));
        
        const { data, error } = await supabase
          .from('beneficios_materiais' as any)
          .insert(insertPayload as any)
          .select()
          .single();
        
        console.log('[Material Link] Result:', { data, error });
        if (error) throw error;
        return data;
      }

      // File upload path
      if (!file) throw new Error('Arquivo ou link externo é obrigatório.');

      const tipo = getMaterialType(file);
      if (!tipo) throw new Error('Tipo de arquivo não suportado. Use PDF, PPT ou MP4.');
      
      const validationError = validateMaterialFile(file);
      if (validationError) throw new Error(validationError);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');
      
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${beneficioId}/${Date.now()}-${sanitizedName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('beneficios-materiais')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro no upload do arquivo: ${uploadError.message}`);
      }
      
      if (!uploadData?.path) {
        throw new Error('Upload retornou sem caminho do arquivo.');
      }
      
      const { data, error } = await supabase
        .from('beneficios_materiais' as any)
        .insert({
          beneficio_id: beneficioId,
          tipo,
          titulo,
          arquivo_url: uploadData.path,
          link_externo: null,
          descricao: descricao || null,
        } as any)
        .select()
        .single();
      
      if (error) {
        await supabase.storage.from('beneficios-materiais').remove([uploadData.path]);
        throw error;
      }
      return data;
    },
    onSuccess: (_, { beneficioId }) => {
      queryClient.invalidateQueries({ queryKey: ['beneficio-materiais', beneficioId] });
      toast.success('Material adicionado com sucesso!');
    },
    onError: (error: any) => {
      const msg = error?.message || 'Erro desconhecido';
      toast.error('Erro ao adicionar material: ' + msg);
    },
  });
}

export function useDeleteBeneficioMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, arquivoUrl, beneficioId }: { id: string; arquivoUrl: string | null; beneficioId: string }) => {
      // Only delete from storage if it's a file-based material
      if (arquivoUrl) {
        await deleteBeneficioMaterial(arquivoUrl);
      }
      
      const { error } = await supabase
        .from('beneficios_materiais' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return beneficioId;
    },
    onSuccess: (beneficioId) => {
      queryClient.invalidateQueries({ queryKey: ['beneficio-materiais', beneficioId] });
      toast.success('Material removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover material: ' + error.message);
    },
  });
}
