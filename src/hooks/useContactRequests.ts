import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type ContactRequestStatus = 'nova' | 'em_contato' | 'convertida' | 'descartada';

export interface ContactRequest {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: ContactRequestStatus;
  created_at: string;
}

export const CONTACT_REQUEST_STATUS_LABEL: Record<ContactRequestStatus, string> = {
  nova: 'Nova',
  em_contato: 'Em contato',
  convertida: 'Convertida',
  descartada: 'Descartada',
};

export function useContactRequests() {
  const { isSuperAdmin } = useAuth();
  return useQuery({
    queryKey: ['contact-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContactRequest[];
    },
    enabled: !!isSuperAdmin,
  });
}

export function useUpdateContactRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContactRequestStatus }) => {
      const { error } = await supabase
        .from('contact_requests')
        .update({ status } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-requests'] });
      toast.success('Situação atualizada');
    },
    onError: () => toast.error('Não foi possível atualizar a situação'),
  });
}
